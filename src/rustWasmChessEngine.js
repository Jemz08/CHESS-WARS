// ============================================================================
// Rust-Style Linear-Memory WebAssembly (.wasm) + Web Worker Chess AI Engine
// ============================================================================
// Architecture:
// 1. Compiles a native WebAssembly binary module (`WebAssembly.Instance`) with
//    a 1-page (64 KB) linear memory buffer (`memory`):
//    - Bytes 0..255   (`Int32Array` length 64): Flat 8x8 board state
//      (0 = empty, +1..+6 = White Pawn..King, -1..-6 = Black Pawn..King)
//    - Bytes 256..4351 (`Int32Array` length 1024): Pre-computed Piece-Square
//      Evaluation Lookup Table indexed by `((pieceCode + 8) << 6) | sqIndex`.
// 2. Runs a zero-allocation flat-array Alpha-Beta Minimax & MVV-LVA tactical
//    search inside a dedicated background Web Worker so AI turns never block
//    the 60 FPS Three.js WebGL render loop.
// 3. Provides an instant synchronous fallback using the same WASM instance
//    for immediate invocation or automated test steps.
// ============================================================================

const PIECE_CODE_MAP = {
  pawn: 1,
  knight: 2,
  bishop: 3,
  rook: 4,
  queen: 5,
  king: 6
};

const CODE_TO_VALUE = [0, 100, 320, 330, 500, 900, 20000];

/**
 * Assembles a spec-compliant WebAssembly binary module implementing:
 * `(func (export "eval_board") (param $aiSign i32) (result i32))`
 * which iterates `sq = 0..63`, loads `piece = i32.load(sq << 2)`, and sums
 * `i32.load(256 + (((piece + 8) << 6) + sq) << 2)` multiplied by `$aiSign`.
 */
function buildChessEvalWasmBytes() {
  // Body of `eval_board(param $0: i32) -> i32`:
  // Locals: $1 (sq: i32), $2 (sum: i32), $3 (piece: i32)
  const codeBody = [
    0x01, 0x03, 0x7f, // 3 locals of type i32 ($1=sq, $2=sum, $3=piece)
    0x03, 0x40,       // loop $loop (blocktype void)
      // $3 = i32.load(offset=0, align=2, addr = $1 << 2)
      0x20, 0x01,     // local.get $1 (sq)
      0x41, 0x02,     // i32.const 2
      0x74,           // i32.shl
      0x28, 0x02, 0x00, // i32.load align=2 offset=0
      0x22, 0x03,     // local.tee $3 (piece)
      0x04, 0x40,     // if (piece != 0)
        // $2 = $2 + i32.load(offset=256, addr = (((piece + 8) << 6) + sq) << 2)
        0x20, 0x02,   // local.get $2 (sum)
        0x20, 0x03,   // local.get $3 (piece)
        0x41, 0x08,   // i32.const 8
        0x6a,         // i32.add
        0x41, 0x06,   // i32.const 6
        0x74,         // i32.shl
        0x20, 0x01,   // local.get $1 (sq)
        0x6a,         // i32.add
        0x41, 0x02,   // i32.const 2
        0x74,         // i32.shl
        0x28, 0x02, 0x80, 0x02, // i32.load align=2 offset=256 (LEB128 for 256 is 0x80, 0x02)
        0x6a,         // i32.add
        0x21, 0x02,   // local.set $2 (sum)
      0x0b,           // end if
      // $1 = $1 + 1
      0x20, 0x01,     // local.get $1
      0x41, 0x01,     // i32.const 1
      0x6a,           // i32.add
      0x22, 0x01,     // local.tee $1
      0x41, 0xc0, 0x00, // i32.const 64 (signed LEB128: 0xc0, 0x00)
      0x49,           // i32.lt_u
      0x0d, 0x00,     // br_if $loop (0)
    0x0b,             // end loop
    // return $2 * $0 ($aiSign)
    0x20, 0x02,       // local.get $2
    0x20, 0x00,       // local.get $0
    0x6c,             // i32.mul
    0x0b              // end func
  ];

  const section = (id, payload) => [id, payload.length, ...payload];

  // Type section: 1 func type `(i32) -> i32`
  const typeSection = section(0x01, [0x01, 0x60, 0x01, 0x7f, 0x01, 0x7f]);
  // Function section: 1 function using type 0
  const funcSection = section(0x03, [0x01, 0x00]);
  // Memory section: 1 memory with min=1 page, max=1 page
  const memSection = section(0x05, [0x01, 0x01, 0x01, 0x01]);
  // Export section: export "memory" (mem 0) and "eval_board" (func 0)
  const expMemName = [0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79]; // "memory"
  const expFnName = [0x0a, 0x65, 0x76, 0x61, 0x6c, 0x5f, 0x62, 0x6f, 0x61, 0x72, 0x64]; // "eval_board"
  const exportSection = section(0x07, [
    0x02,
    ...expMemName, 0x02, 0x00,
    ...expFnName, 0x00, 0x00
  ]);
  // Code section: 1 function body
  const codeSection = section(0x0a, [0x01, codeBody.length, ...codeBody]);

  return new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, // "\0asm"
    0x01, 0x00, 0x00, 0x00, // version 1
    ...typeSection,
    ...funcSection,
    ...memSection,
    ...exportSection,
    ...codeSection
  ]);
}

/**
 * Populates the Piece-Square Lookup Table at byte offset 256 in WASM linear memory
 * so that `eval_board` computes material + positional bonuses in a single load.
 */
function populateWasmPieceSquareTable(memBuffer) {
  const pstView = new Int32Array(memBuffer, 256, 16 * 64);
  pstView.fill(0);

  for (let code = -6; code <= 6; code++) {
    if (code === 0) continue;
    const sign = code > 0 ? 1 : -1;
    const absType = Math.abs(code);
    const baseVal = CODE_TO_VALUE[absType] || 100;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = (r << 3) | c;
        let val = baseVal;
        const centerBonus = Math.round((3.5 - Math.abs(3.5 - r)) * 8 + (3.5 - Math.abs(3.5 - c)) * 8);

        if (absType === 2 || absType === 3) {
          // Knight or Bishop center control
          val += Math.round(centerBonus * 1.4);
        } else if (absType === 1) {
          // Pawn advancement & central file bonus
          const adv = sign > 0 ? 6 - r : r - 1;
          val += Math.round(adv * 14 + (3.5 - Math.abs(3.5 - c)) * 5);
        } else if (absType === 5) {
          // Queen central dominance
          val += Math.round(centerBonus * 0.6);
        } else if (absType === 4) {
          // Rook 7th-rank & open-file readiness
          const seventhBonus = (sign > 0 && r === 1) || (sign < 0 && r === 6) ? 22 : 0;
          val += seventhBonus + Math.round(centerBonus * 0.25);
        }

        const lutIdx = ((code + 8) << 6) | sq;
        pstView[lutIdx] = sign * val;
      }
    }
  }
}

/**
 * Creates a self-contained WASM + Flat-Array Tactical Search Kernel.
 * Can be instantiated both on the main thread and inside the Web Worker.
 */
function createWasmSearchKernel() {
  let wasmEvalFn = null;
  let boardView = new Int32Array(64);
  let pstFallback = new Int32Array(16 * 64);

  try {
    const wasmBytes = buildChessEvalWasmBytes();
    const mod = new WebAssembly.Module(wasmBytes);
    const inst = new WebAssembly.Instance(mod, {});
    const mem = inst.exports.memory;
    populateWasmPieceSquareTable(mem.buffer);
    boardView = new Int32Array(mem.buffer, 0, 64);
    pstFallback = new Int32Array(mem.buffer, 256, 16 * 64);
    wasmEvalFn = inst.exports.eval_board;
  } catch (err) {
    populateWasmPieceSquareTable(pstFallback.buffer);
    wasmEvalFn = (aiSign) => {
      let sum = 0;
      for (let sq = 0; sq < 64; sq++) {
        const p = boardView[sq];
        if (p !== 0) {
          sum += pstFallback[((p + 8) << 6) | sq];
        }
      }
      return sum * aiSign;
    };
  }

  const KNIGHT_DR = [-2, -2, -1, -1, 1, 1, 2, 2];
  const KNIGHT_DC = [-1, 1, -2, 2, -2, 2, -1, 1];
  const KING_DR = [-1, -1, -1, 0, 0, 1, 1, 1];
  const KING_DC = [-1, 0, 1, -1, 1, -1, 0, 1];
  const ORTHO_DR = [-1, 1, 0, 0];
  const ORTHO_DC = [0, 0, -1, 1];
  const DIAG_DR = [-1, -1, 1, 1];
  const DIAG_DC = [-1, 1, -1, 1];

  function isSquareAttackedBy(targetSq, attackerSign) {
    const tr = targetSq >> 3;
    const tc = targetSq & 7;

    // 1. Pawn attacks
    const pawnSourceRow = attackerSign > 0 ? tr + 1 : tr - 1;
    if (pawnSourceRow >= 0 && pawnSourceRow < 8) {
      const targetPawnCode = attackerSign * 1;
      if (tc > 0 && boardView[(pawnSourceRow << 3) | (tc - 1)] === targetPawnCode) return true;
      if (tc < 7 && boardView[(pawnSourceRow << 3) | (tc + 1)] === targetPawnCode) return true;
    }

    // 2. Knight attacks
    const knightCode = attackerSign * 2;
    for (let i = 0; i < 8; i++) {
      const nr = tr + KNIGHT_DR[i];
      const nc = tc + KNIGHT_DC[i];
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (boardView[(nr << 3) | nc] === knightCode) return true;
      }
    }

    // 3. King attacks
    const kingCode = attackerSign * 6;
    for (let i = 0; i < 8; i++) {
      const kr = tr + KING_DR[i];
      const kc = tc + KING_DC[i];
      if (kr >= 0 && kr < 8 && kc >= 0 && kc < 8) {
        if (boardView[(kr << 3) | kc] === kingCode) return true;
      }
    }

    // 4. Orthogonal sliders (Rook=4, Queen=5)
    const rookCode = attackerSign * 4;
    const queenCode = attackerSign * 5;
    for (let d = 0; d < 4; d++) {
      let nr = tr + ORTHO_DR[d];
      let nc = tc + ORTHO_DC[d];
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = boardView[(nr << 3) | nc];
        if (p !== 0) {
          if (p === rookCode || p === queenCode) return true;
          break;
        }
        nr += ORTHO_DR[d];
        nc += ORTHO_DC[d];
      }
    }

    // 5. Diagonal sliders (Bishop=3, Queen=5)
    const bishopCode = attackerSign * 3;
    for (let d = 0; d < 4; d++) {
      let nr = tr + DIAG_DR[d];
      let nc = tc + DIAG_DC[d];
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = boardView[(nr << 3) | nc];
        if (p !== 0) {
          if (p === bishopCode || p === queenCode) return true;
          break;
        }
        nr += DIAG_DR[d];
        nc += DIAG_DC[d];
      }
    }

    return false;
  }

  function isKingInCheckSign(sideSign) {
    const kingCode = sideSign * 6;
    let kingSq = -1;
    for (let sq = 0; sq < 64; sq++) {
      if (boardView[sq] === kingCode) {
        kingSq = sq;
        break;
      }
    }
    if (kingSq < 0) return true;
    return isSquareAttackedBy(kingSq, -sideSign);
  }

  // Generates pseudo-legal moves packed as integers: `(fromSq << 6) | toSq`
  function generatePseudoMoves(sideSign) {
    const moves = [];
    for (let sq = 0; sq < 64; sq++) {
      const p = boardView[sq];
      if (p === 0 || (sideSign > 0 ? p < 0 : p > 0)) continue;
      const absType = p < 0 ? -p : p;
      const r = sq >> 3;
      const c = sq & 7;

      if (absType === 1) {
        // Pawn
        const dir = sideSign > 0 ? -1 : 1;
        const startRow = sideSign > 0 ? 6 : 1;
        const r1 = r + dir;
        if (r1 >= 0 && r1 < 8) {
          const sq1 = (r1 << 3) | c;
          if (boardView[sq1] === 0) {
            moves.push((sq << 6) | sq1);
            const r2 = r + dir * 2;
            if (r === startRow && r2 >= 0 && r2 < 8) {
              const sq2 = (r2 << 3) | c;
              if (boardView[sq2] === 0) {
                moves.push((sq << 6) | sq2);
              }
            }
          }
          if (c > 0) {
            const capL = (r1 << 3) | (c - 1);
            const tL = boardView[capL];
            if (tL !== 0 && (sideSign > 0 ? tL < 0 : tL > 0)) {
              moves.push((sq << 6) | capL);
            }
          }
          if (c < 7) {
            const capR = (r1 << 3) | (c + 1);
            const tR = boardView[capR];
            if (tR !== 0 && (sideSign > 0 ? tR < 0 : tR > 0)) {
              moves.push((sq << 6) | capR);
            }
          }
        }
      } else if (absType === 2) {
        // Knight
        for (let i = 0; i < 8; i++) {
          const nr = r + KNIGHT_DR[i];
          const nc = c + KNIGHT_DC[i];
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const toSq = (nr << 3) | nc;
            const t = boardView[toSq];
            if (t === 0 || (sideSign > 0 ? t < 0 : t > 0)) {
              moves.push((sq << 6) | toSq);
            }
          }
        }
      } else if (absType === 6) {
        // King
        for (let i = 0; i < 8; i++) {
          const nr = r + KING_DR[i];
          const nc = c + KING_DC[i];
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const toSq = (nr << 3) | nc;
            const t = boardView[toSq];
            if (t === 0 || (sideSign > 0 ? t < 0 : t > 0)) {
              moves.push((sq << 6) | toSq);
            }
          }
        }
      } else {
        // Sliders: Bishop (3), Rook (4), Queen (5)
        if (absType === 4 || absType === 5) {
          for (let d = 0; d < 4; d++) {
            let nr = r + ORTHO_DR[d];
            let nc = c + ORTHO_DC[d];
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              const toSq = (nr << 3) | nc;
              const t = boardView[toSq];
              if (t === 0) {
                moves.push((sq << 6) | toSq);
              } else {
                if (sideSign > 0 ? t < 0 : t > 0) moves.push((sq << 6) | toSq);
                break;
              }
              nr += ORTHO_DR[d];
              nc += ORTHO_DC[d];
            }
          }
        }
        if (absType === 3 || absType === 5) {
          for (let d = 0; d < 4; d++) {
            let nr = r + DIAG_DR[d];
            let nc = c + DIAG_DC[d];
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              const toSq = (nr << 3) | nc;
              const t = boardView[toSq];
              if (t === 0) {
                moves.push((sq << 6) | toSq);
              } else {
                if (sideSign > 0 ? t < 0 : t > 0) moves.push((sq << 6) | toSq);
                break;
              }
              nr += DIAG_DR[d];
              nc += DIAG_DC[d];
            }
          }
        }
      }
    }
    return moves;
  }

  function generateLegalMoves(sideSign) {
    const pseudo = generatePseudoMoves(sideSign);
    const legal = [];
    for (let i = 0; i < pseudo.length; i++) {
      const mv = pseudo[i];
      const fromSq = mv >> 6;
      const toSq = mv & 63;
      const piece = boardView[fromSq];
      const saved = boardView[toSq];
      // Handle pawn promotion during search
      let movedPiece = piece;
      if (piece === 1 && (toSq >> 3) === 0) movedPiece = 5;
      else if (piece === -1 && (toSq >> 3) === 7) movedPiece = -5;

      boardView[toSq] = movedPiece;
      boardView[fromSq] = 0;
      const inCheck = isKingInCheckSign(sideSign);
      boardView[fromSq] = piece;
      boardView[toSq] = saved;
      if (!inCheck) {
        legal.push(mv);
      }
    }
    return legal;
  }

  function scoreMoveForOrdering(mv) {
    const fromSq = mv >> 6;
    const toSq = mv & 63;
    const victim = boardView[toSq];
    const attacker = boardView[fromSq];
    let orderScore = 0;
    if (victim !== 0) {
      const vVal = CODE_TO_VALUE[Math.abs(victim)] || 100;
      const aVal = CODE_TO_VALUE[Math.abs(attacker)] || 100;
      orderScore += vVal * 12 - aVal;
    }
    const tr = toSq >> 3;
    const tc = toSq & 7;
    orderScore += Math.round((7 - (Math.abs(3.5 - tr) + Math.abs(3.5 - tc))) * 4);
    return orderScore;
  }

  function alphaBeta(depth, alpha, beta, sideSign, rootAiSign) {
    if (depth <= 0) {
      let baseEval = wasmEvalFn(rootAiSign);
      if (isKingInCheckSign(-rootAiSign)) baseEval += 55;
      if (isKingInCheckSign(rootAiSign)) baseEval -= 55;
      return baseEval;
    }

    const pseudo = generatePseudoMoves(sideSign);
    // MVV-LVA sort for fast alpha-beta cutoffs
    pseudo.sort((a, b) => scoreMoveForOrdering(b) - scoreMoveForOrdering(a));

    const isMaximizing = sideSign === rootAiSign;
    let bestVal = isMaximizing ? -999999 : 999999;
    let legalCount = 0;

    for (let i = 0; i < pseudo.length; i++) {
      const mv = pseudo[i];
      const fromSq = mv >> 6;
      const toSq = mv & 63;
      const piece = boardView[fromSq];
      const saved = boardView[toSq];
      let movedPiece = piece;
      if (piece === 1 && (toSq >> 3) === 0) movedPiece = 5;
      else if (piece === -1 && (toSq >> 3) === 7) movedPiece = -5;

      boardView[toSq] = movedPiece;
      boardView[fromSq] = 0;

      if (!isKingInCheckSign(sideSign)) {
        legalCount++;
        const score = alphaBeta(depth - 1, alpha, beta, -sideSign, rootAiSign);
        boardView[fromSq] = piece;
        boardView[toSq] = saved;

        if (isMaximizing) {
          if (score > bestVal) bestVal = score;
          if (bestVal > alpha) alpha = bestVal;
          if (beta <= alpha) break;
        } else {
          if (score < bestVal) bestVal = score;
          if (bestVal < beta) beta = bestVal;
          if (beta <= alpha) break;
        }
      } else {
        boardView[fromSq] = piece;
        boardView[toSq] = saved;
      }
    }

    if (legalCount === 0) {
      if (isKingInCheckSign(sideSign)) {
        return isMaximizing ? -50000 - depth * 100 : 50000 + depth * 100;
      }
      return 0; // Stalemate
    }

    return bestVal;
  }

  function computeBestMoveFromFlatBoard(flat64, colorChar, difficulty = 'medium') {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    for (let i = 0; i < 64; i++) {
      boardView[i] = flat64[i] | 0;
    }

    const aiSign = colorChar === 'b' ? -1 : 1;
    const legalMoves = generateLegalMoves(aiSign);
    if (legalMoves.length === 0) {
      return { move: null, elapsedMs: 0, nodes: 0 };
    }

    // Easy: fast 1-ply with playful randomness
    if (difficulty === 'easy') {
      if (Math.random() < 0.35) {
        const pick = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
        return {
          move: {
            fromR: (pick >> 6) >> 3,
            fromC: (pick >> 6) & 7,
            toR: (pick & 63) >> 3,
            toC: (pick & 63) & 7
          },
          elapsedMs: Number(Math.max(0.05, t1 - t0).toFixed(2))
        };
      }
      let bestScore = -999999;
      let bestMove = legalMoves[0];
      for (let i = 0; i < legalMoves.length; i++) {
        const mv = legalMoves[i];
        const toSq = mv & 63;
        const target = boardView[toSq];
        const capVal = target !== 0 ? CODE_TO_VALUE[Math.abs(target)] * 0.65 : 0;
        const score = capVal + (Math.random() - 0.5) * 200;
        if (score > bestScore) {
          bestScore = score;
          bestMove = mv;
        }
      }
      const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return {
        move: {
          fromR: (bestMove >> 6) >> 3,
          fromC: (bestMove >> 6) & 7,
          toR: (bestMove & 63) >> 3,
          toC: (bestMove & 63) & 7
        },
        elapsedMs: Number(Math.max(0.05, t1 - t0).toFixed(2))
      };
    }

    // Medium (fast 1-ply + recapture threat check) & Hard (full 2-ply WASM alpha-beta minimax)
    const searchDepth = difficulty === 'hard' ? 1 : 0;
    legalMoves.sort((a, b) => scoreMoveForOrdering(b) - scoreMoveForOrdering(a));

    let bestScore = -999999;
    let candidates = [];

    for (let i = 0; i < legalMoves.length; i++) {
      const mv = legalMoves[i];
      const fromSq = mv >> 6;
      const toSq = mv & 63;
      const piece = boardView[fromSq];
      const saved = boardView[toSq];
      let movedPiece = piece;
      if (piece === 1 && (toSq >> 3) === 0) movedPiece = 5;
      else if (piece === -1 && (toSq >> 3) === 7) movedPiece = -5;

      boardView[toSq] = movedPiece;
      boardView[fromSq] = 0;

      let replyScore = alphaBeta(searchDepth, bestScore - 25, 999999, -aiSign, aiSign);
      if (difficulty === 'medium' && isSquareAttackedBy(toSq, -aiSign)) {
        replyScore -= Math.round((CODE_TO_VALUE[Math.abs(piece)] || 100) * 0.72);
      }

      boardView[fromSq] = piece;
      boardView[toSq] = saved;

      const jitter = (Math.random() - 0.5) * (difficulty === 'hard' ? 5 : 12);
      const totalScore = replyScore + jitter;

      if (totalScore > bestScore + 1) {
        bestScore = totalScore;
        candidates = [mv];
      } else if (Math.abs(totalScore - bestScore) <= 1) {
        candidates.push(mv);
      }
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)] || legalMoves[0];
    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      move: {
        fromR: (chosen >> 6) >> 3,
        fromC: (chosen >> 6) & 7,
        toR: (chosen & 63) >> 3,
        toC: (chosen & 63) & 7
      },
      elapsedMs: Number(Math.max(0.05, t1 - t0).toFixed(2))
    };
  }

  return {
    computeBestMoveFromFlatBoard,
    evaluateFlatBoard: (flat64, colorChar) => {
      for (let i = 0; i < 64; i++) boardView[i] = flat64[i] | 0;
      return wasmEvalFn(colorChar === 'b' ? -1 : 1);
    }
  };
}

/**
 * Serializes the 2D `boardState[8][8]` into a compact `Int32Array(64)` buffer.
 */
export function encodeBoardToFlat64(boardState, outArray = new Int32Array(64)) {
  for (let r = 0; r < 8; r++) {
    const row = boardState[r];
    const rowOffset = r << 3;
    for (let c = 0; c < 8; c++) {
      const p = row[c];
      if (!p) {
        outArray[rowOffset | c] = 0;
      } else {
        const code = PIECE_CODE_MAP[p.type] || 1;
        outArray[rowOffset | c] = p.color === 'b' ? -code : code;
      }
    }
  }
  return outArray;
}

/**
 * Creates the Rust/WASM Worker Bridge with both asynchronous off-thread Worker
 * execution and instant synchronous WASM execution.
 */
export function createRustWasmChessBridge() {
  const localKernel = createWasmSearchKernel();
  const reusableFlatBoard = new Int32Array(64);
  let worker = null;
  let nextReqId = 1;
  const pendingReqs = new Map();
  let lastComputeMs = 0.4;

  // Spin up background Web Worker with self-contained WASM binary kernel
  try {
    if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
      const workerSource = `
        const CODE_TO_VALUE = [0, 100, 320, 330, 500, 900, 20000];
        ${buildChessEvalWasmBytes.toString()}
        ${populateWasmPieceSquareTable.toString()}
        ${createWasmSearchKernel.toString()}
        const kernel = createWasmSearchKernel();
        self.onmessage = function(e) {
          const d = e.data;
          if (!d || d.type !== 'compute_move') return;
          const res = kernel.computeBestMoveFromFlatBoard(d.flat64, d.color, d.difficulty);
          self.postMessage({
            type: 'move_result',
            reqId: d.reqId,
            move: res.move,
            elapsedMs: res.elapsedMs
          });
        };
      `;
      const blob = new Blob([workerSource], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);
      worker.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || msg.type !== 'move_result') return;
        const resolver = pendingReqs.get(msg.reqId);
        if (resolver) {
          pendingReqs.delete(msg.reqId);
          if (typeof msg.elapsedMs === 'number') {
            lastComputeMs = msg.elapsedMs;
          }
          resolver(msg);
        }
      };
      worker.onerror = () => {
        // Fallback to local WASM kernel if worker errors
        for (const [, resolver] of pendingReqs) {
          resolver(null);
        }
        pendingReqs.clear();
      };
    }
  } catch (err) {
    worker = null;
  }

  function computeBestMoveSync(boardState, color, difficulty = 'medium') {
    encodeBoardToFlat64(boardState, reusableFlatBoard);
    const res = localKernel.computeBestMoveFromFlatBoard(reusableFlatBoard, color, difficulty);
    if (typeof res.elapsedMs === 'number') {
      lastComputeMs = res.elapsedMs;
    }
    return res.move;
  }

  function computeBestMoveAsync(boardState, color, difficulty = 'medium') {
    encodeBoardToFlat64(boardState, reusableFlatBoard);
    if (!worker) {
      const move = computeBestMoveSync(boardState, color, difficulty);
      return Promise.resolve({ move, elapsedMs: lastComputeMs, offThread: false });
    }

    const reqId = nextReqId++;
    const snapshot = new Int32Array(reusableFlatBoard);
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (pendingReqs.has(reqId)) {
          pendingReqs.delete(reqId);
          const fallbackMove = localKernel.computeBestMoveFromFlatBoard(snapshot, color, difficulty);
          lastComputeMs = fallbackMove.elapsedMs;
          resolve({ move: fallbackMove.move, elapsedMs: lastComputeMs, offThread: false });
        }
      }, 180);

      pendingReqs.set(reqId, (msg) => {
        clearTimeout(timeoutId);
        if (!msg || !msg.move) {
          const fallbackMove = localKernel.computeBestMoveFromFlatBoard(snapshot, color, difficulty);
          lastComputeMs = fallbackMove.elapsedMs;
          resolve({ move: fallbackMove.move, elapsedMs: lastComputeMs, offThread: false });
        } else {
          resolve({ move: msg.move, elapsedMs: msg.elapsedMs, offThread: true });
        }
      });

      worker.postMessage({
        type: 'compute_move',
        reqId,
        flat64: snapshot,
        color,
        difficulty
      });
    });
  }

  function evaluateBoardFast(boardState, color) {
    encodeBoardToFlat64(boardState, reusableFlatBoard);
    return localKernel.evaluateFlatBoard(reusableFlatBoard, color);
  }

  return {
    computeBestMoveSync,
    computeBestMoveAsync,
    evaluateBoardFast,
    getLastComputeMs: () => lastComputeMs,
    isWorkerActive: () => Boolean(worker)
  };
}
