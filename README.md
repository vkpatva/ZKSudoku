# ZK Sudoku

Monorepo for the ZK Sudoku app and related tooling.

## Frontend (9×9 Sudoku UI)

The web app lives in **`frontend/`**.

```bash
cd frontend
npm install
npm run dev
```

See [frontend/README.md](frontend/README.md) for details.

## Repo layout

- **`frontend/`** – React + Vite app: puzzle UI, generator, validator, API loading, timer
- **`circuit/`** – (future) ZK circuit and verifier
- **`TODO_PROTOCOL.md`** – (in frontend) on-chain and ZK integration plan
