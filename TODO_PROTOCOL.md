# ZK Sudoku Protocol – Future TODOs

This file tracks the on-chain and zero-knowledge features that will be added on top of the current 4×4 Sudoku prototype.

## High-level flow

1. Admin publishes a puzzle reference (ID + metadata) to a smart contract, including:
   - API endpoint or IPFS link where the puzzle/solution commitments can be fetched
   - entry fee and reward amount
   - time limit per attempt
2. Player pays entry fee to join a puzzle instance.
3. Frontend fetches the puzzle data from the off-chain API link stored in the contract.
4. Player solves the puzzle in the UI within the enforced time limit.
5. Frontend generates a zero-knowledge proof that:
   - the submitted solution satisfies Sudoku rules, and
   - it matches the commitment associated with the puzzle ID.
6. Frontend submits proof + puzzle ID + relevant public inputs to a verifier contract.
7. Verifier contract validates the proof and:
   - pays out reward if valid and within time/attempt constraints
   - records attempt outcome on-chain for transparency.

## Concrete tasks

- **Smart contracts**
  - Define `SudokuGame` contract to store:
    - puzzle ID → puzzle metadata (API URL / IPFS CID, difficulty, reward, time limit, status)
    - entry fee, treasury address, admin role
  - Implement functions:
    - `addPuzzle(puzzleId, uri, reward, timeLimit)` – admin only
    - `joinPuzzle(puzzleId)` – payable, records player participation
    - `submitProof(puzzleId, proof, publicInputs)` – verifies proof and triggers payout
  - Integrate with an on-chain verifier contract (Groth16/Plonk/etc.).

- **ZK circuits**
  - Design a 4×4 Sudoku circuit (later 9×9) that:
    - enforces Sudoku constraints (rows, columns, sub-grids)
    - binds solution to a puzzle commitment
  - Choose a proving system (e.g. Groth16, Plonk) and tooling (e.g. circom, halo2, arkworks).
  - Implement trusted setup or setup ceremony if using a system that requires it.
  - Produce verifier contract artifacts for the chosen L1/L2.

- **Frontend ↔ chain integration**
  - Integrate a wallet connector (e.g. wagmi/rainbowkit/viem, ethers, web3modal).
  - Add flow to:
    - read available puzzles and their metadata from `SudokuGame` contract
    - trigger `joinPuzzle` (entry fee payment) before enabling the puzzle UI
    - start a countdown timer aligned with `timeLimit`
  - After local validation passes, build public inputs and proof from the user’s solution.
  - Call `submitProof` with the generated proof and puzzle ID.

- **Security and UX**
  - Prevent replay of proofs across puzzles or multiple reward claims.
  - Add server-side or contract-side limits on attempts per puzzle/user.
  - Provide clear, privacy-preserving UX:
    - communicate that the solution is never revealed, only the proof.
  - Add robust error handling around on-chain transactions and proof generation failures.

