# FoodBridge

Neighbour-to-neighbour food rescue. Vendors post surplus, receivers claim and collect with a pickup code, ratings build a trust score.

- `frontend/` React + Vite (deployed on Vercel)
- `api/` Node + Express + Prisma (deployed on Render)
- Database: Neon Postgres

## Branching

- `main` is protected and always deployable. Changes arrive by pull request only.
- `develop` is the integration branch. Branch features off `develop` (`feature/<name>`) and open PRs into `develop`.
- CI (lint and tests) must pass before merging.

## Run locally

Requires Node 20 or newer.

1. Clone and enter the repo.
2. API:
   ```bash
   cd api
   cp .env.example .env      # fill in the Neon URLs
   npm install
   npx prisma migrate dev --name init
   npm run dev               # http://localhost:3000/health
   ```
3. Frontend (new terminal):
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev               # http://localhost:5173
   ```
4. The page should say `API status: ok`.

## Checks

```bash
cd api && npm run lint && npm test
cd frontend && npm run lint && npm test && npm run build
```

## Environment variables

| Where | Name | Purpose |
|---|---|---|
| API | `DATABASE_URL` | Neon pooled connection string |
| API | `DIRECT_URL` | Neon direct connection string, used for migrations |
| API | `CORS_ORIGIN` | Frontend URL allowed to call the API |
| Frontend | `VITE_API_URL` | Public URL of the API |

Never commit `.env` files. Set the same names in Render (API) and Vercel (frontend).

## Deploy

- Frontend: Vercel, root directory `frontend`, framework Vite.
- API: Render web service, root directory `api` (or use `render.yaml`).
- Database: Neon project. Migrations run on Render start with `prisma migrate deploy`.
