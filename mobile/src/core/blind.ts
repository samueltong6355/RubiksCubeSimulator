import { SOLVED_STATE } from './cube';

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWX'.split('');

export type MemoTrace = {
  letters: string[];
  cycles: string[][];
  text: string;
  pairs: string[];
};

export type ExecutionStep = {
  label: string;
  algorithm: string;
  note: string;
  setup: string;
  core: string;
  undo: string;
};

export type BlindResult = {
  mode: string;
  edgeBuffer: string;
  cornerBuffer: string;
  edges: MemoTrace;
  corners: MemoTrace;
  edgeSteps: ExecutionStep[];
  cornerSteps: ExecutionStep[];
  parityAlgorithm: string;
  parityNote: string;
  parityPosition: 'between_edges_and_corners' | 'after_corners';
  notes: string[];
};

export const EDGE_FACELETS = [
  [5, 10], [7, 19], [3, 37], [1, 46],
  [32, 16], [28, 25], [30, 43], [34, 52],
  [23, 12], [21, 41], [50, 39], [48, 14],
] as const;

export const EDGE_LETTERS = [
  ['B', 'M'], ['C', 'I'], ['D', 'E'], ['A', 'Q'],
  ['V', 'O'], ['U', 'K'], ['X', 'G'], ['W', 'S'],
  ['J', 'P'], ['L', 'F'], ['R', 'H'], ['T', 'N'],
] as const;

export const CORNER_FACELETS = [
  [8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
  [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51],
] as const;

export const CORNER_LETTERS = [
  ['C', 'M', 'J'], ['D', 'I', 'F'], ['A', 'E', 'R'], ['B', 'Q', 'N'],
  ['V', 'K', 'P'], ['U', 'G', 'L'], ['X', 'S', 'H'], ['W', 'O', 'T'],
] as const;

export const OP_EDGE_SWAP = "R U R' U' R' F R2 U' R' U' R U R' F'";
export const OP_CORNER_SWAP = "R U' R' U' R U R' F' R U R' U' R' F R";
export const OP_PARITY = "R U' R' U' R U R D R' U' R D' R' U2 R' U'";
export const M2_PARITY = "D' L2 D M2 D' L2 D";
export const THREE_STYLE_PARITY = "R U R' F' R U R' U' R' F R2 U' R'";

const OP_EDGE_SETUP: Record<string, string | null> = {
  A: "Lw2 D' L2", B: null, C: 'Lw2 D L2', D: '',
  E: "L Dw' L", F: "Dw' L", G: "L' Dw' L", H: "Dw L'",
  I: "Lw D' L2", J: 'Dw2 L', K: 'Lw D L2', L: "L'",
  M: null, N: 'Dw L', O: "D2 L' Dw' L", P: "Dw' L'",
  Q: "Lw' D L2", R: 'L', S: "Lw' D' L2", T: "Dw2 L'",
  U: "D' L2", V: 'D2 L2', W: 'D L2', X: 'L2',
};

const OP_CORNER_SETUP: Record<string, string | null> = {
  A: null, B: 'R2', C: 'F2', D: 'F2',
  E: null, F: "F' D", G: "F'", H: "D' R",
  I: "F R'", J: "R'", K: "F' R'", L: "F2 R'",
  M: 'F', N: "R' F", O: 'R2 F', P: 'R F',
  Q: "R D'", R: null, S: "D F'", T: 'R',
  U: 'D', V: '', W: "D'", X: 'D2',
};

const M2_SETUP: Record<string, string | null> = {
  A: '', B: "R U R' U'", C: null, D: "L' U' L U",
  E: "B L' B'", F: "B L2 B'", G: "B L B'", H: "L B L' B'",
  I: null, J: "U R U'", K: null, L: "U' L' U",
  M: "B' R B", N: "R' B' R B", O: "B' R' B", P: "B' R2 B",
  Q: null, R: "U' L U", S: null, T: "U R' U'",
  U: null, V: "U R2 U'", W: null, X: "U' L2 U",
};

const M2_SPECIAL: Record<string, string> = {
  A: 'M2',
  C: "U2 M' U2 M'",
  I: "D M' U R2 U' M U R2 U' D' M2",
  Q: "U B' R U' B M2 B' U R' B U'",
  S: "M2 D U R2 U' M' U R2 U' M D'",
  W: 'M U2 M U2',
};

const M2_OPPOSITE: Record<string, string> = { C: 'W', W: 'C', I: 'S', S: 'I' };

const THREE_STYLE_EDGE_ALGS: Record<string, string> = {
  BD: "M2 U M U2 M' U M2",
  DB: "M2 U' M U2 M' U' M2",
  BE: "S' L F' L' S L F L'",
  EB: "L F' L' S' L F L' S",
  MD: "R' F R S R' F' R S'",
  DM: "S R' F R S' R' F' R",
  ME: "M U' M' U2 M U' M'",
  EM: "M U M' U2 M U M'",
  BA: "R2 U' R2 S R2 S' U R2",
  AB: "R2 U' S R2 S' R2 U R2",
  BQ: "r' U' R U M' U' R' U R",
  QB: "R' U' R U M U' R' U r",
  MA: "S U' R2 S R2 S' U S'",
  AM: "S U' S R2 S' R2 U S'",
  MQ: "R U R' U' M' U R U' r'",
  QM: "r U R' U' M U R U' R'",
  AD: "L2 U S' L2 S L2 U' L2",
  DA: "L2 U L2 S' L2 S U' L2",
  AE: "U' M U' M' U2 M U' M' U",
  EA: "U' M U M' U2 M U M' U",
  QD: "L U L' U' M U L U' l'",
  DQ: "l U L' U' M' U L U' L'",
  QE: "l' U' L U M U' L' U L",
  EQ: "L' U' L U M' U' L' U l",
};

const THREE_STYLE_CORNER_ALGS: Record<string, string> = {
  AX: "R' U' D' R2 U' R' D R U R' D' R' U D R",
  XA: "R' U' D' R D R U' R' D' R U R2 U D R",
  AS: "U' D' R D R' U2 R D' R' U' D",
  SA: "U D' R D R' U2 R D' R' U D",
  AH: "U' R D' R' U2 R D R' U'",
  HA: "U R D' R' U2 R D R' U",
  EX: "R2 D' R' U R D R' U' R'",
  XE: "R U R D' R' U' R D R2",
  ES: "U D R' U' R' D R U R' D' R2 U' D'",
  SE: "U D R2 D R U' R' D' R U R U' D'",
  EH: "R D' R D R' U R D' R' U' D R'",
  HE: "R U D' R D R' U' R D' R' D R'",
  RX: "R2 U D' R' U' R D R' U R U' R2",
  XR: "R2 U R' U' R D' R' U R U' D R2",
  RS: "U' R' U' R D' R' U' R D R' U2 R U",
  SR: "U' R' U2 R D' R' U R D R' U R U",
  RH: "U2 R U R D' R' U' R D R2 U2",
  HR: "U2 R2 D' R' U R D R' U' R' U2",
};

export function formatPairs(letters: readonly string[]): string {
  if (!letters.length) return '(none)';
  const pairs: string[] = [];
  for (let i = 0; i < letters.length; i += 2) {
    pairs.push(letters.slice(i, i + 2).join(''));
  }
  return pairs.join(' ');
}

export function analyzeBlind(state: string, mode: string): BlindResult {
  const key = mode.toLowerCase().replace(/[ -]/g, '_');
  if (key === 'old_pochmann' || key === 'op') return oldPochmann(state);
  if (key === 'm2') return m2(state);
  if (key === '3_cycle' || key === 'three_cycle' || key === '3cycle') return threeCycle(state);
  throw new Error(`Unknown blind solving mode: ${mode}`);
}

function oldPochmann(state: string): BlindResult {
  const edges = traceEdges(state, 'B', new Set(['B', 'M']));
  const corners = traceCorners(state, 'E', new Set(['A', 'E', 'R']));
  const parity = edges.letters.length % 2 === 1;
  return {
    mode: 'Old Pochmann',
    edgeBuffer: 'UR / B-M; target UL / D',
    cornerBuffer: 'LBU / A-E-R; target DFR / V',
    edges,
    corners,
    edgeSteps: edges.letters.map((letter) => setupSwapStep(letter, OP_EDGE_SETUP, OP_EDGE_SWAP, 'OP edge')),
    cornerSteps: corners.letters.map((letter) => setupSwapStep(letter, OP_CORNER_SETUP, OP_CORNER_SWAP, 'OP corner')),
    parityAlgorithm: parity ? OP_PARITY : '',
    parityNote: parity ? 'yes; run parity between edges and corners' : 'none',
    parityPosition: 'between_edges_and_corners',
    notes: [
      'Old Pochmann executes one memo letter at a time: setup, swap, undo setup.',
      'Cycle breaks are valid even when they differ from another tutorial example.',
    ],
  };
}

function m2(state: string): BlindResult {
  const edges = traceEdges(state, 'U', new Set(['U', 'K']));
  const corners = traceCorners(state, 'E', new Set(['A', 'E', 'R']));
  const parity = edges.letters.length % 2 === 1;
  return {
    mode: 'M2 edges + Old Pochmann corners',
    edgeBuffer: 'DF / U-K; M2 target UB / A',
    cornerBuffer: 'LBU / A-E-R; target DFR / V',
    edges,
    corners,
    edgeSteps: m2EdgeSteps(edges.letters),
    cornerSteps: corners.letters.map((letter) => setupSwapStep(letter, OP_CORNER_SETUP, OP_CORNER_SWAP, 'OP corner')),
    parityAlgorithm: parity ? M2_PARITY : '',
    parityNote: parity ? 'yes; run M2 parity between edges and corners' : 'none',
    parityPosition: 'between_edges_and_corners',
    notes: [
      'For M2 special letters C/W and I/S, the second letter in a pair uses its opposite case.',
      'Corners remain Old Pochmann in this mode.',
    ],
  };
}

function threeCycle(state: string): BlindResult {
  const edges = traceEdges(state, 'C', new Set(['C', 'I']));
  const corners = traceCorners(state, 'C', new Set(['C', 'J', 'M']));
  const parity = edges.letters.length % 2 === 1;
  const edgeLetters = parity ? [...edges.letters, 'B'] : edges.letters;
  const cornerLetters = parity ? [...corners.letters, 'B'] : corners.letters;
  return {
    mode: '3-Cycle / 3-Style trainer',
    edgeBuffer: 'UF / C-I',
    cornerBuffer: 'UFR / C-J-M',
    edges,
    corners,
    edgeSteps: threeCycleSteps(edgeLetters, THREE_STYLE_EDGE_ALGS, 'edge'),
    cornerSteps: threeCycleSteps(cornerLetters, THREE_STYLE_CORNER_ALGS, 'corner'),
    parityAlgorithm: parity ? THREE_STYLE_PARITY : '',
    parityNote: parity ? 'yes; B target appended for pair execution' : 'none',
    parityPosition: 'after_corners',
    notes: [
      '3-cycle execution is shown as letter pairs: cycle buffer -> first -> second.',
      'Only the built-in beginner top-layer 3-style pairs include direct algorithms; other pairs are marked for setup/commutator practice.',
    ],
  };
}

function traceEdges(state: string, bufferStart: string, bufferPiece: Set<string>): MemoTrace {
  return trace(occupants(state, EDGE_FACELETS, EDGE_LETTERS), bufferStart, bufferPiece);
}

function traceCorners(state: string, bufferStart: string, bufferPiece: Set<string>): MemoTrace {
  return trace(occupants(state, CORNER_FACELETS, CORNER_LETTERS), bufferStart, bufferPiece);
}

function occupants(
  state: string,
  facelets: readonly (readonly number[])[],
  letters: readonly (readonly string[])[],
): { occupant: Record<string, string>; pieceLetters: Record<string, Set<string>> } {
  const occupant: Record<string, string> = {};
  const pieceLetters: Record<string, Set<string>> = {};
  const colorToPiece = new Map<string, number>();
  facelets.forEach((pieceFacelets, idx) => {
    colorToPiece.set(pieceFacelets.map((facelet) => SOLVED_STATE.charAt(facelet)).sort().join(''), idx);
  });

  facelets.forEach((currentFacelets, position) => {
    const colors = currentFacelets.map((facelet) => state.charAt(facelet));
    const pieceIdx = colorToPiece.get(colors.slice().sort().join(''));
    if (pieceIdx === undefined) throw new Error(`Invalid cubie colors: ${colors.join('')}`);
    const colorToLetter: Record<string, string> = {};
    const solvedFacelets = facelets[pieceIdx];
    const solvedLetters = letters[pieceIdx];
    if (!solvedFacelets || !solvedLetters) throw new Error(`Invalid cubie index: ${pieceIdx}`);
    solvedFacelets.forEach((facelet, idx) => {
      const color = SOLVED_STATE.charAt(facelet);
      const letter = solvedLetters[idx];
      if (letter) colorToLetter[color] = letter;
    });
    const positionLetters = letters[position];
    if (!positionLetters) throw new Error(`Invalid cubie position: ${position}`);
    positionLetters.forEach((letter, idx) => {
      const color = colors[idx];
      if (!color) throw new Error(`Missing color for ${letter}`);
      occupant[letter] = colorToLetter[color] ?? letter;
    });
  });

  letters.forEach((piece) => {
    const set = new Set(piece);
    piece.forEach((letter) => {
      pieceLetters[letter] = set;
    });
  });

  return { occupant, pieceLetters };
}

function trace(
  maps: { occupant: Record<string, string>; pieceLetters: Record<string, Set<string>> },
  bufferStart: string,
  bufferPiece: Set<string>,
): MemoTrace {
  const memo: string[] = [];
  const cycles: string[][] = [];
  const visited = new Set(bufferPiece);
  const first = traceFromBuffer(maps, bufferStart, bufferPiece, visited);
  if (first.length) {
    memo.push(...first);
    cycles.push(first);
  }

  LETTERS.forEach((start) => {
    if (visited.has(start)) return;
    const piece = maps.pieceLetters[start];
    if (!piece) return;
    if ([...piece].every((letter) => maps.occupant[letter] === letter)) {
      piece.forEach((letter) => visited.add(letter));
      return;
    }
    const cycle = traceNewCycle(maps, start, visited);
    memo.push(...cycle);
    cycles.push(cycle);
  });

  return {
    letters: memo,
    cycles,
    text: memo.join(''),
    pairs: memo.reduce<string[]>((acc, _, idx) => {
      if (idx % 2 === 0) acc.push(memo.slice(idx, idx + 2).join(''));
      return acc;
    }, []),
  };
}

function traceFromBuffer(
  maps: { occupant: Record<string, string>; pieceLetters: Record<string, Set<string>> },
  currentStart: string,
  bufferPiece: Set<string>,
  visited: Set<string>,
): string[] {
  const cycle: string[] = [];
  let current = currentStart;
  while (true) {
    const target = maps.occupant[current];
    if (!target || bufferPiece.has(target)) return cycle;
    cycle.push(target);
    maps.pieceLetters[target]?.forEach((letter) => visited.add(letter));
    current = target;
  }
}

function traceNewCycle(
  maps: { occupant: Record<string, string>; pieceLetters: Record<string, Set<string>> },
  start: string,
  visited: Set<string>,
): string[] {
  const startPiece = maps.pieceLetters[start];
  if (!startPiece) return [];
  startPiece.forEach((letter) => visited.add(letter));
  const cycle = [start];
  let current = start;
  while (true) {
    const target = maps.occupant[current];
    if (!target) return cycle;
    cycle.push(target);
    maps.pieceLetters[target]?.forEach((letter) => visited.add(letter));
    if (startPiece.has(target)) return cycle;
    current = target;
  }
}

function m2EdgeSteps(letters: readonly string[]): ExecutionStep[] {
  return letters.map((letter, idx) => {
    const effective = idx % 2 === 1 ? M2_OPPOSITE[letter] ?? letter : letter;
    if (letter === 'K' || letter === 'U') {
      return step(letter, '(buffer piece)', 'choose a cycle break instead', '', '(buffer piece)', '');
    }
    const special = M2_SPECIAL[effective];
    if (special) {
      const note = effective === letter ? 'special case' : `special case as ${effective}; second letter in pair`;
      return step(letter, special, note, '', special, '');
    }
    return executionStep(letter, M2_SETUP[effective] ?? '', 'M2', 'setup, M2, undo');
  });
}

function threeCycleSteps(
  letters: readonly string[],
  algorithms: Record<string, string>,
  pieceType: string,
): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  for (let idx = 0; idx < letters.length; idx += 2) {
    const pair = letters.slice(idx, idx + 2).join('');
    if (pair.length === 1) {
      steps.push(step(pair, '(unpaired target)', 'needs parity/cycle break', '', '(unpaired target)', ''));
      continue;
    }
    const algorithm = algorithms[pair] ?? `Cycle buffer -> ${pair.charAt(0)} -> ${pair.charAt(1)}`;
    const note = algorithms[pair] ? 'direct built-in 3-cycle algorithm' : `use setup/commutator for this ${pieceType} pair`;
    steps.push(step(pair, algorithm, note, '', algorithm, ''));
  }
  return steps;
}

function setupSwapStep(
  letter: string,
  setupTable: Record<string, string | null>,
  swap: string,
  label: string,
): ExecutionStep {
  const setup = setupTable[letter];
  if (setup === null) return step(letter, '(buffer piece)', 'choose a cycle break instead', '', '(buffer piece)', '');
  return executionStep(letter, setup ?? '', swap, `${label}: setup, swap, undo`);
}

function executionStep(label: string, setup: string, core: string, note: string): ExecutionStep {
  const normalizedSetup = setup.trim();
  const undo = normalizedSetup ? invertSequence(normalizedSetup) : '';
  const algorithm = [normalizedSetup, core, undo].filter(Boolean).join('  ');
  return step(label, algorithm, note, normalizedSetup, core, undo);
}

function step(label: string, algorithm: string, note: string, setup: string, core: string, undo: string): ExecutionStep {
  return { label, algorithm, note, setup, core, undo };
}

function invertSequence(sequence: string): string {
  return sequence.split(/\s+/).reverse().map(invertMove).join(' ');
}

function invertMove(move: string): string {
  if (move.endsWith('2')) return move;
  if (move.endsWith("'")) return move.slice(0, -1);
  return `${move}'`;
}
