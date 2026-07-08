export const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export type FaceName = (typeof FACE_NAMES)[number];

export const SOLVED_STATE =
  'U'.repeat(9) +
  'R'.repeat(9) +
  'F'.repeat(9) +
  'D'.repeat(9) +
  'L'.repeat(9) +
  'B'.repeat(9);

export type Move = `${FaceName}` | `${FaceName}'` | `${FaceName}2`;
export type Coord = [number, number, number];
type FaceletKey = string;

const FACE_TURNS: Record<FaceName, [axis: 'x' | 'y' | 'z', layer: number]> = {
  U: ['y', 1],
  R: ['x', 1],
  F: ['z', 1],
  D: ['y', -1],
  L: ['x', -1],
  B: ['z', -1],
};

const AXIS_INDEX = { x: 0, y: 1, z: 2 } as const;

function key(pos: Coord, normal: Coord): FaceletKey {
  return `${pos.join(',')}|${normal.join(',')}`;
}

function buildFaceletMaps(): {
  indexToKey: Map<number, FaceletKey>;
  keyToIndex: Map<FaceletKey, number>;
  keyParts: Map<number, [Coord, Coord]>;
} {
  const indexToKey = new Map<number, FaceletKey>();
  const keyToIndex = new Map<FaceletKey, number>();
  const keyParts = new Map<number, [Coord, Coord]>();

  const add = (idx: number, pos: Coord, normal: Coord) => {
    const value = key(pos, normal);
    indexToKey.set(idx, value);
    keyToIndex.set(value, idx);
    keyParts.set(idx, [pos, normal]);
  };

  [-1, 0, 1].forEach((z, row) => {
    [-1, 0, 1].forEach((x, col) => add(row * 3 + col, [x, 1, z], [0, 1, 0]));
  });
  [1, 0, -1].forEach((y, row) => {
    [1, 0, -1].forEach((z, col) => add(9 + row * 3 + col, [1, y, z], [1, 0, 0]));
  });
  [1, 0, -1].forEach((y, row) => {
    [-1, 0, 1].forEach((x, col) => add(18 + row * 3 + col, [x, y, 1], [0, 0, 1]));
  });
  [1, 0, -1].forEach((z, row) => {
    [-1, 0, 1].forEach((x, col) => add(27 + row * 3 + col, [x, -1, z], [0, -1, 0]));
  });
  [1, 0, -1].forEach((y, row) => {
    [-1, 0, 1].forEach((z, col) => add(36 + row * 3 + col, [-1, y, z], [-1, 0, 0]));
  });
  [1, 0, -1].forEach((y, row) => {
    [1, 0, -1].forEach((x, col) => add(45 + row * 3 + col, [x, y, -1], [0, 0, -1]));
  });

  return { indexToKey, keyToIndex, keyParts };
}

function rotateVec(v: Coord, axis: 'x' | 'y' | 'z', quarterTurn: number): Coord {
  const [x, y, z] = v;
  if (axis === 'x') return quarterTurn === 1 ? [x, -z, y] : [x, z, -y];
  if (axis === 'y') return quarterTurn === 1 ? [z, y, -x] : [-z, y, x];
  return quarterTurn === 1 ? [-y, x, z] : [y, -x, z];
}

function invert(perm: number[]): number[] {
  const out = new Array<number>(54);
  perm.forEach((value, idx) => {
    out[value] = idx;
  });
  return out;
}

function doubleMove(perm: number[]): number[] {
  return perm.map((value) => perm[value] ?? value);
}

const { keyToIndex, keyParts } = buildFaceletMaps();

function buildMove(face: FaceName): number[] {
  const [axis, layer] = FACE_TURNS[face];
  const axisIdx = AXIS_INDEX[axis];
  const quarterTurn = -layer;
  const perm = Array.from({ length: 54 }, (_, idx) => idx);

  for (const [oldIdx, parts] of keyParts.entries()) {
    const [pos, normal] = parts;
    if (pos[axisIdx] !== layer) continue;
    const newKey = key(
      rotateVec(pos, axis, quarterTurn),
      rotateVec(normal, axis, quarterTurn),
    );
    const newIdx = keyToIndex.get(newKey);
    if (newIdx === undefined) throw new Error(`Missing facelet map for ${newKey}`);
    perm[newIdx] = oldIdx;
  }
  return perm;
}

export const MOVES: Record<Move, number[]> = FACE_NAMES.reduce((acc, face) => {
  const cw = buildMove(face);
  acc[face] = cw;
  acc[`${face}'` as Move] = invert(cw);
  acc[`${face}2` as Move] = doubleMove(cw);
  return acc;
}, {} as Record<Move, number[]>);

export const ALL_MOVES: Move[] = FACE_NAMES.flatMap((face) => [
  face,
  `${face}'` as Move,
  `${face}2` as Move,
]);

export function applyMove(state: string, move: Move): string {
  const perm = MOVES[move];
  return Array.from({ length: 54 }, (_, idx) => state.charAt(perm[idx] ?? idx)).join('');
}

export function applySequence(state: string, moves: readonly Move[]): string {
  return moves.reduce((current, move) => applyMove(current, move), state);
}

export function parseMoves(text: string): Move[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const valid = new Set<string>(ALL_MOVES);
  const bad = tokens.filter((token) => !valid.has(token));
  if (bad.length) throw new Error(`Unrecognized move(s): ${bad.join(', ')}`);
  return tokens as Move[];
}

const CORNER_FACELETS = [
  [8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
  [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51],
] as const;

const EDGE_FACELETS = [
  [5, 10], [7, 19], [3, 37], [1, 46],
  [32, 16], [28, 25], [30, 43], [34, 52],
  [23, 12], [21, 41], [50, 39], [48, 14],
] as const;

function parity(values: number[]): number {
  let result = 0;
  for (let i = 0; i < values.length - 1; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      if ((values[i] ?? 0) > (values[j] ?? 0)) result ^= 1;
    }
  }
  return result;
}

function cubieValidationError(state: string): string {
  const cornerColors = CORNER_FACELETS.map((facelets) => facelets.map((idx) => SOLVED_STATE.charAt(idx)));
  const edgeColors = EDGE_FACELETS.map((facelets) => facelets.map((idx) => SOLVED_STATE.charAt(idx)));
  const corners = new Array<number>(8).fill(-1);
  const cornerOrientation = new Array<number>(8).fill(0);

  CORNER_FACELETS.forEach((facelets, position) => {
    const colors = facelets.map((idx) => state.charAt(idx));
    const orientation = colors.findIndex((color) => color === 'U' || color === 'D');
    if (orientation < 0) throw new Error(`Corner ${position + 1} has no U/D sticker`);
    const col1 = colors[(orientation + 1) % 3];
    const col2 = colors[(orientation + 2) % 3];
    if (!col1 || !col2) throw new Error(`Corner ${position + 1} has invalid stickers: ${colors.join('')}`);
    const cubie = cornerColors.findIndex((solved) => col1 === solved[1] && col2 === solved[2]);
    if (cubie < 0) throw new Error(`Corner ${position + 1} has invalid stickers: ${colors.join('')}`);
    corners[position] = cubie;
    cornerOrientation[position] = orientation % 3;
  });

  if (corners.slice().sort((a, b) => a - b).some((value, idx) => value !== idx)) {
    return 'Corner cubies are duplicated or missing';
  }
  if (cornerOrientation.reduce((sum, value) => sum + value, 0) % 3) return 'Corner twist is impossible';

  const edges = new Array<number>(12).fill(-1);
  const edgeOrientation = new Array<number>(12).fill(0);
  EDGE_FACELETS.forEach((facelets, position) => {
    const colors = facelets.map((idx) => state.charAt(idx));
    const cubie = edgeColors.findIndex((solved) => colors[0] === solved[0] && colors[1] === solved[1]);
    const flipped = edgeColors.findIndex((solved) => colors[0] === solved[1] && colors[1] === solved[0]);
    if (cubie >= 0) edges[position] = cubie;
    else if (flipped >= 0) {
      edges[position] = flipped;
      edgeOrientation[position] = 1;
    } else {
      throw new Error(`Edge ${position + 1} has invalid stickers: ${colors.join('')}`);
    }
  });

  if (edges.slice().sort((a, b) => a - b).some((value, idx) => value !== idx)) {
    return 'Edge cubies are duplicated or missing';
  }
  if (edgeOrientation.reduce((sum, value) => sum + value, 0) % 2) return 'Edge flip is impossible';
  if (parity(corners) !== parity(edges)) return 'Permutation parity is impossible';
  return '';
}

export function validateState(state: string, physical = false): { ok: true } | { ok: false; reason: string } {
  if (state.length !== 54) return { ok: false, reason: `State must be 54 characters, got ${state.length}` };
  const validFaces = new Set(FACE_NAMES);
  const invalid = Array.from(new Set(state.split('').filter((letter) => !validFaces.has(letter as FaceName))));
  if (invalid.length) return { ok: false, reason: `Unknown face letter(s): ${invalid.join(', ')}` };
  for (let face = 0; face < FACE_NAMES.length; face += 1) {
    const letter = FACE_NAMES[face];
    if (!letter) continue;
    const count = state.split('').filter((value) => value === letter).length;
    if (count !== 9) return { ok: false, reason: `Color '${letter}' appears ${count} time(s) (need 9)` };
    const center = state.charAt(face * 9 + 4);
    if (center !== letter) return { ok: false, reason: `Center of ${letter}-face is '${center}' (must be '${letter}')` };
  }
  if (physical) {
    try {
      const reason = cubieValidationError(state);
      if (reason) return { ok: false, reason };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }
  return { ok: true };
}

export function isSolved(state: string): boolean {
  return state === SOLVED_STATE;
}
