# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Manual Trading iframe with a Dashboard landing tab showing the nyx robot, a greeting, month/day growth cards, and a reward ladder that grants 3 days of Alpha each time cumulative profit crosses a doubling threshold.

**Architecture:** The frontend derives growth from Deriv's `profit_table` through a pure maths module (unit-tested) and a hook that owns fetching. The reward is server-authoritative: the server fetches an OTP WebSocket URL with the user's access token, reads the profit table itself, and writes an ordinary `Subscription` row, so the existing `SubscriptionContext` handles unlock and expiry with no new client logic.

**Tech Stack:** React 18 + Vite + Tailwind + react-router-dom (frontend), Express + Mongoose (server), `@lottiefiles/dotlottie-react` for the robot, vitest for frontend unit tests, Node's global `WebSocket` (Node 22+) server-side.

**Spec:** `docs/superpowers/specs/2026-11-03-dashboard-design.md`

## Global Constraints

- Profit for a profit-table row is `sell_price - buy_price`. `ProfitTableRow` has no `profit` field. One shared helper; cards and reward must never disagree.
- A win is `profit >= 0`, matching `PortfolioContext.sessionStats`.
- Reward grant: tier `alpha`, 3 days, `paymentId` = `reward:growth:<n>`. First threshold 500, doubling after every grant.
- The user's Deriv access token is used for a read and never persisted — not to the database, not to logs.
- Only these strings are introduced: `Hello`, `Welcome Back,`, `This Month`, `Today`, and the reward progress line. No subtitle, tagline or CTA is to be written.
- Server code is CommonJS (`require`); frontend is ESM TypeScript with the `@/` alias.
- Frontend indentation is 4 spaces, matching the existing files.

## Review Focus

- **No closed trades.** A fresh account must render `0.00` and an em dash for percent — never `NaN`, `Infinity` or a crash. Covered in Task 2.
- **Opening equity at or below zero.** `currentBalance - profit <= 0` makes the percent meaningless; it must render an em dash. Covered in Task 2.
- **Local midnight, not UTC midnight.** `sell_time` is a UTC epoch; "Today" must bucket by the viewer's local day or a user at UTC+3 sees yesterday's trades. Covered in Task 2.
- **Account switch mid-fetch.** Rows in flight for the previous account must never land on the new account's cards. Guarded in Task 4 Step 2 and checked by hand in Task 10 — there is no hook-test harness in this project and the plan does not add one.
- **Rejected or expired token server-side.** The endpoint must answer with a clean error and grant nothing — not a 500, and never a grant on unverified profit. Covered in Task 7.

---

### Task 1: Dashboard route and tab replace Manual Trading

**Files:**
- Create: `frontend/src/pages/app/Dashboard.tsx`
- Delete: `frontend/src/pages/app/ManualTrading.tsx`
- Delete: `frontend/src/pages/app/manual/` (whole folder — verified orphaned)
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/TabNav.tsx`
- Modify: `frontend/src/pages/app/AppLayout.tsx`

**Interfaces:**
- Produces: `Dashboard` (default export) at route `/app/dashboard`; `APP_TABS[0]` pointing at `/app/dashboard`.

- [ ] **Step 1: Create `Dashboard.tsx`** — a default-exported component rendering a single `<div className='space-y-6' />` placeholder. Later tasks fill it.

- [ ] **Step 2: Delete `ManualTrading.tsx` and the `manual/` folder**

```bash
git rm -r frontend/src/pages/app/ManualTrading.tsx frontend/src/pages/app/manual
```

- [ ] **Step 3: Update `App.tsx`** — replace the `ManualTrading` import with `Dashboard`; change `<Route path='manual' …>` to `<Route path='dashboard' element={<Dashboard />} />`; point the `/app` index redirect, the legacy `/dashboard` redirect and the `AdminRoute` fallback at `/app/dashboard`.

- [ ] **Step 4: Update `TabNav.tsx`** — replace the first `APP_TABS` entry, importing `LayoutDashboard` from `lucide-react` in place of `CandlestickChart`:

```ts
{ to: '/app/dashboard', label: 'Dashboard', lines: ['Dash', 'board'], icon: LayoutDashboard, color: 'text-cyan-400' },
```

- [ ] **Step 5: Update `AppLayout.tsx`** — delete the `is_manual` constant, its comment, and both conditional branches. The shell is always `min-h-screen`; `<main>` always uses `container-page py-8 pb-24 md:pb-8`.

- [ ] **Step 6: Verify the build**

Run: `cd frontend && npm run build`
Expected: succeeds with no unresolved import of `ManualTrading` or `@/pages/app/manual/*`.

- [ ] **Step 7: Commit**

```bash
git add -A frontend/src
git commit -m "Replace Manual Trading with a Dashboard tab"
```

---

### Task 2: Growth maths

**Files:**
- Create: `frontend/src/utils/growth.ts`
- Create: `frontend/src/utils/growth.test.ts`
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`

**Interfaces:**
- Produces:
  - `rowProfit(row: { buy_price: number; sell_price: number }): number`
  - `startOfLocalDay(now?: Date): number` — epoch **seconds**
  - `startOfLocalMonth(now?: Date): number` — epoch seconds
  - `type PeriodStats = { profit: number; trades: number; winRate: number | null }`
  - `periodStats(rows: ProfitTableRow[], sinceEpoch: number): PeriodStats`
  - `growthPercent(profit: number, currentBalance: number): number | null`
  - `dailyBuckets(rows: ProfitTableRow[], sinceEpoch: number): number[]`

- [ ] **Step 1: Add vitest**

```bash
cd frontend && npm i -D vitest@^2.1.9
```
Add `"test": "vitest run"` to `scripts`. Create `vitest.config.ts` setting `test.environment` to `'node'` and resolving the `@/` alias to `./src`, mirroring `vite.config.ts`.

- [ ] **Step 2: Write the failing tests** in `frontend/src/utils/growth.test.ts`

```ts
describe('rowProfit', () => {
    it('is sell minus buy', () => expect(rowProfit({ buy_price: 10, sell_price: 19.5 })).toBe(9.5));
    it('is negative for a loss', () => expect(rowProfit({ buy_price: 10, sell_price: 0 })).toBe(-10));
});

describe('periodStats', () => {
    it('returns zeroes and a null win rate for no rows', () => {
        expect(periodStats([], 0)).toEqual({ profit: 0, trades: 0, winRate: null });
    });
    it('counts a break-even trade as a win', () => {
        const rows = [row({ sell_time: 100, buy_price: 10, sell_price: 10 })];
        expect(periodStats(rows, 0).winRate).toBe(1);
    });
    it('excludes rows settled before the cutoff', () => {
        const rows = [row({ sell_time: 50, buy_price: 10, sell_price: 30 }), row({ sell_time: 150, buy_price: 10, sell_price: 20 })];
        expect(periodStats(rows, 100)).toEqual({ profit: 10, trades: 1, winRate: 1 });
    });
});

describe('growthPercent', () => {
    it('measures profit against opening equity', () => expect(growthPercent(50, 150)).toBeCloseTo(0.5));
    it('is null when opening equity is zero', () => expect(growthPercent(100, 100)).toBeNull());
    it('is null when opening equity is negative', () => expect(growthPercent(100, 50)).toBeNull());
    it('is null when there is no profit and no balance', () => expect(growthPercent(0, 0)).toBeNull());
});

describe('startOfLocalDay', () => {
    it('is local midnight, not UTC midnight', () => {
        const d = new Date(2026, 10, 3, 1, 30);
        const start = new Date(startOfLocalDay(d) * 1000);
        expect(start.getHours()).toBe(0);
        expect(start.getDate()).toBe(3);
    });
});

describe('dailyBuckets', () => {
    it('returns one entry per local day since the cutoff, zero-filled', () => { /* 3-day span, trades on day 0 and day 2 → [p0, 0, p2] */ });
});
```

A `row()` helper in the test file builds a `ProfitTableRow` with defaults.

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npm test`
Expected: FAIL — cannot resolve `./growth`.

- [ ] **Step 4: Implement `frontend/src/utils/growth.ts`** with the signatures above. `growthPercent` returns `null` whenever `currentBalance - profit <= 0`. `startOfLocalDay`/`startOfLocalMonth` build a local `Date` and divide by 1000, so they follow the viewer's timezone.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test`
Expected: PASS, all cases.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/growth.ts frontend/src/utils/growth.test.ts frontend/vitest.config.ts frontend/package.json frontend/package-lock.json
git commit -m "Add the growth maths behind the dashboard cards"
```

---

### Task 3: Paged profit-table fetching

**Files:**
- Modify: `frontend/src/services/trade-api.ts:221-239`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `getProfitTable(opts?: { dateFrom?: number; limit?: number; offset?: number }): Promise<ProfitTableRow[]>` and `fetchProfitSince(dateFrom: number): Promise<ProfitTableRow[]>`.
- A month of trades cannot approach the page cap, so truncation is not surfaced to callers here; the cap exists only to bound a pathological history.

- [ ] **Step 1: Change `getProfitTable` to take an options object** — sends `{ profit_table: 1, description: 1, sort: 'ASC', limit, offset, date_from }`, omitting `date_from` when not given. `limit` defaults to 500, `offset` to 0. `sort: 'ASC'` so paging is stable while new trades settle.

- [ ] **Step 2: Add `fetchProfitSince(dateFrom)`** — pages on `offset` by `limit`, stopping when a page returns fewer than `limit` rows or after 20 pages, and returns the concatenated rows.

- [ ] **Step 3: Verify the build**

Run: `cd frontend && npm run build`
Expected: succeeds; no other caller of `getProfitTable` exists to break (verified: it has none).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/trade-api.ts
git commit -m "Page the profit table so a month of trades can be read"
```

---

### Task 4: `useAccountGrowth` hook

**Files:**
- Create: `frontend/src/hooks/useAccountGrowth.ts`

**Interfaces:**
- Consumes: `fetchProfitSince`, `MAX_PAGES` (Task 3); every export of `growth.ts` (Task 2); `useAuth()` for `activeLoginId` and `balance`; `usePortfolio()` for `history`.
- Produces: `useAccountGrowth(): { month: PeriodStats & { percent: number | null; buckets: number[] }, day: PeriodStats & { percent: number | null }, loading: boolean, error: string | null, refresh: () => void }`.

- [ ] **Step 1: Implement the hook.** Fetches `fetchProfitSince(startOfLocalMonth())` on mount and whenever `activeLoginId` changes, then derives month and day figures with the Task 2 helpers. `loading` is true only for a fetch with no previous result, so a refresh does not blank the cards.

- [ ] **Step 2: Guard against a stale account's rows.** Capture `activeLoginId` when the fetch starts and discard the result if it no longer matches when the promise settles — otherwise the previous account's trades land on the new account's cards.

- [ ] **Step 3: Refresh when a trade settles.** Watch `usePortfolio().history.length` and re-fetch, debounced by 3 seconds so a burst of settles makes one request.

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useAccountGrowth.ts
git commit -m "Read month and day growth for the active account"
```

---

### Task 5: Hero — robot, talking card, greeting

**Files:**
- Create: `frontend/src/components/dashboard/DashboardHero.tsx`
- Create: `frontend/public/hero.json` (copied from `../nyx/public/hero.json`)
- Modify: `frontend/package.json`
- Modify: `frontend/src/pages/app/Dashboard.tsx`

**Interfaces:**
- Consumes: `useAuth()` for `activeLoginId`.
- Produces: `DashboardHero` (default export).

- [ ] **Step 1: Add the dependency and the asset**

```bash
cd frontend && npm i @lottiefiles/dotlottie-react@^0.19.16
cp ../../nyx/public/hero.json public/hero.json
```

- [ ] **Step 2: Implement `DashboardHero.tsx`** — `<DotLottieReact src='/hero.json' loop autoplay />` sized around 200px, with the speech bubble absolutely positioned at its upper-left. The bubble is a rounded `bg-ink-800` card with a `border-line` border reading `Hello`, and a tail drawn with a CSS border triangle pointing down-right at the robot. Below the robot: `Welcome Back,` followed inline by `activeLoginId`. Render the greeting without the loginid when it is null.

- [ ] **Step 3: Render it** from `Dashboard.tsx`.

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/DashboardHero.tsx frontend/src/pages/app/Dashboard.tsx frontend/public/hero.json frontend/package.json frontend/package-lock.json
git commit -m "Give the dashboard the nyx robot and a greeting"
```

---

### Task 6: Growth cards

**Files:**
- Create: `frontend/src/components/dashboard/GrowthCard.tsx`
- Create: `frontend/src/components/dashboard/Sparkline.tsx`
- Modify: `frontend/src/pages/app/Dashboard.tsx`

**Interfaces:**
- Consumes: `useAccountGrowth()` (Task 4).
- Produces: `GrowthCard({ title, profit, percent, trades, winRate, buckets?, currency })`; `Sparkline({ values, positive })`.

- [ ] **Step 1: Implement `Sparkline.tsx`** — an inline `<svg>` with a single `<polyline>` over the running cumulative total of `values`, scaled to the viewBox, `preserveAspectRatio='none'`, stroke `currentColor`. Renders nothing when fewer than two points.

- [ ] **Step 2: Implement `GrowthCard.tsx`** — `bg-ink-800` / `border-line` card. Profit is signed and currency-formatted, emerald when `>= 0` and rose otherwise; percent renders as an em dash when `null`; the trades and win-rate line renders `—` for a null win rate. The sparkline is drawn only when `buckets` is given.

- [ ] **Step 3: Render both cards** from `Dashboard.tsx` in a `grid gap-4 md:grid-cols-2`: `This Month` with buckets, `Today` without. Show a skeleton while `loading`, and the hook's `error` in place of the figures when a fetch fails.

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard frontend/src/pages/app/Dashboard.tsx
git commit -m "Show month and day growth on the dashboard"
```

---

### Task 7: Server reads verified profit from Deriv

**Files:**
- Create: `server/Services/growthProfit.js`
- Create: `server/Services/__tests__/growthProfit.test.js`
- Modify: `server/package.json` (append to the `test` script)

**Interfaces:**
- Produces:
  - `sumProfit(rows): number` — `sell_price - buy_price` summed.
  - `fetchOtpSocketUrl(accessToken, loginid): Promise<string>`
  - `fetchAllTimeProfit(accessToken, loginid): Promise<number>`

- [ ] **Step 1: Write the failing test** in `server/Services/__tests__/growthProfit.test.js`, plain-node with `assert`, matching the existing tests' style. Cover `sumProfit` only — it is the pure part; the socket paths are exercised by hand in Task 10.

```js
assert.strictEqual(sumProfit([]), 0);
assert.strictEqual(sumProfit([{ buy_price: 10, sell_price: 19.5 }]), 9.5);
assert.strictEqual(sumProfit([{ buy_price: 10, sell_price: 0 }, { buy_price: 5, sell_price: 15 }]), 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd server && node Services/__tests__/growthProfit.test.js`
Expected: FAIL — cannot find module `../growthProfit`.

- [ ] **Step 3: Implement `server/Services/growthProfit.js`**
  - `fetchOtpSocketUrl` POSTs `${DERIV_REST}/trading/v1/options/accounts/${loginid}/otp` with the `Deriv-App-ID` header and `Authorization: Bearer <token>`, as `printerDeriv.js` does, and returns `json.data.url`. A 401 or 403 throws an error carrying `status = 401`; anything else throws with `status = 502`.
  - `fetchAllTimeProfit` opens that URL with the global `WebSocket` (guard `typeof WebSocket === 'undefined'` with the same message style as `printerDeriv.js`), sends `{ profit_table: 1, description: 1, sort: 'ASC', limit: 500, offset }`, pages until a short page arrives or 20 pages, sums with `sumProfit`, and closes the socket. A 20-second overall timeout rejects rather than hanging the request. The token is never logged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd server && node Services/__tests__/growthProfit.test.js`
Expected: PASS.

- [ ] **Step 5: Add it to the server test script** in `server/package.json`, chained with `&&` like the existing three.

- [ ] **Step 6: Commit**

```bash
git add server/Services/growthProfit.js server/Services/__tests__/growthProfit.test.js server/package.json
git commit -m "Read a user's realised profit from Deriv, server-side"
```

---

### Task 8: Reward ladder endpoint

**Files:**
- Create: `server/Models/GrowthReward.js`
- Create: `server/Controllers/rewardController.js`
- Create: `server/Routes/rewards.js`
- Create: `server/Services/__tests__/growthLadder.test.js`
- Modify: `server/index.js`
- Modify: `server/package.json` (append to the `test` script)

**Interfaces:**
- Consumes: `fetchAllTimeProfit` (Task 7); `Subscription` model; `TIERS` from `config/tiers`.
- Produces: `POST /api/rewards/growth/check` → `{ profit, threshold, granted, grantsClaimed, expiresAt }`. Exports `nextThreshold(current)` from the controller for testing.

- [ ] **Step 1: Write the failing test** in `server/Services/__tests__/growthLadder.test.js` for the pure ladder rule:

```js
assert.strictEqual(nextThreshold(500), 1000);
assert.strictEqual(nextThreshold(1000), 2000);
assert.strictEqual(shouldGrant(499.99, 500), false);
assert.strictEqual(shouldGrant(500, 500), true);
assert.strictEqual(shouldGrant(5000, 500), true);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd server && node Services/__tests__/growthLadder.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `GrowthReward.js`** — schema per the spec: `loginids: { type: [String], required: true, index: true }`, `threshold: { type: Number, default: 500 }`, `grantsClaimed: { type: Number, default: 0 }`, `lastGrantedAt: Date`, with `{ timestamps: true }`.

- [ ] **Step 4: Implement `rewardController.js`** exporting `nextThreshold`, `shouldGrant` and `check`. `check` validates `loginids` (array, non-empty, capped at 50) and `accessToken` (non-empty string) with Joi as the other routes do, calls `fetchAllTimeProfit` for the first loginid, then:
  - Finds or creates the `GrowthReward` row for those loginids.
  - If `shouldGrant(profit, threshold)`, atomically bump the ladder with a conditional update — `findOneAndUpdate({ _id, threshold }, { $set: { threshold: nextThreshold(threshold), lastGrantedAt: now }, $inc: { grantsClaimed: 1 } })`. Only if that update matched a document does it write the `Subscription` (tier `alpha`, `expiresAt` now + 3 days, `paymentId` = `reward:growth:<grantsClaimed>`). A concurrent second request matches nothing and grants nothing.
  - A thrown `status === 401` from Task 7 answers `401` with `granted: false`; it must never grant on unverified profit.

- [ ] **Step 5: Create `Routes/rewards.js`** with a rate limiter matching `Routes/subscription.js`, and mount it at `/api/rewards` in `server/index.js` beside the other routers.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd server && node Services/__tests__/growthLadder.test.js`
Expected: PASS.

- [ ] **Step 7: Add it to the server test script and commit**

```bash
git add server/Models/GrowthReward.js server/Controllers/rewardController.js server/Routes/rewards.js server/Services/__tests__/growthLadder.test.js server/index.js server/package.json
git commit -m "Grant three days of Alpha when profit crosses the growth target"
```

---

### Task 9: Reward progress on the dashboard

**Files:**
- Create: `frontend/src/services/rewards-api.ts`
- Create: `frontend/src/components/dashboard/RewardProgress.tsx`
- Modify: `frontend/src/pages/app/Dashboard.tsx`

**Interfaces:**
- Consumes: `POST /api/rewards/growth/check` (Task 8); `useAuth()` for `accounts`; `useSubscription()` for `refresh`; `OAuthTokenExchangeService.getAuthInfo()` for the access token.
- Produces: `checkGrowthReward(body): Promise<GrowthRewardResult>`; `RewardProgress` (default export).

- [ ] **Step 1: Implement `rewards-api.ts`** — mirrors `payments-api.ts`: same `API_URL` constant and `json` response handler, one `checkGrowthReward` function posting `{ loginids, accessToken }`.

- [ ] **Step 2: Implement `RewardProgress.tsx`** — calls the endpoint on mount and whenever the Task 4 hook's month profit changes, and renders a progress bar of `profit / threshold` with the line `$<profit> of $<threshold> toward 3 days Alpha`. On `granted`, calls `useSubscription().refresh()`. Renders nothing when there is no access token (legacy-token sessions have no bearer to verify with) or when the request fails.

- [ ] **Step 3: Render it** from `Dashboard.tsx`, below the growth cards.

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/rewards-api.ts frontend/src/components/dashboard/RewardProgress.tsx frontend/src/pages/app/Dashboard.tsx
git commit -m "Show progress toward the growth reward"
```

---

### Task 10: Verify the dashboard in a browser

**Files:** none — verification only.

- [ ] **Step 1: Run the full test suites**

Run: `cd frontend && npm test` and `cd server && npm test`
Expected: both PASS.

- [ ] **Step 2: Build and serve the frontend**

Run: `cd frontend && npm run build && npm run preview`

- [ ] **Step 3: Load the dashboard** with the browser-automation skill and confirm: the robot animates, the `Hello` bubble points at it, the greeting shows the loginid, both cards render figures (not `NaN`), the tab bar reads Dashboard on desktop and mobile widths, and the console is free of errors.

- [ ] **Step 4: Confirm the removal** — `/app/manual` redirects away and no request 404s for a deleted `manual/` chunk.

- [ ] **Step 5: Report findings.** Fix anything broken in the task that owns it, then re-verify.
