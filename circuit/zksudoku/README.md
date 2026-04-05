# ZK Sudoku circuit

Noir circuit + Barretenberg backend. Proves knowledge of a valid Sudoku solution for a given puzzle without revealing the solution.

## Build and witness

```bash
nargo compile
nargo execute   # uses Prover.toml; writes target/zksudoku.gz
```

## Prove and verify (Barretenberg)

From the [Barretenberg getting started](https://barretenberg.aztec.network/docs/getting_started/) guide.

**Use `-o target` (output directory = target):**  
Then `bb` writes a single file `target/proof` that has **public inputs + proof** concatenated. That is what `bb verify` expects. Do not use `-o ./target/proof` as the output path; that writes a subfolder with separate `proof` and `public_inputs` files, and verify will fail with an assertion (it expects one combined file).

```bash
bb prove -b ./target/zksudoku.json -w ./target/zksudoku.gz --write_vk -o target
bb verify -p ./target/proof -k ./target/vk
```

## Tests

```bash
nargo test
```
