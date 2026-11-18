# FoodBridge

Neighbour-to-neighbour food rescue. Vendors post surplus, recipients claim and collect with a pickup code, ratings build a trust score.

- `foodbridge-backend/` Node + Express API (deployed on Render)
- Frontend: to be added (separate vendor and recipient views)
- Database: set up with `schema.sql`

## Branching

- `main` is always deployable. Changes arrive by pull request.
- Branch features as `feature/<name>` and open a PR into `main`.
- CI must pass before merging.

## Run locally

Requires Node 20 or newer.

```bash
cd foodbridge-backend
npm install
# create a .env file with the variables below
node app.js
```

Run `schema.sql` on your database once before starting.

## Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Database connection string |
| `JWT_SECRET` | Secret for signing login tokens |
| `CORS_ORIGIN` | Frontend URL allowed to call the API |

Never commit `.env` files. Set the same names in Render.

## Deploy

- Render web service, root directory `foodbridge-backend`, build `npm install`, start `node app.js` (or use `render.yaml`).
- Do not edit `.github/workflows` unless adding the frontend; Amna owns it.
