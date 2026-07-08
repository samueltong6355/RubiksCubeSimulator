export type CubeState = {
  center: number[];
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
};

export default class Cube {
  constructor(other?: Cube | CubeState);

  static fromString(state: string): Cube;
  static initSolver(): void;
  static inverse(algorithm: string | number[] | number): string | number[] | number;
  static random(): Cube;
  static scramble(): string;

  asString(): string;
  clone(): Cube;
  identity(): this;
  init(state: Cube | CubeState): this;
  isSolved(): boolean;
  move(algorithm: string | number[] | number): this;
  randomize(): this;
  solve(maxDepth?: number): string;
  toJSON(): CubeState;
}
