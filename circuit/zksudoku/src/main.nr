// ZK Sudoku circuit: prove solution is valid without revealing it.
// - Puzzle (public): 9x9 grid with 0 = empty, 1-9 = given clues.
// - Solution (private): 9x9 grid with 1-9; must match puzzle on clues and be valid Sudoku.

fn main(puzzle: pub [[u8; 9]; 9], solution: [[u8; 9]; 9]) {
    // 1. Solution must not change any non-zero puzzle cell
    for i in 0..9 {
        for j in 0..9 {
            let is_clue = puzzle[i][j] != 0;
            // If clue, solution must equal puzzle; constraint: is_clue => (solution[i][j] == puzzle[i][j])
            let same = solution[i][j] == puzzle[i][j];
            let clue_ok = if is_clue { same } else { true };
            assert(clue_ok);
        }
    }

    // 2. Validate each row: digits 1-9 each appear exactly once
    for i in 0..9 {
        let row = [
            solution[i][0],
            solution[i][1],
            solution[i][2],
            solution[i][3],
            solution[i][4],
            solution[i][5],
            solution[i][6],
            solution[i][7],
            solution[i][8],
        ];
        assert(is_valid_set(row));
    }

    // 3. Validate each column
    for j in 0..9 {
        let col = [
            solution[0][j],
            solution[1][j],
            solution[2][j],
            solution[3][j],
            solution[4][j],
            solution[5][j],
            solution[6][j],
            solution[7][j],
            solution[8][j],
        ];
        assert(is_valid_set(col));
    }

    // 4. Validate each 3x3 box (grid)
    for br in 0..3 {
        for bc in 0..3 {
            let r = br * 3;
            let c = bc * 3;
            let box_cells = [
                solution[r][c],
                solution[r][c + 1],
                solution[r][c + 2],
                solution[r + 1][c],
                solution[r + 1][c + 1],
                solution[r + 1][c + 2],
                solution[r + 2][c],
                solution[r + 2][c + 1],
                solution[r + 2][c + 2],
            ];
            assert(is_valid_set(box_cells));
        }
    }
}

/// Checks that the 9 elements are exactly {1,2,...,9} (each once), hashset style.
fn is_valid_set(arr: [u8; 9]) -> bool {
    for d in 1..=9 {
        let count = count_eq(arr, d);
        assert(count == 1);
    }
    true
}

fn count_eq(arr: [u8; 9], val: u8) -> u8 {
    let mut c = 0u8;
    for i in 0..9 {
        c = c + (if arr[i] == val { 1u8 } else { 0u8 });
    }
    c
}

#[test]
fn test_valid_sudoku() {
    let puzzle: [[u8; 9]; 9] = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ];
    let solution: [[u8; 9]; 9] = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ];
    main(puzzle, solution);
}

// Circuit rejects solutions that change any clue (non-zero puzzle cell) or that
// have duplicate digits in a row, column, or 3x3 box.
