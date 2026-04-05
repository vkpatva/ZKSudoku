import { BackendType, Barretenberg, UltraHonkBackend } from '@aztec/bb.js'
import { Noir } from '@noir-lang/noir_js'
import type { CompiledCircuit } from '@noir-lang/types'
import initNoirc from '@noir-lang/noirc_abi'
import initACVM from '@noir-lang/acvm_js'
import acvmWasmUrl from '@noir-lang/acvm_js/web/acvm_js_bg.wasm?url'
import noircWasmUrl from '@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url'

import circuitJson from '../circuits/zksudoku.json'
import type { Grid4x4 } from '../sudoku'

const circuit = circuitJson as CompiledCircuit

let wasmReady: Promise<void> | null = null

function ensureWasmInitialized(): Promise<void> {
  if (!wasmReady) {
    wasmReady = Promise.all([initACVM(fetch(acvmWasmUrl)), initNoirc(fetch(noircWasmUrl))]).then(() => {
      return
    })
  }
  return wasmReady
}

export function gridToCircuitMatrix(grid: Grid4x4): number[][] {
  return grid.map((row) => row.map((cell) => (cell === null ? 0 : cell)))
}

export type ZkProveResult = {
  publicInputs: string[]
  proofByteLength: number
  locallyVerified: boolean
}

/**
 * Execute the Noir Sudoku circuit, generate an UltraHonk proof in-browser, and verify it locally.
 * Puzzle must be the public grid (0 = empty); solution must be a full 9×9 grid consistent with clues.
 */
export async function proveSudokuInBrowser(puzzle: Grid4x4, solution: Grid4x4): Promise<ZkProveResult> {
  await ensureWasmInitialized()

  const puzzleM = gridToCircuitMatrix(puzzle)
  const solutionM = gridToCircuitMatrix(solution)

  const noir = new Noir(circuit)
  // Pick a concrete backend (BackendType.Wasm), never pass `BackendType` (the enum object) — that yields
  // "Unknown backend type: [object Object]" from createAsyncBackend.
  const barretenberg = await Barretenberg.new({ backend: BackendType.Wasm, threads: 1 })
  const backend = new UltraHonkBackend(circuit.bytecode, barretenberg)

  try {
    const { witness } = await noir.execute({ puzzle: puzzleM, solution: solutionM })
    const proofData = await backend.generateProof(witness)
    const locallyVerified = await backend.verifyProof(proofData)
    return {
      publicInputs: proofData.publicInputs,
      proofByteLength: proofData.proof.length,
      locallyVerified,
    }
  } finally {
    await barretenberg.destroy()
  }
}
