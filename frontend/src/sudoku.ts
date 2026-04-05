export type CellValue = number | null;

export type Grid4x4 = CellValue[][];

const GRID_SIZE = 9;
const BOX_SIZE = 3;

const SYMBOLS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function createEmptyGrid(): Grid4x4 {
  return Array.from({ length: GRID_SIZE }, () =>
    Array<CellValue>(GRID_SIZE).fill(null),
  );
}

function isValidPlacement(
  grid: Grid4x4,
  row: number,
  col: number,
  value: number,
): boolean {
  for (let c = 0; c < GRID_SIZE; c++) {
    if (grid[row][c] === value) return false;
  }

  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r][col] === value) return false;
  }

  const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = startRow; r < startRow + BOX_SIZE; r++) {
    for (let c = startCol; c < startCol + BOX_SIZE; c++) {
      if (grid[r][c] === value) return false;
    }
  }

  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

function solveGrid(grid: Grid4x4): boolean {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === null) {
        for (const value of shuffle([...SYMBOLS])) {
          if (isValidPlacement(grid, row, col, value)) {
            grid[row][col] = value;
            if (solveGrid(grid)) {
              return true;
            }
            grid[row][col] = null;
          }
        }
        return false;
      }
    }
  }
  return true;
}

export interface GeneratedPuzzle {
  puzzle: Grid4x4;
  solution: Grid4x4;
}

/** Fewer empty cells ⇒ easier (better for live demos). */
export type DemoDifficulty = "easy" | "medium" | "hard";

const REMOVED_CELLS_FOR_DEMO: Record<DemoDifficulty, number> = {
  easy: 3,
  medium: 45,
  hard: 52,
};

export function generateDemoPuzzle(
  difficulty: DemoDifficulty,
): GeneratedPuzzle {
  return generate4x4Puzzle(REMOVED_CELLS_FOR_DEMO[difficulty]);
}

export function generate4x4Puzzle(removedCells = 45): GeneratedPuzzle {
  const solution = createEmptyGrid();
  solveGrid(solution);

  const puzzle: Grid4x4 = solution.map((row) => [...row]);

  const positions: Array<[number, number]> = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      positions.push([r, c]);
    }
  }

  for (const [row, col] of shuffle(positions).slice(0, removedCells)) {
    puzzle[row][col] = null;
  }

  return {
    puzzle,
    solution: solution.map((row) => [...row]),
  };
}

export interface ValidationResult {
  complete: boolean;
  valid: boolean;
  errors: { type: "row" | "column" | "box"; index: number }[];
}

export function validate4x4Grid(grid: Grid4x4): ValidationResult {
  const errors: ValidationResult["errors"] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    const seen = new Set<number>();
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = grid[r][c];
      if (v == null) continue;
      if (seen.has(v)) {
        errors.push({ type: "row", index: r });
        break;
      }
      seen.add(v);
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    const seen = new Set<number>();
    for (let r = 0; r < GRID_SIZE; r++) {
      const v = grid[r][c];
      if (v == null) continue;
      if (seen.has(v)) {
        errors.push({ type: "column", index: c });
        break;
      }
      seen.add(v);
    }
  }

  for (let boxRow = 0; boxRow < BOX_SIZE; boxRow++) {
    for (let boxCol = 0; boxCol < BOX_SIZE; boxCol++) {
      const seen = new Set<number>();
      let hasError = false;
      const startRow = boxRow * BOX_SIZE;
      const startCol = boxCol * BOX_SIZE;
      for (let r = startRow; r < startRow + BOX_SIZE; r++) {
        for (let c = startCol; c < startCol + BOX_SIZE; c++) {
          const v = grid[r][c];
          if (v == null) continue;
          if (seen.has(v)) {
            hasError = true;
            break;
          }
          seen.add(v);
        }
        if (hasError) break;
      }
      if (hasError) {
        const boxIndex = boxRow * BOX_SIZE + boxCol;
        errors.push({ type: "box", index: boxIndex });
      }
    }
  }

  const complete = grid.every((row) => row.every((cell) => cell != null));
  const valid = errors.length === 0 && complete;

  return { complete, valid, errors };
}

export function cloneGrid(grid: Grid4x4): Grid4x4 {
  return grid.map((row) => [...row]);
}

function toCellValue(raw: unknown): CellValue {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= GRID_SIZE) return n;
  return null;
}

/**
 * Try to normalize an arbitrary JSON payload into a 9×9 Grid4x4.
 *
 * Accepted shapes:
 * - 2D array: number[][] | (number | null | string)[][]
 * - Object with a 2D array on `puzzle`, `grid`, or `board`.
 */
export function normalizeGridFromJson(json: unknown): Grid4x4 | null {
  let candidate: unknown;

  if (Array.isArray(json)) {
    candidate = json;
  } else if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    candidate = obj.puzzle ?? obj.grid ?? obj.board;
  } else {
    return null;
  }

  if (!Array.isArray(candidate)) return null;

  const rows = candidate.slice(0, GRID_SIZE);
  if (rows.length === 0) return null;

  const grid: Grid4x4 = Array.from({ length: GRID_SIZE }, () =>
    Array<CellValue>(GRID_SIZE).fill(null),
  );

  for (let r = 0; r < GRID_SIZE; r++) {
    const row = (rows[r] ?? []) as unknown[];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[r][c] = toCellValue(row[c]);
    }
  }

  return grid;
}
