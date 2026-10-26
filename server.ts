import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

interface MoveEntry {
  seq: number;
  color: 'w' | 'b';
  from: { r: number; c: number };
  to: { r: number; c: number };
  promotion: string;
  ts: number;
}

export interface PlayerLoadout {
  pieceType: string;
  pieceTypeName?: string;
  pieceSkinId?: string;
  pieceSkinName?: string;
  pieceSkin?: Record<string, unknown>;
}

interface RoomState {
  code: string;
  status: 'waiting' | 'playing';
  whiteToken: string | null;
  blackToken: string | null;
  whiteJoined: boolean;
  blackJoined: boolean;
  whiteLoadout: PlayerLoadout | null;
  blackLoadout: PlayerLoadout | null;
  turn: 'w' | 'b';
  moves: MoveEntry[];
  resetCount: number;
  updatedAt: number;
  wsClients: Set<WebSocket>;
  sseClients: Set<express.Response>;
}

interface QueueEntry {
  playerToken: string;
  preferredColor: 'w' | 'b' | 'any';
  rating: number;
  loadout: PlayerLoadout | null;
  ws: WebSocket | null;
  joinedAt: number;
  lastSeenAt: number;
}

const MATCHMAKING_TIMEOUT_MS = 30_000;

const rooms = new Map<string, RoomState>();
const matchmakingQueue: QueueEntry[] = [];
const matchedByToken = new Map<
  string,
  { code: string; color: 'w' | 'b'; opponentRating: number; ts: number }
>();

function sanitizeLoadout(raw: unknown): PlayerLoadout | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const pieceType = typeof obj.pieceType === 'string' && obj.pieceType ? obj.pieceType : 'gothic_warriors';
  return {
    pieceType,
    pieceTypeName: typeof obj.pieceTypeName === 'string' ? obj.pieceTypeName : undefined,
    pieceSkinId: typeof obj.pieceSkinId === 'string' ? obj.pieceSkinId : undefined,
    pieceSkinName: typeof obj.pieceSkinName === 'string' ? obj.pieceSkinName : undefined,
    pieceSkin: obj.pieceSkin && typeof obj.pieceSkin === 'object' ? (obj.pieceSkin as Record<string, unknown>) : undefined
  };
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return 'WIZ' + Math.floor(Math.random() * 9);
}

function serializeRoom(room: RoomState) {
  return {
    code: room.code,
    status: room.status,
    whiteJoined: room.whiteJoined,
    blackJoined: room.blackJoined,
    whiteLoadout: room.whiteLoadout,
    blackLoadout: room.blackLoadout,
    turn: room.turn,
    moves: room.moves,
    resetCount: room.resetCount,
    updatedAt: room.updatedAt
  };
}

function broadcastRoomState(room: RoomState) {
  const payload = JSON.stringify({
    type: 'room:state',
    room: serializeRoom(room)
  });

  for (const client of room.wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch {
        // ignore broken socket
      }
    }
  }

  const ssePayload = `data: ${JSON.stringify({ room: serializeRoom(room) })}\n\n`;
  for (const res of room.sseClients) {
    try {
      res.write(ssePayload);
    } catch {
      room.sseClients.delete(res);
    }
  }
}

function pruneQueue() {
  const now = Date.now();
  for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
    const entry = matchmakingQueue[i];
    const wsClosed = entry.ws && entry.ws.readyState !== WebSocket.OPEN;
    const expired = now - entry.joinedAt > MATCHMAKING_TIMEOUT_MS;
    if (wsClosed || expired) {
      if (expired && entry.ws && entry.ws.readyState === WebSocket.OPEN) {
        try {
          entry.ws.send(JSON.stringify({ type: 'queue:timeout', timeoutSec: 30 }));
        } catch {
          // ignore
        }
      }
      matchmakingQueue.splice(i, 1);
    }
  }
}

function findSuitableOpponentIndex(
  playerToken: string,
  preferredColor: 'w' | 'b' | 'any',
  rating: number,
  myJoinedAt: number
): number {
  const now = Date.now();
  const myWaitSec = Math.max(0, (now - myJoinedAt) / 1000);
  let bestIdx = -1;
  let bestScore = Infinity;

  for (let i = 0; i < matchmakingQueue.length; i++) {
    const candidate = matchmakingQueue[i];
    if (candidate.playerToken === playerToken) continue;

    const candidateWaitSec = Math.max(0, (now - candidate.joinedAt) / 1000);
    const maxWaitSec = Math.max(myWaitSec, candidateWaitSec);

    // Rating window starts at ±150 and expands by +45 per second waited
    const allowedRatingDelta = 150 + maxWaitSec * 45;
    const ratingDelta = Math.abs((candidate.rating || 1000) - rating);

    if (ratingDelta > allowedRatingDelta && maxWaitSec < 8) {
      continue;
    }

    // Prefer compatible color preferences ('w' vs 'b' or 'any')
    const colorConflict =
      preferredColor !== 'any' &&
      candidate.preferredColor !== 'any' &&
      preferredColor === candidate.preferredColor;

    // If both want the exact same color, wait 4 seconds for an ideal opposite-color match before pairing anyway
    if (colorConflict && maxWaitSec < 4) {
      continue;
    }

    const score = ratingDelta + (colorConflict ? 120 : 0) - candidateWaitSec * 10;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function tryMatchPlayers(
  playerToken: string,
  preferredColor: 'w' | 'b' | 'any' = 'any',
  rating = 1000,
  loadout: PlayerLoadout | null = null,
  ws: WebSocket | null = null
):
  | {
      status: 'matched';
      code: string;
      color: 'w' | 'b';
      opponentRating: number;
      room: ReturnType<typeof serializeRoom>;
    }
  | {
      status: 'searching';
      queueSize: number;
      waitMs: number;
    } {
  pruneQueue();
  const safeRating = Number.isFinite(rating) && rating > 0 ? Math.round(rating) : 1000;

  // Check if this player was recently paired by another user's request
  const existingMatch = matchedByToken.get(playerToken);
  if (existingMatch && Date.now() - existingMatch.ts < MATCHMAKING_TIMEOUT_MS) {
    const room = rooms.get(existingMatch.code);
    if (room) {
      matchedByToken.delete(playerToken);
      if (loadout) {
        if (existingMatch.color === 'w') room.whiteLoadout = loadout;
        else room.blackLoadout = loadout;
        broadcastRoomState(room);
      }
      if (ws) room.wsClients.add(ws);
      return {
        status: 'matched',
        code: room.code,
        color: existingMatch.color,
        opponentRating: existingMatch.opponentRating,
        room: serializeRoom(room)
      };
    }
  }

  const selfEntry = matchmakingQueue.find((q) => q.playerToken === playerToken);
  const myJoinedAt = selfEntry ? selfEntry.joinedAt : Date.now();
  const effectiveLoadout = loadout || selfEntry?.loadout || null;

  // Look for the most suitable waiting player in the queue
  const opponentIdx = findSuitableOpponentIndex(playerToken, preferredColor, safeRating, myJoinedAt);
  if (opponentIdx !== -1) {
    const opponent = matchmakingQueue.splice(opponentIdx, 1)[0];
    const selfIdx = matchmakingQueue.findIndex((q) => q.playerToken === playerToken);
    if (selfIdx !== -1) matchmakingQueue.splice(selfIdx, 1);

    let oppColor: 'w' | 'b' = 'w';
    let myColor: 'w' | 'b' = 'b';
    if (opponent.preferredColor === 'b' && preferredColor !== 'b') {
      oppColor = 'b';
      myColor = 'w';
    } else if (preferredColor === 'w' && opponent.preferredColor !== 'w') {
      myColor = 'w';
      oppColor = 'b';
    }

    const code = generateRoomCode();
    const room: RoomState = {
      code,
      status: 'playing',
      whiteToken: myColor === 'w' ? playerToken : opponent.playerToken,
      blackToken: myColor === 'b' ? playerToken : opponent.playerToken,
      whiteJoined: true,
      blackJoined: true,
      whiteLoadout: myColor === 'w' ? effectiveLoadout : opponent.loadout,
      blackLoadout: myColor === 'b' ? effectiveLoadout : opponent.loadout,
      turn: 'w',
      moves: [],
      resetCount: 0,
      updatedAt: Date.now(),
      wsClients: new Set(),
      sseClients: new Set()
    };

    if (ws) room.wsClients.add(ws);
    if (opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
      room.wsClients.add(opponent.ws);
      try {
        opponent.ws.send(
          JSON.stringify({
            type: 'queue:matched',
            code,
            color: oppColor,
            opponentRating: safeRating,
            room: serializeRoom(room)
          })
        );
      } catch {
        // fallback via matchedByToken
      }
    }

    rooms.set(code, room);
    matchedByToken.set(opponent.playerToken, {
      code,
      color: oppColor,
      opponentRating: safeRating,
      ts: Date.now()
    });

    return {
      status: 'matched',
      code,
      color: myColor,
      opponentRating: opponent.rating || 1000,
      room: serializeRoom(room)
    };
  }

  // Otherwise add/update this player in the queue (preserve original joinedAt for accurate 30s timeout)
  const existingIdx = matchmakingQueue.findIndex((q) => q.playerToken === playerToken);
  const now = Date.now();
  if (existingIdx !== -1) {
    matchmakingQueue[existingIdx].preferredColor = preferredColor;
    matchmakingQueue[existingIdx].rating = safeRating;
    if (effectiveLoadout) matchmakingQueue[existingIdx].loadout = effectiveLoadout;
    matchmakingQueue[existingIdx].lastSeenAt = now;
    if (ws) matchmakingQueue[existingIdx].ws = ws;
  } else {
    matchmakingQueue.push({
      playerToken,
      preferredColor,
      rating: safeRating,
      loadout: effectiveLoadout,
      ws,
      joinedAt: now,
      lastSeenAt: now
    });
  }

  const activeEntry = matchmakingQueue.find((q) => q.playerToken === playerToken);
  return {
    status: 'searching',
    queueSize: matchmakingQueue.length,
    waitMs: activeEntry ? now - activeEntry.joinedAt : 0
  };
}

function applyRoomMove(
  room: RoomState,
  movePayload: {
    color?: 'w' | 'b';
    from?: { r: number; c: number };
    to?: { r: number; c: number };
    promotion?: string;
  }
): boolean {
  if (!movePayload.from || !movePayload.to) return false;
  const moveColor: 'w' | 'b' = movePayload.color === 'b' ? 'b' : 'w';

  // Idempotency guard: ignore duplicate move if the last move in the room is identical
  const lastMove = room.moves[room.moves.length - 1];
  if (
    lastMove &&
    lastMove.color === moveColor &&
    lastMove.from.r === movePayload.from.r &&
    lastMove.from.c === movePayload.from.c &&
    lastMove.to.r === movePayload.to.r &&
    lastMove.to.c === movePayload.to.c
  ) {
    return false;
  }

  room.moves.push({
    seq: room.moves.length + 1,
    color: moveColor,
    from: { r: Number(movePayload.from.r), c: Number(movePayload.from.c) },
    to: { r: Number(movePayload.to.r), c: Number(movePayload.to.c) },
    promotion: movePayload.promotion || 'queen',
    ts: Date.now()
  });
  room.turn = moveColor === 'w' ? 'b' : 'w';
  room.updatedAt = Date.now();
  broadcastRoomState(room);
  return true;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  app.use(express.json({ limit: '15mb' }));

  // --- Matchmaking REST API ---
  app.post('/api/matchmaking/join', (req, res) => {
    const playerToken = String(req.body?.playerToken || 'anon_' + Date.now());
    const pref = req.body?.preferredColor;
    const preferredColor: 'w' | 'b' | 'any' = pref === 'w' || pref === 'b' ? pref : 'any';
    const rating = Number(req.body?.rating) || 1000;
    const loadout = sanitizeLoadout(req.body?.loadout);
    const result = tryMatchPlayers(playerToken, preferredColor, rating, loadout, null);
    res.json({ ok: true, playerToken, ...result });
  });

  app.post('/api/matchmaking/leave', (req, res) => {
    const playerToken = String(req.body?.playerToken || '');
    const idx = matchmakingQueue.findIndex((q) => q.playerToken === playerToken);
    if (idx !== -1) matchmakingQueue.splice(idx, 1);
    res.json({ ok: true });
  });

  // --- Room Management REST API ---
  app.post('/api/rooms/create', (req, res) => {
    const playerToken = String(req.body?.playerToken || 'tok_' + Date.now());
    const preferredColor: 'w' | 'b' = req.body?.preferredColor === 'b' ? 'b' : 'w';
    const loadout = sanitizeLoadout(req.body?.loadout);
    const code = generateRoomCode();
    const room: RoomState = {
      code,
      status: 'waiting',
      whiteToken: preferredColor === 'w' ? playerToken : null,
      blackToken: preferredColor === 'b' ? playerToken : null,
      whiteJoined: preferredColor === 'w',
      blackJoined: preferredColor === 'b',
      whiteLoadout: preferredColor === 'w' ? loadout : null,
      blackLoadout: preferredColor === 'b' ? loadout : null,
      turn: 'w',
      moves: [],
      resetCount: 0,
      updatedAt: Date.now(),
      wsClients: new Set(),
      sseClients: new Set()
    };
    rooms.set(code, room);
    res.json({
      ok: true,
      code,
      color: preferredColor,
      playerToken,
      room: serializeRoom(room)
    });
  });

  app.post('/api/rooms/join', (req, res) => {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const playerToken = String(req.body?.playerToken || 'tok_' + Date.now());
    const loadout = sanitizeLoadout(req.body?.loadout);
    if (!code) {
      res.status(400).json({ ok: false, error: 'Room code required' });
      return;
    }

    let room = rooms.get(code);
    let assignedColor: 'w' | 'b' = 'b';

    if (!room) {
      room = {
        code,
        status: 'waiting',
        whiteToken: playerToken,
        blackToken: null,
        whiteJoined: true,
        blackJoined: false,
        whiteLoadout: loadout,
        blackLoadout: null,
        turn: 'w',
        moves: [],
        resetCount: 0,
        updatedAt: Date.now(),
        wsClients: new Set(),
        sseClients: new Set()
      };
      assignedColor = 'w';
      rooms.set(code, room);
    } else {
      if (room.whiteToken === playerToken) {
        assignedColor = 'w';
      } else if (room.blackToken === playerToken) {
        assignedColor = 'b';
      } else if (!room.whiteJoined) {
        room.whiteToken = playerToken;
        room.whiteJoined = true;
        assignedColor = 'w';
      } else {
        room.blackToken = playerToken;
        room.blackJoined = true;
        assignedColor = 'b';
      }
      if (loadout) {
        if (assignedColor === 'w') room.whiteLoadout = loadout;
        else room.blackLoadout = loadout;
      }
      room.status = room.whiteJoined && room.blackJoined ? 'playing' : 'waiting';
      room.updatedAt = Date.now();
      broadcastRoomState(room);
    }

    res.json({
      ok: true,
      code,
      color: assignedColor,
      playerToken,
      room: serializeRoom(room)
    });
  });

  app.post('/api/rooms/:code/loadout', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ ok: false, error: 'Room not found' });
      return;
    }
    const color: 'w' | 'b' = req.body?.color === 'b' ? 'b' : 'w';
    const loadout = sanitizeLoadout(req.body?.loadout);
    if (loadout) {
      if (color === 'w') room.whiteLoadout = loadout;
      else room.blackLoadout = loadout;
      room.updatedAt = Date.now();
      broadcastRoomState(room);
    }
    res.json({ ok: true, room: serializeRoom(room) });
  });

  app.get('/api/rooms/:code/state', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ ok: false, error: 'Room not found' });
      return;
    }
    res.json({ ok: true, room: serializeRoom(room) });
  });

  app.post('/api/rooms/:code/move', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ ok: false, error: 'Room not found' });
      return;
    }
    applyRoomMove(room, req.body || {});
    res.json({ ok: true, room: serializeRoom(room) });
  });

  app.post('/api/rooms/:code/reset', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ ok: false, error: 'Room not found' });
      return;
    }
    room.moves = [];
    room.turn = 'w';
    room.resetCount += 1;
    room.updatedAt = Date.now();
    broadcastRoomState(room);
    res.json({ ok: true, room: serializeRoom(room) });
  });

  app.get('/api/rooms/:code/events', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (room) {
      room.sseClients.add(res);
      res.write(`data: ${JSON.stringify({ room: serializeRoom(room) })}\n\n`);
      req.on('close', () => {
        room.sseClients.delete(res);
      });
    } else {
      res.end();
    }
  });

  // --- WebSocket Server for Real-Time Matchmaking & Room Sync ---
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let subscribedRoom: RoomState | null = null;
    let clientToken = '';

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (!msg || typeof msg.type !== 'string') return;

        if (msg.playerToken) {
          clientToken = String(msg.playerToken);
        }

        if (msg.type === 'queue:join') {
          const pref = msg.preferredColor;
          const preferredColor: 'w' | 'b' | 'any' = pref === 'w' || pref === 'b' ? pref : 'any';
          const rating = Number(msg.rating) || 1000;
          const loadout = sanitizeLoadout(msg.loadout);
          const result = tryMatchPlayers(
            clientToken || 'anon_' + Date.now(),
            preferredColor,
            rating,
            loadout,
            ws
          );
          if (result.status === 'matched') {
            subscribedRoom = rooms.get(result.code) || null;
            ws.send(
              JSON.stringify({
                type: 'queue:matched',
                code: result.code,
                color: result.color,
                opponentRating: result.opponentRating,
                room: result.room
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: 'queue:searching',
                queueSize: result.queueSize,
                waitMs: result.waitMs
              })
            );
          }
        } else if (msg.type === 'queue:leave') {
          const idx = matchmakingQueue.findIndex((q) => q.playerToken === clientToken || q.ws === ws);
          if (idx !== -1) matchmakingQueue.splice(idx, 1);
          ws.send(JSON.stringify({ type: 'queue:left' }));
        } else if (msg.type === 'room:subscribe') {
          const code = String(msg.code || '').trim().toUpperCase();
          const room = rooms.get(code);
          if (room) {
            if (subscribedRoom && subscribedRoom !== room) {
              subscribedRoom.wsClients.delete(ws);
            }
            subscribedRoom = room;
            room.wsClients.add(ws);
            ws.send(JSON.stringify({ type: 'room:state', room: serializeRoom(room) }));
          }
        } else if (msg.type === 'room:loadout') {
          const code = String(msg.code || '').trim().toUpperCase();
          const room = rooms.get(code) || subscribedRoom;
          const loadout = sanitizeLoadout(msg.loadout);
          if (room && loadout) {
            if (msg.color === 'b') room.blackLoadout = loadout;
            else room.whiteLoadout = loadout;
            room.updatedAt = Date.now();
            broadcastRoomState(room);
          }
        } else if (msg.type === 'room:move') {
          const code = String(msg.code || '').trim().toUpperCase();
          const room = rooms.get(code) || subscribedRoom;
          if (room) {
            applyRoomMove(room, msg);
          }
        } else if (msg.type === 'room:reset') {
          const code = String(msg.code || '').trim().toUpperCase();
          const room = rooms.get(code) || subscribedRoom;
          if (room) {
            room.moves = [];
            room.turn = 'w';
            room.resetCount += 1;
            room.updatedAt = Date.now();
            broadcastRoomState(room);
          }
        }
      } catch {
        // ignore malformed message
      }
    });

    ws.on('close', () => {
      if (subscribedRoom) {
        subscribedRoom.wsClients.delete(ws);
      }
      const qIdx = matchmakingQueue.findIndex((q) => q.ws === ws);
      if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);
    });
  });

  // --- Vite Middleware in Development / Static Build in Production ---
  const distPath = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Wizard Chess 3D server & WebSocket arena listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
