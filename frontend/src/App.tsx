import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { proveSudokuInBrowser } from './noir/zkSudoku'
import { cloneGrid, generateDemoPuzzle, validate4x4Grid } from './sudoku'
import type { DemoDifficulty, Grid4x4 } from './sudoku'

type GameStatus = 'playing' | 'won' | 'invalid'

const PUZZLE_DURATION_SECONDS = 600

/** First puzzle when using the local generator (matches default difficulty control). */
const INITIAL_DEMO_DIFFICULTY: DemoDifficulty = 'easy'

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(1, '0')}:${s.toString().padStart(2, '0')}`
}

function App() {
  const [initialGrid, setInitialGrid] = useState<Grid4x4 | null>(null)
  const [grid, setGrid] = useState<Grid4x4 | null>(null)
  const [status, setStatus] = useState<GameStatus>('playing')
  const [loading, setLoading] = useState(true)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [zkBusy, setZkBusy] = useState(false)
  const [zkMessage, setZkMessage] = useState<string | null>(null)
  const [zkError, setZkError] = useState<string | null>(null)
  const [generatorDifficulty, setGeneratorDifficulty] = useState<DemoDifficulty>(INITIAL_DEMO_DIFFICULTY)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      // Load puzzle from URL / API (disabled for demo UI — restore if needed):
      // const search = new URLSearchParams(window.location.search)
      // const queryUrl = search.get('puzzleUrl') ?? search.get('puzzle_url')
      // const envUrl = (import.meta.env.VITE_PUZZLE_API_URL as string | undefined) ?? undefined
      // const url = queryUrl || envUrl
      // if (url) { ... fetch + normalizeGridFromJson ... }

      const { puzzle } = generateDemoPuzzle(INITIAL_DEMO_DIFFICULTY)
      if (!cancelled) {
        setInitialGrid(cloneGrid(puzzle))
        setGrid(cloneGrid(puzzle))
        setRemainingSeconds(PUZZLE_DURATION_SECONDS)
        setTimerRunning(true)
      }
    }

    void bootstrap().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const isReady = useMemo(() => !loading && grid !== null && initialGrid !== null, [loading, grid, initialGrid])
  const timeUp = useMemo(() => remainingSeconds === 0, [remainingSeconds])

  useEffect(() => {
    if (!timerRunning || remainingSeconds === null || remainingSeconds <= 0) return

    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return prev
        const next = prev - 1
        if (next <= 0) {
          setTimerRunning(false)
          if (status !== 'won') {
            setStatus('invalid')
          }
          return 0
        }
        return next
      })
    }, 1000)

    return () => {
      window.clearInterval(id)
    }
  }, [timerRunning, remainingSeconds, status])

  const handleChange = (row: number, col: number, value: string) => {
    if (!grid || !initialGrid) return
    if (initialGrid[row][col] !== null) return
    if (timeUp) return

    const next = cloneGrid(grid)
    const numeric = Number(value)

    if (!value) {
      next[row][col] = null
    } else if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 9) {
      next[row][col] = numeric
    } else {
      return
    }

    setGrid(next)
    setStatus('playing')
  }

  const handleCheck = () => {
    if (!grid || timeUp) return
    const result = validate4x4Grid(grid)
    if (result.valid && result.complete) {
      setStatus('won')
    } else {
      setStatus('invalid')
    }
  }

  const handleZkProof = async () => {
    if (!grid || !initialGrid || timeUp || zkBusy) return
    const result = validate4x4Grid(grid)
    if (!result.complete) {
      setZkError('Fill every cell before generating a proof.')
      setZkMessage(null)
      return
    }
    setZkBusy(true)
    setZkError(null)
    setZkMessage(null)
    try {
      const { publicInputs, proofByteLength, locallyVerified } = await proveSudokuInBrowser(initialGrid, grid)
      setZkMessage(
        `Proof generated (${proofByteLength} bytes). Local verifier: ${locallyVerified ? 'accepted' : 'rejected'}. ` +
          `Public inputs: ${publicInputs.length} field(s).`,
      )
    } catch (e) {
      console.error('ZK proof failed', e)
      setZkError(e instanceof Error ? e.message : 'Proof generation failed.')
    } finally {
      setZkBusy(false)
    }
  }

  const handleReset = () => {
    if (!initialGrid) return
    setGrid(cloneGrid(initialGrid))
    setStatus('playing')
    setRemainingSeconds(PUZZLE_DURATION_SECONDS)
    setTimerRunning(true)
  }

  const handleLoadGenerated = () => {
    const { puzzle } = generateDemoPuzzle(generatorDifficulty)
    setInitialGrid(cloneGrid(puzzle))
    setGrid(cloneGrid(puzzle))
    setStatus('playing')
    setRemainingSeconds(PUZZLE_DURATION_SECONDS)
    setTimerRunning(true)
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>ZK Sudoku (9×9 prototype)</h1>
  
      </header>

      {!isReady ? (
        <div className="app-loading">
          {loading ? 'Preparing your puzzle…' : 'Unable to prepare puzzle.'}
        </div>
      ) : (
        <main className="app-main">
          <section className="sudoku-card">
            <div className="sudoku-header">
              <h2>9×9 Sudoku</h2>
              <p>Fill the grid with numbers 1–9 so that each row, column, and 3×3 box contains each number once.</p>
            </div>

            <div className="sudoku-controls">
              <div className="sudoku-controls-row sudoku-difficulty-row">
                <label className="sudoku-difficulty">
                  <span className="sudoku-difficulty-label">Generated difficulty</span>
                  <select
                    className="sudoku-difficulty-select"
                    value={generatorDifficulty}
                    onChange={(e) => setGeneratorDifficulty(e.target.value as DemoDifficulty)}
                    aria-label="Difficulty for locally generated puzzles"
                  >
                    <option value="easy">Easy (demo)</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <span
                  className="sudoku-difficulty-hint"
                  title="Easy removes only 10 cells from a full grid (71 clues) for quick demos."
                >
                  Easy = only 10 blanks
                </span>
              </div>
              <div className="sudoku-controls-row">
                <button type="button" onClick={handleLoadGenerated} disabled={loading}>
                  New generated puzzle
                </button>
              </div>
              {/*
              Load puzzle from API (restore with normalizeGridFromJson + fetch handler):
              <div className="sudoku-controls-row">
                <span className="sudoku-controls-hint" title="...">or load from an API ...</span>
              </div>
              <div className="sudoku-controls-row">
                <input type="text" className="sudoku-api-input" ... />
                <button type="button">Load API puzzle</button>
              </div>
              */}
            </div>

            <div className="sudoku-grid">
              {grid!.map((row, r) => (
                <div key={r} className="sudoku-row">
                  {row.map((cell, c) => {
                    const isFixed = initialGrid![r][c] !== null
                    const boxRow = Math.floor(r / 3)
                    const boxCol = Math.floor(c / 3)
                    const isAltBox = (boxRow + boxCol) % 2 === 1
                    return (
                      <input
                        key={`${r}-${c}`}
                        className={`sudoku-cell${isFixed ? ' sudoku-cell-fixed' : ''}${
                          isAltBox ? ' sudoku-cell-alt' : ''
                        }`}
                        value={cell ?? ''}
                        disabled={isFixed || status === 'won' || timeUp}
                        onChange={(e) => handleChange(r, c, e.target.value)}
                        inputMode="numeric"
                        maxLength={1}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="sudoku-actions">
              <button type="button" onClick={handleCheck} disabled={!isReady || status === 'won' || timeUp}>
                Check solution
              </button>
              <button
                type="button"
                onClick={handleZkProof}
                disabled={!isReady || timeUp || zkBusy}
                title="Runs Noir + Barretenberg in the browser (first run may take a while)"
              >
                {zkBusy ? 'Generating ZK proof…' : 'Generate ZK proof'}
              </button>
              <button type="button" onClick={handleReset}>
                Reset puzzle
              </button>
            </div>

            <div className="sudoku-status">
              {status === 'playing' && <span>Fill all cells and click &quot;Check solution&quot;.</span>}
              {status === 'invalid' && (
                <span className="status-invalid">
                  {!timeUp
                    ? 'Not quite right yet. Check for duplicates in rows, columns, and boxes.'
                    : 'Time is up. Reset or load a new puzzle to try again.'}
                </span>
              )}
              {status === 'won' && <span className="status-won">Perfect! You can generate a ZK proof to verify in Noir.</span>}
              {zkMessage && <div className="sudoku-zk-msg">{zkMessage}</div>}
              {zkError && <div className="sudoku-zk-err">{zkError}</div>}
              {remainingSeconds !== null && (
                <div className="sudoku-timer">
                  Time left: {formatSeconds(remainingSeconds)}
                  {remainingSeconds <= 15 && remainingSeconds > 0 && (
                    <span className="sudoku-timer-warning"> – hurry up!</span>
                  )}
                  {remainingSeconds === 0 && <span className="sudoku-timer-expired"> – expired</span>}
                </div>
              )}
              <div className="sudoku-source">
                Puzzle source: <strong>local generator</strong>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

export default App
