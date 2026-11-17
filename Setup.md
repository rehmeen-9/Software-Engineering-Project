# FoodBridge

Neighbour-to-neighbour food rescue. Vendors post surplus, receivers claim and collect with a pickup code, ratings build a trust score.

- `frontend/` React + Vite (deployed on Vercel)
- `foodbridge-backend/` Node + Express + pg (deployed on Render)
- Database: Neon Postgres (schema in `schema.sql`)

## Branching
- `main` is protected and always deployable. Changes arrive by pull request only.
- `develop` is the integration branch. Branch features off `develop` (`feature/<name>`) and open PRs into `develop`.
- CI must pass before merging.

## Run locally
Requires Node 20 or newer.

1. Clone and enter the repo.
2. API:

       cd foodbridge-backend
       cp .env.example .env      # fill in the database URL and JWT secret
       npm install
       psql "$DATABASE_URL" -f ../schema.sql    # creates the tables
       npm run dev               # http://localhost:5000/health

3. Frontend (new terminal):

       cd frontend
       cp .env.example .env
       npm install
       npm run dev               # http://localhost:5173

The page should say API status: ok.

## Checks
    cd foodbridge-backend && node -e "require('./src/app')"
    cd frontend && npm run lint && npm test && npm run build

## Environment variables
| Where | Name | Purpose |
|---|---|---|
| API | PORT | Server port (default 5000) |
| API | DATABASE_URL | Neon Postgres connection string |
| API | JWT_SECRET | Secret used to sign login tokens |
| API | JWT_EXPIRES_IN | Token lifetime, e.g. `1d` |
| API | NODE_ENV | Set to `production` when deployed (enables SSL for the database) |
| Frontend | VITE_API_URL | Public URL of the API |

Never commit `.env` files. Set the same names in Render (API) and Vercel (frontend).

## Deploy
- Frontend: Vercel, root directory `frontend`, framework Vite.
- API: Render web service, root directory `foodbridge-backend` (or use `render.yaml`), build `npm ci`, start `npm start`.
- Database: Neon project. Run `schema.sql` once against it (`psql "<neon-url>" -f schema.sql`). Tables are not created automatically on deploy.
