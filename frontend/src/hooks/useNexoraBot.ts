/**
 * Nexora AI Free — automated trading engine.
 *
 * A lightweight, adaptive signal engine for Deriv volatility indices. It reads
 * the live tick feed and builds two first-order Markov models from it:
 *
 *   • Parity model  — transitions between even/odd last digits (Even/Odd trades)
 *   • Direction model — transitions between up/down ticks (Rise/Fall trades)
 *
 * Each model's prediction is blended with the observed stationary frequency, so
 * a streak (pattern) and the overall digit/percentage bias both feed the
 * confidence. The bot only fires when confidence clears the risk threshold.
 *
 * "Mix" runs both models each tick and trades whichever is more confident.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    buyWithParameters,
    getActiveSymbols,
    getProposalPayout,
    subscribeOpenContract,
    subscribeTicks,
    type ActiveSymbol,
} from '@/services/trade-api';
import type { Subscription } from '@/services/trade-ws';
import { useAdminOptional } from '@/context/AdminContext';
import { usePortfolioOptional } from '@/context/PortfolioContext';
import { FALLBACK_SYMBOLS } from '@/constants/symbols';

const symbolDisplayName = (symbol: string): string =>
    FALLBACK_SYMBOLS.find(s => s.symbol === symbol)?.display_name ?? symbol;

/** A concrete contract family the engine can model and trade. */
export type NexoraFamily = 'rise_fall' | 'even_odd' | 'over_under' | 'matches_differs';
/** Premium named bots, each locked to a fixed contract type. */
export type NexoraPremiumStrategy = 'matches_printer' | 'over8_killer' | 'tickstrike_pro' | 'auto_switcher';
/** A user-selectable strategy: a single family, a meta-strategy, or a premium bot. */
export type NexoraStrategy = NexoraFamily | 'mix' | 'smart_ai' | NexoraPremiumStrategy;
export type RiskLevel = 'low' | 'medium' | 'high';

const PREMIUM_SET = new Set<NexoraStrategy>(['matches_printer', 'over8_killer', 'tickstrike_pro', 'auto_switcher']);
export const isPremiumStrategy = (s: NexoraStrategy): s is NexoraPremiumStrategy => PREMIUM_SET.has(s);

export interface NexoraConfig {
    strategy: NexoraStrategy;
    risk: RiskLevel;
    symbol: string;
    stake: number;
    profitTarget: number;
    maxLoss: number;
    currency: string;
    /** Families that `mix` / `smart_ai` may choose from (default: EO + RF). */
    families?: NexoraFamily[];
}

const DEFAULT_FAMILIES: NexoraFamily[] = ['even_odd', 'rise_fall'];

interface RiskProfile {
    /** Minimum model confidence required before a trade is placed. */
    minConfidence: number;
    /** Stake multiplier applied per consecutive loss (1 = flat staking). */
    martingale: number;
    /** Cap on the martingale step so stake can't run away. */
    maxStep: number;
    /** Rise/Fall contract duration in ticks. */
    riseDuration: number;
}

// Balanced thresholds: selective enough to skip coin-flip ticks (fewer, better
// trades) without stalling. Lower risk = more selective + flat stake; higher
// risk = looser + gentler recovery staking so losing streaks don't blow up.
const RISK: Record<RiskLevel, RiskProfile> = {
    low: { minConfidence: 0.54, martingale: 1, maxStep: 0, riseDuration: 3 },
    medium: { minConfidence: 0.525, martingale: 1.6, maxStep: 2, riseDuration: 2 },
    high: { minConfidence: 0.51, martingale: 2.0, maxStep: 3, riseDuration: 1 },
};

/** Human-readable staking mode for the selected risk (for UI labels). */
export const riskStakingLabel = (risk: RiskLevel): string => {
    const p = RISK[risk];
    return p.martingale <= 1
        ? 'Flat stake — no martingale'
        : `Martingale ×${p.martingale} on loss (capped at ${p.maxStep} steps)`;
};

export interface NexoraSignal {
    family: string;
    contract_type: string;
    label: string;
    predictionText: string;
    conf: number;
    passes: boolean;
    /** Normalised edge in [0,1] so families can be ranked against each other. */
    strength: number;
    /** Digit barrier for digit contracts (matches/differs, over/under) or the selected tick (TICKHIGH). */
    barrier?: number;
    /** Contract duration in ticks. Falls back to the family default when omitted. */
    duration?: number;
}

export interface DigitStat {
    digit: number;
    pct: number;
}

export interface DigitBehaviour {
    dist: DigitStat[];
    evenPct: number;
    oddPct: number;
    currentDigit: number | null;
    recentDirs: ('up' | 'down')[];
    sampleSize: number;
}

export interface SessionStats {
    netProfit: number;
    trades: number;
    wins: number;
    losses: number;
}

export interface JournalEntry {
    id: number;
    result: 'win' | 'loss' | 'error';
    text: string;
    profit?: number;
}

/** Emitted once a session ends by hitting the profit target or the max loss,
 *  so the UI can show a celebratory / stop modal. */
export interface SessionResult extends SessionStats {
    reason: 'target' | 'maxloss';
    currency: string;
}

export type BotStatus =
    | { kind: 'idle'; text: string }
    | { kind: 'running'; text: string }
    | { kind: 'trading'; text: string }
    | { kind: 'target'; text: string }
    | { kind: 'error'; text: string };

// ---------------------------------------------------------------------------
// Pure model math
// ---------------------------------------------------------------------------

const lastDigitOf = (price: number, decimals: number): number => {
    const s = price.toFixed(decimals);
    return Number(s[s.length - 1]);
};

const decimalsFromPip = (pip: number): number => Math.max(0, Math.round(-Math.log10(pip || 0.01)));

/**
 * First-order Markov prediction for a binary state sequence (values 0/1).
 * Returns P(next === 1), blended with the stationary frequency of 1s so both
 * the immediate pattern and the overall bias contribute.
 */
const predictBinary = (states: number[], blend = 0.65): { pOne: number; conf: number } => {
    const n = states.length;
    if (n < 8) return { pOne: 0.5, conf: 0.5 };

    let ones = 0;
    for (const s of states) ones += s;
    const freqOne = ones / n;

    const cur = states[n - 1];
    let c0 = 0;
    let c1 = 0;
    for (let i = 1; i < n; i++) {
        if (states[i - 1] === cur) {
            if (states[i] === 1) c1++;
            else c0++;
        }
    }
    const tot = c0 + c1;
    const markovOne = tot ? c1 / tot : freqOne;

    const pOne = blend * markovOne + (1 - blend) * freqOne;
    return { pOne, conf: Math.max(pOne, 1 - pOne) };
};

const DIGIT_WINDOW = 120;

// Build a two-sided (yes/no) signal for a ~50/50 family from P(yes).
const mkBinary = (
    family: NexoraFamily,
    pYes: number,
    yes: { label: string; type: string; barrier?: number },
    no: { label: string; type: string; barrier?: number },
    minConf: number
): NexoraSignal => {
    const isYes = pYes >= 0.5;
    const conf = isYes ? pYes : 1 - pYes;
    const side = isYes ? yes : no;
    return {
        family,
        contract_type: side.type,
        label: side.label,
        predictionText: side.label,
        conf,
        passes: conf >= minConf,
        strength: (conf - 0.5) / 0.5,
        barrier: side.barrier,
    };
};

/** Risk-scaled edge a digit must clear for Matches/Differs to fire. */
const MD_GATES: Record<RiskLevel, { match: number; diff: number }> = {
    low: { match: 0.06, diff: 0.035 },
    medium: { match: 0.045, diff: 0.025 },
    high: { match: 0.03, diff: 0.015 },
};

/**
 * Evaluate every contract family against the current tick window. Each family
 * yields a directional signal with a win-probability, a `passes` gate, and a
 * normalised `strength` so meta-strategies (Mix / Smart AI) can rank them.
 */
const evaluateFamilies = (
    quotes: number[],
    decimals: number,
    risk: RiskLevel
): Record<NexoraFamily, NexoraSignal> => {
    const minConf = RISK[risk].minConfidence;
    const digits = quotes.map(q => lastDigitOf(q, decimals));
    const win = digits.slice(-DIGIT_WINDOW);

    // Sequences for the Markov models.
    const parity = win.map(d => d % 2); // 1 = odd
    const highLow = win.map(d => (d > 4 ? 1 : 0)); // 1 = high (5-9)
    const dirs: number[] = [];
    for (let i = 1; i < quotes.length; i++) dirs.push(quotes[i] > quotes[i - 1] ? 1 : 0);

    // Even / Odd  (P(even) = 1 - P(odd))
    const par = predictBinary(parity);
    const eo = mkBinary(
        'even_odd',
        1 - par.pOne,
        { label: 'Even', type: 'DIGITEVEN' },
        { label: 'Odd', type: 'DIGITODD' },
        minConf
    );

    // Rise / Fall
    const dir = predictBinary(dirs);
    const rf = mkBinary(
        'rise_fall',
        dir.pOne,
        { label: 'Rise', type: 'CALL' },
        { label: 'Fall', type: 'PUT' },
        minConf
    );

    // Over 4 / Under 5  (P(high) drives Over)
    const hl = predictBinary(highLow);
    const ou = mkBinary(
        'over_under',
        hl.pOne,
        { label: 'Over 4', type: 'DIGITOVER', barrier: 4 },
        { label: 'Under 5', type: 'DIGITUNDER', barrier: 5 },
        minConf
    );

    // Matches / Differs from the digit-frequency distribution.
    const counts = new Array(10).fill(0);
    for (const d of win) counts[d]++;
    const n = win.length || 1;
    const probs = counts.map(c => c / n);
    let maxD = 0;
    let minD = 0;
    for (let i = 1; i < 10; i++) {
        if (probs[i] > probs[maxD]) maxD = i;
        if (probs[i] < probs[minD]) minD = i;
    }
    const u = 0.1; // uniform digit probability
    const pMost = probs[maxD];
    const pLeast = probs[minD];
    const strengthMatch = Math.max(0, (pMost - u) / (1 - u));
    const strengthDiff = Math.max(0, (u - pLeast) / u);
    const gate = MD_GATES[risk];
    let md: NexoraSignal;
    if (strengthMatch >= strengthDiff) {
        md = {
            family: 'matches_differs',
            contract_type: 'DIGITMATCH',
            label: `Matches ${maxD}`,
            predictionText: `Next digit = ${maxD}`,
            conf: pMost,
            barrier: maxD,
            passes: pMost - u >= gate.match,
            strength: strengthMatch,
        };
    } else {
        md = {
            family: 'matches_differs',
            contract_type: 'DIGITDIFF',
            label: `Differs ${minD}`,
            predictionText: `Next digit ≠ ${minD}`,
            conf: 1 - pLeast,
            barrier: minD,
            passes: u - pLeast >= gate.diff,
            strength: strengthDiff,
        };
    }

    return { even_odd: eo, rise_fall: rf, over_under: ou, matches_differs: md };
};

/** Pick the signal a (non-premium) strategy would act on right now. */
const selectSignal = (
    sigs: Record<NexoraFamily, NexoraSignal>,
    strategy: NexoraFamily | 'mix' | 'smart_ai',
    families: NexoraFamily[]
): NexoraSignal => {
    if (strategy === 'mix' || strategy === 'smart_ai') {
        return families.map(f => sigs[f]).reduce((a, b) => (b.strength > a.strength ? b : a));
    }
    return sigs[strategy];
};

// ── Premium bots ───────────────────────────────────────────────────────────
// Each premium strategy is one fixed contract type with its own signal logic.
// Tick budgets: Matches 1, Over 8 5, TickStrike 5, Auto Switcher 2.
const premiumSignal = (
    strategy: NexoraPremiumStrategy,
    quotes: number[],
    decimals: number,
    risk: RiskLevel
): NexoraSignal | null => {
    const digits = quotes.map(q => lastDigitOf(q, decimals));
    const win = digits.slice(-DIGIT_WINDOW);
    const n = win.length || 1;
    if (win.length < 12) return null;

    if (strategy === 'matches_printer') {
        // Combine the stationary frequency with a 1st-order digit Markov
        // (which digit most often follows the current one), then play the digit
        // with the best blended score.
        const counts = new Array(10).fill(0);
        for (const d of win) counts[d]++;
        const freq = counts.map(c => c / n);
        const cur = win[win.length - 1];
        const tCounts = new Array(10).fill(0);
        let tTot = 0;
        for (let i = 1; i < win.length; i++) {
            if (win[i - 1] === cur) {
                tCounts[win[i]]++;
                tTot++;
            }
        }
        const markov = tCounts.map(c => (tTot ? c / tTot : 0.1));
        const blend = 0.6;
        let best = 0;
        let bestScore = -1;
        for (let d = 0; d < 10; d++) {
            const score = blend * markov[d] + (1 - blend) * freq[d];
            if (score > bestScore) {
                bestScore = score;
                best = d;
            }
        }
        const passes = bestScore - 0.1 >= MD_GATES[risk].match;
        return {
            family: 'matches_printer',
            contract_type: 'DIGITMATCH',
            label: `Matches ${best}`,
            predictionText: `Next digit = ${best}`,
            conf: bestScore,
            barrier: best,
            duration: 1,
            passes,
            strength: Math.max(0, (bestScore - 0.1) / 0.9),
        };
    }

    if (strategy === 'over8_killer') {
        // Over 8 → win only on digit 9. Fire when 9 is over-represented recently.
        const p9 = win.filter(d => d === 9).length / n;
        const need = { low: 0.14, medium: 0.12, high: 0.1 }[risk];
        return {
            family: 'over8_killer',
            contract_type: 'DIGITOVER',
            label: 'Over 8',
            predictionText: 'Last digit > 8',
            conf: Math.max(p9, 0.1),
            barrier: 8,
            duration: 5,
            passes: p9 >= need,
            strength: Math.max(0, (p9 - 0.1) / 0.9),
        };
    }

    if (strategy === 'tickstrike_pro') {
        // High tick → predict the 5th tick is the highest of the series. Favoured
        // by upward momentum, so gate on a bullish direction model.
        const dirs: number[] = [];
        for (let i = 1; i < quotes.length; i++) dirs.push(quotes[i] > quotes[i - 1] ? 1 : 0);
        const up = predictBinary(dirs);
        return {
            family: 'tickstrike_pro',
            contract_type: 'TICKHIGH',
            label: 'Tick High',
            predictionText: 'Last of 5 ticks is the highest',
            conf: up.pOne,
            barrier: 5, // selected tick (the 5th)
            duration: 5,
            passes: up.pOne >= 0.5, // eager: any bullish lean
            strength: Math.max(0, (up.pOne - 0.5) / 0.5),
        };
    }

    // auto_switcher → Only Ups / Only Downs over 2 ticks, direction from the
    // tick-direction Markov; it flips automatically with the trend.
    const dirs: number[] = [];
    for (let i = 1; i < quotes.length; i++) dirs.push(quotes[i] > quotes[i - 1] ? 1 : 0);
    const dir = predictBinary(dirs);
    const up = dir.pOne >= 0.5;
    const conf = up ? dir.pOne : 1 - dir.pOne;
    return {
        family: 'auto_switcher',
        contract_type: up ? 'RUNHIGH' : 'RUNLOW',
        label: up ? 'Only Ups' : 'Only Downs',
        predictionText: up ? '2 ticks all rise' : '2 ticks all fall',
        conf,
        duration: 2,
        passes: true, // always picks a side and trades — it auto-switches each round
        strength: Math.max(0, (conf - 0.5) / 0.5),
    };
};

/** The signal the current config would act on right now (premium or family). */
const currentSignal = (
    strategy: NexoraStrategy,
    quotes: number[],
    decimals: number,
    risk: RiskLevel,
    families: NexoraFamily[]
): NexoraSignal | null =>
    isPremiumStrategy(strategy)
        ? premiumSignal(strategy, quotes, decimals, risk)
        : selectSignal(evaluateFamilies(quotes, decimals, risk), strategy, families);

const round2 = (n: number): number => Math.round(n * 100) / 100;

// Cache the symbol catalogue once (used only for pip → decimals).
let symbolsCache: Promise<ActiveSymbol[]> | null = null;
const loadSymbols = (): Promise<ActiveSymbol[]> => (symbolsCache ??= getActiveSymbols());

const EMPTY_BEHAVIOUR: DigitBehaviour = {
    dist: Array.from({ length: 10 }, (_, digit) => ({ digit, pct: 0 })),
    evenPct: 50,
    oddPct: 50,
    currentDigit: null,
    recentDirs: [],
    sampleSize: 0,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useNexoraBot = (config: NexoraConfig) => {
    const [ticksReady, setTicksReady] = useState(false);
    const [behaviour, setBehaviour] = useState<DigitBehaviour>(EMPTY_BEHAVIOUR);
    const [signal, setSignal] = useState<NexoraSignal | null>(null);
    const [stats, setStats] = useState<SessionStats>({ netProfit: 0, trades: 0, wins: 0, losses: 0 });
    const [journal, setJournal] = useState<JournalEntry[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState<BotStatus>({ kind: 'idle', text: 'Configure your bot and run.' });
    const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

    const quotesRef = useRef<number[]>([]);
    const decimalsRef = useRef(2);
    const cfgRef = useRef(config);
    cfgRef.current = config;

    // Admin (fake-trade) mode — when active, trades are simulated instead of real.
    const admin = useAdminOptional();
    const adminRef = useRef(admin);
    adminRef.current = admin;
    // Portfolio feed, so simulated trades still show in Open Positions.
    const portfolio = usePortfolioOptional();
    const portfolioRef = useRef(portfolio);
    portfolioRef.current = portfolio;

    const runningRef = useRef(false);
    const inFlightRef = useRef(false);
    const stepRef = useRef(0);
    // Mix mode: index of the family whose turn it is + a quiet counter, so we
    // keep the enabled families balanced without stalling.
    const mixTurnRef = useRef(0);
    const mixWaitRef = useRef(0);
    const netRef = useRef(0);
    const statsRef = useRef<SessionStats>({ netProfit: 0, trades: 0, wins: 0, losses: 0 });
    const pocSubRef = useRef<Subscription | null>(null);
    const journalIdRef = useRef(0);

    const pushJournal = useCallback((entry: Omit<JournalEntry, 'id'>) => {
        const id = ++journalIdRef.current;
        setJournal(prev => [{ id, ...entry }, ...prev].slice(0, 12));
    }, []);

    const stopInternal = useCallback((reason: 'user' | 'target' | 'maxloss' | 'error', message?: string) => {
        runningRef.current = false;
        setIsRunning(false);
        if (reason === 'target') setStatus({ kind: 'target', text: 'Profit target reached 🎯' });
        else if (reason === 'maxloss') setStatus({ kind: 'error', text: 'Max loss reached — bot stopped.' });
        else if (reason === 'error') setStatus({ kind: 'error', text: message ?? 'Bot stopped on error.' });
        else setStatus({ kind: 'idle', text: 'Bot stopped.' });

        // Surface a result modal when the session ends on a target/loss boundary.
        if (reason === 'target' || reason === 'maxloss') {
            setSessionResult({ reason, currency: cfgRef.current.currency, ...statsRef.current });
        }
    }, []);

    const clearSessionResult = useCallback(() => setSessionResult(null), []);

    const refreshDisplay = useCallback(() => {
        const q = quotesRef.current;
        const dec = decimalsRef.current;
        if (q.length < 6) return;

        const win = q.slice(-100);
        const digits = win.map(p => lastDigitOf(p, dec));
        const counts = new Array(10).fill(0);
        for (const d of digits) counts[d]++;
        const dist = counts.map((c, digit) => ({ digit, pct: (c / digits.length) * 100 }));
        const evenCount = digits.filter(d => d % 2 === 0).length;
        const evenPct = (evenCount / digits.length) * 100;

        const recentDirs: ('up' | 'down')[] = [];
        for (let i = Math.max(1, q.length - 15); i < q.length; i++) recentDirs.push(q[i] > q[i - 1] ? 'up' : 'down');

        setBehaviour({
            dist,
            evenPct,
            oddPct: 100 - evenPct,
            currentDigit: lastDigitOf(q[q.length - 1], dec),
            recentDirs,
            sampleSize: digits.length,
        });

        const cfg = cfgRef.current;
        setSignal(currentSignal(cfg.strategy, q, dec, cfg.risk, cfg.families ?? DEFAULT_FAMILIES));
    }, []);

    const onContractSettled = useCallback(
        (profit: number, sig: NexoraSignal) => {
            const won = profit >= 0;
            netRef.current = round2(netRef.current + profit);
            const s = statsRef.current;
            s.netProfit = netRef.current;
            s.trades += 1;
            if (won) s.wins += 1;
            else s.losses += 1;
            setStats({ ...s });
            stepRef.current = won ? 0 : stepRef.current + 1;
            pushJournal({
                result: won ? 'win' : 'loss',
                text: `${sig.label} • ${won ? '+' : ''}${profit.toFixed(2)}`,
                profit,
            });
            inFlightRef.current = false;

            const cfg = cfgRef.current;
            if (netRef.current >= cfg.profitTarget) {
                stopInternal('target');
                return;
            }
            if (netRef.current <= -Math.abs(cfg.maxLoss)) {
                stopInternal('maxloss');
                return;
            }
            if (runningRef.current) setStatus({ kind: 'running', text: 'Scanning market for the next signal…' });
        },
        [pushJournal, stopInternal]
    );

    const placeTrade = useCallback(
        async (sig: NexoraSignal) => {
            inFlightRef.current = true;
            const cfg = cfgRef.current;
            const prof = RISK[cfg.risk];
            const stake = round2(cfg.stake * Math.pow(prof.martingale, Math.min(stepRef.current, prof.maxStep)));
            const duration = sig.duration ?? (sig.family === 'rise_fall' ? prof.riseDuration : 1);

            setStatus({
                kind: 'trading',
                text: `Trading ${sig.label} • $${stake.toFixed(2)} • ${(sig.conf * 100).toFixed(0)}% confidence`,
            });

            // ── Admin fake-trade path: simulate the outcome, no real order ──
            const adminCtx = adminRef.current;
            if (adminCtx?.active) {
                // Send the REAL proposal first so the simulated payout matches Deriv.
                const payout = await getProposalPayout({
                    contract_type: sig.contract_type,
                    symbol: cfg.symbol,
                    amount: stake,
                    duration,
                    duration_unit: 't',
                    barrier: sig.barrier,
                    currency: cfg.currency,
                });
                const outcome = adminCtx.simulate(stake, sig.contract_type, sig.barrier, payout ?? undefined);
                if (outcome.insufficient) {
                    pushJournal({ result: 'error', text: 'Insufficient balance' });
                    inFlightRef.current = false;
                    stopInternal('error', 'Insufficient balance');
                    return;
                }
                // Show the simulated trade live in Open Positions with its fixed value
                // (like a real position), then settle it after the contract duration.
                const contractId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
                const finalProfit = outcome.profit;
                portfolioRef.current?.addAdminPosition({
                    contract_id: contractId,
                    contract_type: sig.contract_type,
                    display_name: symbolDisplayName(cfg.symbol),
                    underlying: cfg.symbol,
                    buy_price: stake,
                    bid_price: round2(Math.max(0, stake + finalProfit)),
                    profit: finalProfit,
                    currency: cfg.currency,
                    purchase_time: Math.floor(Date.now() / 1000),
                });
                const settleMs = duration * 1000 + 400 + Math.random() * 400;
                setTimeout(() => {
                    portfolioRef.current?.settleAdminPosition(contractId, finalProfit);
                    onContractSettled(finalProfit, sig);
                }, settleMs);
                return;
            }

            const res = await buyWithParameters({
                contract_type: sig.contract_type,
                symbol: cfg.symbol,
                amount: stake,
                duration,
                duration_unit: 't',
                barrier: sig.barrier,
                currency: cfg.currency,
            });

            if (res.error || !res.contract_id) {
                pushJournal({ result: 'error', text: res.error?.message ?? 'Trade rejected' });
                inFlightRef.current = false;
                stopInternal('error', res.error?.message);
                return;
            }

            pocSubRef.current = await subscribeOpenContract(res.contract_id, (poc: any) => {
                if (poc?.is_sold) {
                    pocSubRef.current?.forget();
                    pocSubRef.current = null;
                    onContractSettled(Number(poc.profit) || 0, sig);
                }
            });
        },
        [onContractSettled, pushJournal, stopInternal]
    );

    const maybeTrade = useCallback(() => {
        if (!runningRef.current || inFlightRef.current) return;
        const q = quotesRef.current;
        if (q.length < 18) return; // warm-up window
        const cfg = cfgRef.current;
        const strat = cfg.strategy;

        let pick: NexoraSignal | null = null;
        if (isPremiumStrategy(strat)) {
            const s = premiumSignal(strat, q, decimalsRef.current, cfg.risk);
            if (s?.passes) pick = s;
            if (!pick) return;
            void placeTrade(pick);
            return;
        }

        const sigs = evaluateFamilies(q, decimalsRef.current, cfg.risk);
        if (strat === 'smart_ai') {
            // Trade the single highest-edge family that clears its gate.
            const fams = cfg.families ?? DEFAULT_FAMILIES;
            const passing = fams.map(f => sigs[f]).filter(s => s.passes);
            if (passing.length) pick = passing.reduce((a, b) => (b.strength > a.strength ? b : a));
        } else if (strat === 'mix') {
            // Round-robin across families so the split stays balanced; if the
            // family whose turn it is stays quiet, let another go once.
            const fams = cfg.families ?? DEFAULT_FAMILIES;
            const turn = mixTurnRef.current % fams.length;
            const turnSig = sigs[fams[turn]];
            if (turnSig.passes) {
                pick = turnSig;
                mixTurnRef.current = (turn + 1) % fams.length;
                mixWaitRef.current = 0;
            } else if (mixWaitRef.current >= 10) {
                const alt = fams.map(f => sigs[f]).find(s => s.family !== turnSig.family && s.passes);
                if (alt) {
                    pick = alt;
                    mixWaitRef.current = 0;
                } else {
                    mixWaitRef.current += 1;
                }
            } else {
                mixWaitRef.current += 1;
            }
        } else {
            const s = sigs[strat];
            if (s.passes) pick = s;
        }

        if (!pick) return;
        void placeTrade(pick);
    }, [placeTrade]);

    const handleTick = useCallback(
        (msg: any) => {
            if (msg?.history?.prices) {
                quotesRef.current = msg.history.prices.map(Number).slice(-500);
                setTicksReady(true);
                refreshDisplay();
                return;
            }
            if (msg?.tick?.quote != null) {
                quotesRef.current.push(Number(msg.tick.quote));
                if (quotesRef.current.length > 600) quotesRef.current.shift();
                setTicksReady(true);
                refreshDisplay();
                maybeTrade();
            }
        },
        [refreshDisplay, maybeTrade]
    );

    // (Re)subscribe to the tick feed whenever the symbol changes.
    useEffect(() => {
        let active = true;
        let sub: Subscription | null = null;
        setTicksReady(false);
        setBehaviour(EMPTY_BEHAVIOUR);
        setSignal(null);
        quotesRef.current = [];

        (async () => {
            try {
                const syms = await loadSymbols();
                if (!active) return;
                const found = syms.find(x => x.symbol === config.symbol);
                decimalsRef.current = found ? decimalsFromPip(found.pip) : 2;
            } catch {
                decimalsRef.current = 2;
            }
            try {
                sub = await subscribeTicks({ symbol: config.symbol, style: 'ticks', count: 500, onData: handleTick });
                if (!active) sub.forget();
            } catch {
                if (active) setStatus({ kind: 'error', text: 'Could not load market ticks.' });
            }
        })();

        return () => {
            active = false;
            sub?.forget();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.symbol]);

    // Tear down on unmount.
    useEffect(
        () => () => {
            runningRef.current = false;
            pocSubRef.current?.forget();
        },
        []
    );

    const start = useCallback(() => {
        netRef.current = 0;
        stepRef.current = 0;
        mixTurnRef.current = 0;
        mixWaitRef.current = 0;
        statsRef.current = { netProfit: 0, trades: 0, wins: 0, losses: 0 };
        setStats({ ...statsRef.current });
        setJournal([]);
        setSessionResult(null);
        runningRef.current = true;
        setIsRunning(true);
        setStatus({ kind: 'running', text: 'Scanning market for the next signal…' });
    }, []);

    const stop = useCallback(() => stopInternal('user'), [stopInternal]);

    return {
        ticksReady,
        behaviour,
        signal,
        stats,
        journal,
        isRunning,
        status,
        sessionResult,
        clearSessionResult,
        start,
        stop,
    };
};
