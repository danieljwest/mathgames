# Mrs. West Knows Best

Keyboard-first classroom math games for Mrs. West’s challenges. Live at [math.west.best](https://math.west.best). Static site on Cloudflare Workers — no backend, no accounts.

## Games

- **Multiply Blast** — facts through 12×12, 60 seconds
- **Add Dash** — addition race with sums ≤ 100
- **Factor Fill** — find the missing factor
- **Integer Rush** — add/subtract with negatives
- **Fair Share** — fraction of a whole number
- **Mystery x** — one-step equations
- **Percent Pop** — 10%, 25%, 50%, 75%, 100%
- **Ratio Rally** — equivalent ratios, missing term
- **Divide & Dash** — division facts / missing number
- **Decimal Drift** — add/subtract tenths & hundredths
- **Power Up** — squares, cubes, small powers
- **Unit Rate Run** — per-one rates

Score is `correct − incorrect`. Tickets are awarded from that final score:

| Score | Tickets |
|------:|--------:|
| 20–26 | 1       |
| 27–34 | 2       |
| 35–44 | 3       |
| 45–49 | 4       |
| 50+   | 5       |

## Develop

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

Custom domain: `math.west.best` (configured in `wrangler.jsonc`).
