# Dashboard — design

Replaces Manual Trading with a Dashboard landing tab carrying the nyx robot, a
greeting, month/day growth cards, and a growth-reward ladder.

## Intent

The authenticated app opens on an embedded DTrader iframe, which says nothing
about how the user is doing. The dashboard replaces it with the account's own
numbers: what it made this month, what it made today, and how close it is to
the next reward.

Decisions taken with the user:

- The DTrader iframe is **removed from the product**, not relocated.
- The reward triggers on **cumulative realised profit**, so a deposit earns
  nothing.
- Each grant is **3 days of Alpha**, and the threshold **doubles** afterwards
  (500 → 1000 → 2000 …), re-locking premium when the 3 days lapse.
- The server **verifies profit itself** rather than trusting a client figure.

## Scope

In: routing, the dashboard page, a growth data layer, two growth cards, the
reward ladder (client + server).

Out: any change to the Nexora AI tabs, pricing, checkout or admin screens.

## 1. Routing and navigation

| Change | File |
| --- | --- |
| Delete the iframe page | `frontend/src/pages/app/ManualTrading.tsx` |
| Delete the orphaned subfolder | `frontend/src/pages/app/manual/` |
| `manual` route becomes `dashboard` | `frontend/src/App.tsx` |
| `/app` index and legacy `/dashboard` point at `/app/dashboard` | `frontend/src/App.tsx` |
| `AdminRoute` fallback redirect | `frontend/src/App.tsx` |
| First tab becomes Dashboard | `frontend/src/components/TabNav.tsx` |
| Remove the `is_manual` viewport lock | `frontend/src/pages/app/AppLayout.tsx` |

`manual/` (TradePanel, DerivChart, PriceChart, LastDigitStats, MarketsModal,
ContractTypeModal) is already orphaned — verified that nothing outside the
folder imports it, so deleting it cannot break a build.

`APP_TABS` feeds both `TabNav` (desktop) and `BottomTabNav` (mobile), so the
tab swap is one edit. New entry:

```ts
{ to: '/app/dashboard', label: 'Dashboard', lines: ['Dash', 'board'],
  icon: LayoutDashboard, color: 'text-cyan-400' }
```

Removing `is_manual` drops `h-[100dvh] overflow-hidden` from the shell and the
full-bleed `<main>` branch; every tab now uses the padded container.

## 2. Hero, robot, talking card

`frontend/src/pages/app/Dashboard.tsx` composes the page.
`frontend/src/components/dashboard/DashboardHero.tsx` holds the hero.

- `nyx/public/hero.json` (80 KB Lottie, 500×500, 60 fps) is copied to
  `frontend/public/hero.json`.
- New dependency `@lottiefiles/dotlottie-react@^0.19.16`. Its peer range is
  `^17 || ^18 || ^19`, so React 18 is supported.
- The talking card is a CSS speech bubble anchored to the robot's upper-left,
  reading **Hello**, with a border-triangle tail pointing at the robot.
- Beneath it: **Welcome Back,** followed inline by `useAuth().activeLoginId`.

```
   .-----------.
   |  Hello    |
   '----v------'
        \
      [ robot ]

   Welcome Back, ROT90364524
```

### Copy

The only strings introduced are `Hello`, `Welcome Back,`, `This Month`,
`Today`, and the reward progress line. No subtitle, tagline or CTA is written:
none was asked for, and inventing product copy is the user's call, not this
spec's.

## 3. Growth data layer

`ProfitTableRow` has **no** `profit` field. Profit for a row is
`sell_price - buy_price`, computed in a single exported helper so the cards and
the reward can never disagree about what a trade earned.

`frontend/src/services/trade-api.ts`:

- `getProfitTable` takes `{ dateFrom, limit, offset }`.
- New `fetchProfitSince(epoch)` pages on `offset` until a short page returns,
  with a hard cap on pages so a long history cannot hang the dashboard.

`frontend/src/hooks/useAccountGrowth.ts` fetches month-to-date rows on mount
and on account switch, then derives:

- `monthProfit`, `dayProfit` (rows with `sell_time >= local midnight`)
- `trades` and `winRate` per period (`profit >= 0` counts as a win, matching
  `PortfolioContext.sessionStats`)
- `dailyBuckets` — per-day profit totals for the sparkline

Percent is `profit / (currentBalance - profit)`: growth over the period's
opening equity. Guard the divisor against zero and against a negative opening
equity, and render an em dash rather than a nonsense percentage when it is
unusable.

It re-fetches, debounced, when `PortfolioContext` records a settle, so a
closing trade updates the cards without a reload.

## 4. Growth cards

`frontend/src/components/dashboard/GrowthCard.tsx`, rendered twice.

```
+-- THIS MONTH -------+  +-- TODAY ------------+
| +$312.40    +24.1%  |  | +$48.20      +3.9%  |
|  /\    /\/\         |  |  12 trades          |
| /  \/\/     \___/   |  |  67% win rate       |
+---------------------+  +---------------------+
```

The sparkline is a hand-rolled inline SVG polyline over `dailyBuckets` — no
chart library. Emerald for a positive period, rose for negative, on the app's
existing `bg-ink-800` / `border-line` card treatment. The Today card has one
bucket and so renders its stats without a sparkline.

## 5. Reward ladder

### Server

New `server/Models/GrowthReward.js`:

| Field | Meaning |
| --- | --- |
| `loginids: [String]` | every login on the account, as `Subscription` does |
| `threshold: Number` | current target, default 500 |
| `grantsClaimed: Number` | how many 3-day grants have been made |
| `lastGrantedAt: Date` | when the most recent grant was written |

`POST /api/rewards/growth/check` with `{ loginids, accessToken }`:

1. Call Deriv with the token and compute all-time realised profit for the
   account. Prefer the options REST API; if it exposes no profit table, open a
   short-lived authenticated socket and call `profit_table`, the way
   `printerDeriv.js` already opens the public socket for tick history.
   **This must be confirmed before the endpoint is written.**
2. If `profit >= threshold`, write a `Subscription` — tier `alpha`,
   `expiresAt` = now + 3 days, `paymentId` = `reward:growth:<grantsClaimed+1>`
   — then double `threshold` and increment `grantsClaimed`.
3. Respond `{ profit, threshold, granted, expiresAt }`.

Rate-limited like `Routes/subscription.js`. The grant and the threshold bump
must be atomic, so a double-submit cannot buy two grants at one threshold.

The token is sent to our own backend over HTTPS and used for a read only. It is
never persisted — not to the database, not to logs.

### Client

`frontend/src/services/rewards-api.ts` wraps the endpoint.
`frontend/src/components/dashboard/RewardProgress.tsx` shows profit against the
current threshold with a progress bar. On a `granted` response it calls
`useSubscription().refresh()` so premium unlocks without a reload.

Expiry needs no new code: `SubscriptionContext` already re-checks on its expiry
timer and on tab visibility, so premium re-locks when the 3 days lapse.

## Testing

- Growth maths — profit derivation, midnight boundary, win rate, percent with a
  zero and a negative opening equity — is pure and unit-tested.
- Reward ladder: crossing a threshold grants once and doubles; a second call at
  the same profit grants nothing; the doubled threshold persists.
- Server tests follow the existing plain-node pattern under
  `server/Services/__tests__`.
- The dashboard is rendered in a browser and checked for console errors before
  the work is called done.

## Risks

- **Deriv profit endpoint unconfirmed.** Section 5 step 1 is the one real
  unknown. It is spiked before the endpoint is built; the authenticated-socket
  fallback is the contingency.
- **History length.** An account with years of trades makes all-time profit
  expensive to compute. The page cap bounds it; if it proves slow, the server
  caches the last computed profit against the loginids.
