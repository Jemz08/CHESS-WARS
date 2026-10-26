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

interface RoomState {
  code: string;
  status: 'waiting' | 'playing';
  whiteToken: string | null;
  blackToken: string | null;
  whiteJoined: boolean;
  blackJoined: boolean;
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
  ws: WebSocket | null;
  joinedAt: number;
}

const rooms = new Map<string, RoomState>();
const matchmakingQueue: QueueEntry[] = [];
const matchedByToken = new Map<string, { code: string; color: 'w' | 'b'; ts: number }>();

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
    const expired = now - entry.joinedAt > 60_000;
    if (wsClosed || expired) {
      matchmakingQueue.splice(i, 1);
    }
  }
}

function tryMatchPlayers(
  playerToken: string,
  preferredColor: 'w' | 'b' | 'any' = 'any',
  ws: WebSocket | null = null
): { status: 'matched'; code: string; color: 'w' | 'b'; room: ReturnType<typeof serializeRoom> } | { status: 'searching'; queueSize: number } {
  pruneQueue();

  // Check if this player was recently paired by another user's request
  const existingMatch = matchedByToken.get(playerToken);
  if (existingMatch && Date.now() - existingMatch.ts < 30_000) {
    const room = rooms.get(existingMatch.code);
    if (room) {
      matchedByToken.delete(playerToken);
      if (ws) room.wsClients.add(ws);
      return {
        status: 'matched',
        code: room.code,
        color: existingMatch.color,
        room: serializeRoom(room)
      };
    }
  }

  // Look for another waiting player in the queue with a different token
  const opponentIdx = matchmakingQueue.findIndex((q) => q.playerToken !== playerToken);
  if (opponentIdx !== -1) {
    const opponent = matchmakingQueue.splice(opponentIdx, 1)[0];
    // Also remove any stale entry for current player
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
            room: serializeRoom(room)
          })
        );
      } catch {
        // fallback via matchedByToken
      }
    }

    rooms.set(code, room);
    matchedByToken.set(opponent.playerToken, { code, color: oppColor, ts: Date.now() });

    return {
      status: 'matched',
      code,
      color: myColor,
      room: serializeRoom(room)
    };
  }

  // Otherwise add/update this player in the queue
  const existingIdx = matchmakingQueue.findIndex((q) => q.playerToken === playerToken);
  if (existingIdx !== -1) {
    matchmakingQueue[existingIdx].preferredColor = preferredColor;
    matchmakingQueue[existingIdx].joinedAt = Date.now();
    if (ws) matchmakingQueue[existingIdx].ws = ws;
  } else {
    matchmakingQueue.push({
      playerToken,
      preferredColor,
      ws,
      joinedAt: Date.now()
    });
  }

  return {
    status: 'searching',
    queueSize: matchmakingQueue.length
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
    const result = tryMatchPlayers(playerToken, preferredColor, null);
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
    const code = generateRoomCode();
    const room: RoomState = {
      code,
      status: 'waiting',
      whiteToken: preferredColor === 'w' ? playerToken : null,
      blackToken: preferredColor === 'b' ? playerToken : null,
      whiteJoined: preferredColor === 'w',
      blackJoined: preferredColor === 'b',
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
          const result = tryMatchPlayers(clientToken || 'anon_' + Date.now(), preferredColor, ws);
          if (result.status === 'matched') {
            subscribedRoom = rooms.get(result.code) || null;
            ws.send(
              JSON.stringify({
                type: 'queue:matched',
                code: result.code,
                color: result.color,
                room: result.room
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: 'queue:searching',
                queueSize: result.queueSize
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
