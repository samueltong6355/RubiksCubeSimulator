import Cube from '../vendor/cubejs';

import { ALL_MOVES, applyMove, Move, SOLVED_STATE, validateState } from './cube';

const CORNERS = [
  [8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
  [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51],
] as const;

const EDGES = [
  [5, 10], [7, 19], [3, 37], [1, 46],
  [32, 16], [28, 25], [30, 43], [34, 52],
  [23, 12], [21, 41], [50, 39], [48, 14],
] as const;

const AXIS: Record<string, number> = { U: 0, D: 0, F: 1, B: 1, L: 2, R: 2 };

function sameAxis(a: Move, b: Move): boolean {
  return AXIS[a.charAt(0)] === AXIS[b.charAt(0)];
}

function heuristic(state: string): number {
  const wrongCorners = CORNERS.filter((piece) => piece.some((idx) => state.charAt(idx) !== SOLVED_STATE.charAt(idx))).length;
  const wrongEdges = EDGES.filter((piece) => piece.some((idx) => state.charAt(idx) !== SOLVED_STATE.charAt(idx))).length;
  return Math.max(Math.ceil(wrongCorners / 4), Math.ceil(wrongEdges / 4));
}

let cubeJsReady = false;

export function solveKociemba(state: string, maxDepth = 22): Move[] {
  const validation = validateState(state, true);
  if (!validation.ok) throw new Error(validation.reason);
  if (state === SOLVED_STATE) return [];
  if (!cubeJsReady) {
    Cube.initSolver();
    cubeJsReady = true;
  }
  return Cube.fromString(state).solve(maxDepth).trim().split(/\s+/).filter(Boolean) as Move[];
}

export function solveFallback(state: string, maxDepth = 12, timeoutMs = 3000): Move[] | null {
  const validation = validateState(state, true);
  if (!validation.ok) throw new Error(validation.reason);
  if (state === SOLVED_STATE) return [];

  const deadline = Date.now() + timeoutMs;
  const path: Move[] = [];
  let timedOut = false;

  const search = (current: string, depth: number, bound: number, lastMove?: Move): number => {
    if (Date.now() > deadline) {
      timedOut = true;
      return Number.POSITIVE_INFINITY;
    }
    const f = depth + heuristic(current);
    if (f > bound) return f;
    if (current === SOLVED_STATE) return -1;

    let minimum = Number.POSITIVE_INFINITY;
    for (const move of ALL_MOVES) {
      if (lastMove && move.charAt(0) === lastMove.charAt(0)) continue;
      if (lastMove && sameAxis(move, lastMove) && move.charAt(0) < lastMove.charAt(0)) continue;
      const next = applyMove(current, move);
      path.push(move);
      const result = search(next, depth + 1, bound, move);
      if (result === -1) return -1;
      if (result < minimum) minimum = result;
      path.pop();
      if (timedOut) return Number.POSITIVE_INFINITY;
    }
    return minimum;
  };

  let bound = heuristic(state);
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const result = search(state, 0, bound);
    if (result === -1) return [...path];
    if (!Number.isFinite(result) || timedOut) return null;
    bound = result;
  }
  return null;
}
