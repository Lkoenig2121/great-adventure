# Six Flags Great Adventure — live ops wall (Jackson, NJ)

Park operations board: attractions by status, radio event log, site/unit/person filters, and stale-position alerts. Two signed-in sessions share status over SSE without refresh.

## Stack

- Next.js App Router (product UI, Tailwind CSS)
- Express on Node.js (`server/`) for domain routes
- PostgreSQL (`attractions`, `status_snapshots`, `events`, `watchers`)

## Run locally

1. Start Postgres (Docker). This project maps to host port **5433** so it does not collide with other local Postgres instances on 5432:

```bash
docker compose up -d
```

2. Copy env values (optional; defaults match compose):

```bash
cp env.example .env
```

3. Install and start both processes:

```bash
npm install
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

Demo roster password: `park1979`

| Username   | Role |
| ---------- | ---- |
| `lead`     | Supervisor — full live data, can add attractions and check in anywhere |
| `westops`  | Ride ops for Best of the West — can check in west units |
| `forestops`| Ride ops for Enchanted Forest |
| `wall`     | Guest wall — public statuses only (no evac/stale internals) |
| `flash`    | Gold Flash Pass holder — reserve return times (max 2) |

### MVP demo

1. Sign in as `lead` in one browser window and as `westops` in another (or two `lead` sessions).
2. On Rolling Thunder, change status or wait time and submit **Check in position**.
3. The other window updates from the live stream — no reload.

## What is industry-specific

- Statuses are park radio states (`cycling`, `weather_hold`, `evac`), not a generic open/closed flag.
- **Stale positions**: if a ride that should be reporting goes quiet past its check-in window (90s on Lightnin' Loops, 2m on Rolling Thunder), the wall alerts.
- **Who sees live data**: guest wall cannot see evac, hold reasons, trains on track, or operator names.
- **Burst of events**: SSE coalesces rapid check-ins so the wall does not paint 24 individual messages during a weather hold.
- **Flash Pass**: holders reserve a return window (about 40% of standby, 15-minute scan window). Gold plan caps 2 active rides. Dining, shows, and guest services stay off the product.
- Degraded connection UX if heartbeats stop.

## API (Express)

- `POST /api/auth/login` `POST /api/auth/logout` `GET /api/auth/me`
- `GET/POST /api/attractions` `PATCH /api/attractions/:id` `POST /api/attractions/:id/status`
- `GET /api/events`
- `GET /api/watchers` `PUT /api/watchers/heartbeat`
- `GET/POST /api/reservations` `POST /api/reservations/:id/cancel`
- `GET /api/stream` (SSE)
