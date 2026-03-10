import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { cloneGrid, generate4x4Puzzle, normalizeGridFromJson, validate4x4Grid } from './sudoku'
import type { Grid4x4 } from './sudoku'

type GameStatus = 'playing' | 'won' | 'invalid'

const PUZZLE_DURATION_SECONDS = 600

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
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'api' | 'generated' | null>(null)
  const [apiUrlInput, setApiUrlInput] = useState('')
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      const search = new URLSearchParams(window.location.search)
      const queryUrl = search.get('puzzleUrl') ?? search.get('puzzle_url')
      const envUrl = (import.meta.env.VITE_PUZZLE_API_URL as string | undefined) ?? undefined
      const url = queryUrl || envUrl

      if (url) {
        try {
          setLoading(true)
          setError(null)
          setStatus('playing')
          const res = await fetch(url)
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`)
          }
          const json = await res.json()
          const normalized = normalizeGridFromJson(json)
          if (!normalized) {
            throw new Error('Could not normalize puzzle JSON into a 9×9 grid')
          }
          if (cancelled) return
          setInitialGrid(cloneGrid(normalized))
          setGrid(cloneGrid(normalized))
          setSource('api')
          setRemainingSeconds(PUZZLE_DURATION_SECONDS)
          setTimerRunning(true)
          return
        } catch (e) {
          console.error('Failed to load puzzle from API, falling back to generator.', e)
          if (!cancelled) {
            setError('Failed to load puzzle from API; using local generator instead.')
          }
        }
      }

      const { puzzle } = generate4x4Puzzle()
      if (!cancelled) {
        setInitialGrid(cloneGrid(puzzle))
        setGrid(cloneGrid(puzzle))
        setSource('generated')
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

  const handleReset = () => {
    if (!initialGrid) return
    setGrid(cloneGrid(initialGrid))
    setStatus('playing')
    setRemainingSeconds(PUZZLE_DURATION_SECONDS)
    setTimerRunning(true)
  }

  const handleLoadGenerated = () => {
    const { puzzle } = generate4x4Puzzle()
    setInitialGrid(cloneGrid(puzzle))
    setGrid(cloneGrid(puzzle))
    setSource('generated')
    setStatus('playing')
    setError(null)
    setRemainingSeconds(PUZZLE_DURATION_SECONDS)
    setTimerRunning(true)
  }

  const handleLoadFromApi = async () => {
    const url = apiUrlInput.trim()
    if (!url) return
    try {
      setLoading(true)
      setError(null)
      setStatus('playing')
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      const normalized = normalizeGridFromJson(json)
      if (!normalized) {
        throw new Error('Could not normalize puzzle JSON into a 9×9 grid')
      }
      setInitialGrid(cloneGrid(normalized))
      setGrid(cloneGrid(normalized))
      setSource('api')
      setRemainingSeconds(PUZZLE_DURATION_SECONDS)
      setTimerRunning(true)
    } catch (e) {
      console.error('Failed to load puzzle from API.', e)
      setError('Failed to load puzzle from API. Check the URL and JSON shape.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>ZK Sudoku (9×9 prototype)</h1>
  
      </header>

      {!isReady ? (
        <div className="app-loading">
          {loading ? 'Preparing your puzzle…' : error ?? 'Unable to prepare puzzle.'}
        </div>
      ) : (
        <main className="app-main">
          <section className="sudoku-card">
            <div className="sudoku-header">
              <h2>9×9 Sudoku</h2>
              <p>Fill the grid with numbers 1–9 so that each row, column, and 3×3 box contains each number once.</p>
            </div>

            <div className="sudoku-controls">
              <div className="sudoku-controls-row">
                <button type="button" onClick={handleLoadGenerated} disabled={loading}>
                  New generated puzzle
                </button>
                  <span
                  className="sudoku-controls-hint"
                  title={
                    'Expected JSON: either a 9×9 2D array like [[0,0,3,...], ...] where 0/null/"" = empty, ' +
                    'or an object with a 9×9 array on one of { "puzzle", "grid", "board" }. ' +
                    'Values 1–9 are treated as filled cells.'
                  }
                >
                  or load from an API returning a 2D array / wrapped puzzle
                </span>
              </div>
              <div className="sudoku-controls-row">
                <input
                  type="text"
                  placeholder="https://example.com/puzzle.json"
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  className="sudoku-api-input"
                />
                <button type="button" onClick={handleLoadFromApi} disabled={loading || !apiUrlInput.trim()}>
                  Load API puzzle
                </button>
              </div>
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
              {status === 'won' && <span className="status-won">Perfect! This grid would pass zk verification.</span>}
              {remainingSeconds !== null && (
                <div className="sudoku-timer">
                  Time left: {formatSeconds(remainingSeconds)}
                  {remainingSeconds <= 15 && remainingSeconds > 0 && (
                    <span className="sudoku-timer-warning"> – hurry up!</span>
                  )}
                  {remainingSeconds === 0 && <span className="sudoku-timer-expired"> – expired</span>}
                </div>
              )}
              {source && (
                <div className="sudoku-source">
                  Puzzle source:{' '}
                  <strong>{source === 'api' ? 'external API (normalized 4×4 grid)' : 'local generator'}</strong>
                  {error && <span className="sudoku-source-error"> – {error}</span>}
                </div>
              )}
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

export default App
