import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  History,
  Loader2,
  Play,
  Printer,
  Square,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getPrinterStatus,
  removePrinterToken,
  resolvePrinterAccounts,
  startPrinter,
  stopPrinter,
  type PrinterAccount,
  type PrinterSession,
} from "@/services/printer-api";

const POLL_MS = 15000;

/** mm:ss until the next hour, or '—' once the timestamp has passed. */
const useCountdown = (iso: string | null) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "any moment";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
};

const AdminPrinter = () => {
  const { accounts } = useAuth();
  const loginids = useMemo(
    () => accounts.map((a) => a.loginid).filter(Boolean),
    [accounts],
  );

  const [session, setSession] = useState<PrinterSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Setup form
  const [token, setToken] = useState("");
  const [resolved, setResolved] = useState<PrinterAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [stake, setStake] = useState("1");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [hourlyTarget, setHourlyTarget] = useState("2");
  const [recoveryMultiplier, setRecoveryMultiplier] = useState("2");
  const [showHistory, setShowHistory] = useState(false);

  const countdown = useCountdown(session?.active ? session.nextHourAt : null);
  const selectedAccount = useMemo(
    () => resolved.find((a) => a.account_id === accountId) ?? null,
    [resolved, accountId],
  );

  const load = useCallback(async () => {
    if (!loginids.length) return;
    try {
      setSession(await getPrinterStatus(loginids));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load printer status");
    } finally {
      setLoading(false);
    }
  }, [loginids]);

  useEffect(() => {
    load();
  }, [load]);

  // Restore the previous setup after a stop: settings come back from the saved
  // session and the account list is re-resolved with the stored token, so
  // restarting is one click and the PAT never has to be pasted twice.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !session || session.active) return;
    restoredRef.current = true;

    setStake(String(session.stake));
    setStopLoss(session.stopLoss ? String(session.stopLoss) : "");
    setTakeProfit(session.takeProfit ? String(session.takeProfit) : "");
    setHourlyTarget(String(session.hourlyTarget ?? 2));
    setRecoveryMultiplier(String(session.recoveryMultiplier ?? 2));

    if (!session.hasToken) return;
    resolvePrinterAccounts(loginids)
      .then((list) => {
        setResolved(list);
        setAccountId(
          list.some((a) => a.account_id === session.account_id)
            ? session.account_id
            : (list[0]?.account_id ?? ""),
        );
      })
      .catch(() => {
        /* token unusable — the form falls back to asking for a new one */
      });
  }, [session, loginids]);

  // The countdown re-renders this component every second. Holding `load` in a
  // ref keeps the poll interval out of that churn — depending on it directly
  // tore the interval down and recreated it every second, so it never fired.
  const loadRef = useRef(load);
  loadRef.current = load;

  // Refresh while the tab is open. This only updates the display — the server
  // keeps trading regardless of whether anyone is watching.
  useEffect(() => {
    if (!session?.active) return;
    const id = setInterval(() => loadRef.current(), POLL_MS);
    return () => clearInterval(id);
  }, [session?.active]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const list = await resolvePrinterAccounts(
        loginids,
        token.trim() || undefined,
      );
      setResolved(list);
      setAccountId((prev) =>
        list.some((a) => a.account_id === prev)
          ? prev
          : (list[0]?.account_id ?? ""),
      );
    } catch (e: any) {
      setError(e?.message ?? "Could not validate token");
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await startPrinter(loginids, {
        // Omitted when blank so the server reuses the stored token.
        token: token.trim() || undefined,
        account_id: accountId,
        stake: Number(stake),
        stopLoss: Number(stopLoss) || 0,
        takeProfit: Number(takeProfit) || 0,
        hourlyTarget: Number(hourlyTarget) || 2,
        recoveryMultiplier: Number(recoveryMultiplier) || 2,
      });
      setSession(next);
      setToken("");
      restoredRef.current = false;
    } catch (e: any) {
      setError(e?.message ?? "Failed to start");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    setError(null);
    try {
      setSession(await stopPrinter(loginids));
    } catch (e: any) {
      setError(e?.message ?? "Failed to stop");
    } finally {
      setBusy(false);
    }
  };

  const forget = async () => {
    setBusy(true);
    setError(null);
    try {
      await removePrinterToken(loginids);
      setSession(null);
      setResolved([]);
      setAccountId("");
      setToken("");
      restoredRef.current = false;
    } catch (e: any) {
      setError(e?.message ?? "Failed to remove token");
    } finally {
      setBusy(false);
    }
  };

  const stats = session?.stats;
  const profitClass =
    (stats?.profit ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <div className="flex w-full flex-col gap-4">
      <h1 className="flex items-center gap-2 text-lg font-bold text-white">
        <Printer size={20} className="text-cyan-400" /> Printer
      </h1>
      <p className="text-sm text-slate-400">
        Trades Over 2 and Under 7 together, so digits 3-6 win both legs and no
        round is a total loss. Each hour it keeps placing rounds until it banks
        the target, then idles until the next hour. A losing round is carried as
        a deficit, and the next round buys a single Even — each retry
        martingales until one lands. It runs on the server, so it keeps trading
        after you close this page.
      </p>

      {error && (
        <div className="card flex items-start gap-2 border-rose-500/40 text-sm text-rose-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-cyan-400" />
        </div>
      ) : session?.active ? (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Printing on
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-lg font-bold text-white">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    session.account_type === "demo"
                      ? "bg-slate-700 text-slate-300"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {session.account_type}
                </span>
                {session.account_id}
                <span className="text-sm font-medium text-slate-400">
                  · {session.stake} {session.currency} per leg
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {session.hourDone
                  ? `${session.hourEndedReason} · next hour in ${countdown}`
                  : `This hour: ${session.hourlyProfit.toFixed(2)} / ${session.hourlyTarget} ${session.currency}` +
                    ` · round ${session.hourRounds}`}
              </p>
              {session.deficit > 0 && (
                <p className="mt-1 text-sm text-amber-400">
                  Recovering {session.deficit.toFixed(2)} {session.currency} —
                  next round is a single Even
                </p>
              )}
            </div>
            <button
              onClick={stop}
              disabled={busy}
              className="btn-admin bg-rose-600 hover:bg-rose-500"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Square size={15} />
              )}{" "}
              Stop printing
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Rounds
              </p>
              <p className="mt-1 text-2xl font-extrabold text-white">
                {stats?.trades ?? 0}
              </p>
            </div>
            <div className="card">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Wins
              </p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-400">
                {stats?.wins ?? 0}
              </p>
            </div>
            <div className="card">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Losses
              </p>
              <p className="mt-1 text-2xl font-extrabold text-rose-400">
                {stats?.losses ?? 0}
              </p>
            </div>
            <div className="card">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Net P/L
              </p>
              <p className={`mt-1 text-2xl font-extrabold ${profitClass}`}>
                {(stats?.profit ?? 0).toFixed(2)}
              </p>
            </div>
          </div>

          <TradeLog session={session} />
        </>
      ) : (
        <>
          {session && !session.active && (
            <div className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  Stopped
                  {session.stoppedReason ? ` — ${session.stoppedReason}` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {session.stats.trades} rounds · net{" "}
                  <span className={profitClass}>
                    {session.stats.profit.toFixed(2)}
                  </span>{" "}
                  {session.currency}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="btn-admin bg-ink-700 hover:bg-ink-600"
                >
                  <History size={15} />{" "}
                  {showHistory ? "Hide history" : "View history"}
                </button>
                <button
                  onClick={forget}
                  disabled={busy}
                  className="btn-admin bg-ink-700 hover:bg-ink-600"
                >
                  <Trash2 size={15} /> Remove token
                </button>
              </div>
            </div>
          )}

          {/* The same stats + log the running view shows, for a stopped session. */}
          {session && !session.active && showHistory && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="card">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">
                    Rounds
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-white">
                    {session.stats.trades}
                  </p>
                </div>
                <div className="card">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">
                    Wins
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-400">
                    {session.stats.wins}
                  </p>
                </div>
                <div className="card">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">
                    Losses
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-rose-400">
                    {session.stats.losses}
                  </p>
                </div>
                <div className="card">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">
                    Net P/L
                  </p>
                  <p className={`mt-1 text-2xl font-extrabold ${profitClass}`}>
                    {session.stats.profit.toFixed(2)}
                  </p>
                </div>
              </div>

              <TradeLog session={session} />
            </>
          )}

          <div className="card flex flex-col gap-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500">
                Deriv API token (Trade scope)
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={
                    session?.hasToken
                      ? "Token on file — leave blank to reuse it"
                      : "Paste your Deriv API token"
                  }
                  className="min-w-0 flex-1 rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-white outline-none"
                />
                <button
                  onClick={connect}
                  disabled={busy || (!token.trim() && !session?.hasToken)}
                  className="btn-admin"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : null}{" "}
                  Connect
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {session?.hasToken
                  ? "Your token is saved. Paste a new one only to replace it, or use Remove token to clear it."
                  : "Create it in Deriv → Settings → API token, with the Trade scope. It is stored encrypted and never shown again."}
              </p>
            </div>

            {resolved.length > 0 && (
              <>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-500">
                    Account to trade
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-white outline-none"
                  >
                    {resolved.map((a) => (
                      <option key={a.account_id} value={a.account_id}>
                        {a.account_type === "demo" ? "Demo" : "Real"} ·{" "}
                        {a.account_id} — {a.balance.toFixed(2)} {a.currency}
                      </option>
                    ))}
                  </select>
                  {selectedAccount?.account_type === "real" && (
                    <p className="mt-1 text-xs text-amber-400">
                      Real account — every round places live trades with your
                      own money.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Stake per leg"
                    value={stake}
                    onChange={setStake}
                    placeholder="1"
                  />
                  <Field
                    label="Hourly profit target"
                    value={hourlyTarget}
                    onChange={setHourlyTarget}
                    placeholder="2"
                  />
                  <Field
                    label="Stop loss (optional)"
                    value={stopLoss}
                    onChange={setStopLoss}
                    placeholder="off"
                  />
                  <Field
                    label="Take profit (optional)"
                    value={takeProfit}
                    onChange={setTakeProfit}
                    placeholder="off"
                  />
                  <Field
                    label="Recovery martingale"
                    value={recoveryMultiplier}
                    onChange={setRecoveryMultiplier}
                    placeholder="2"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Each round buys two contracts at this stake, so a normal hour
                  commits {(Number(stake) * 2 || 0).toFixed(2)}{" "}
                  {selectedAccount?.currency ?? ""} — of which at most{" "}
                  {(Number(stake) * 0.64 || 0).toFixed(2)} can actually be lost,
                  since one leg always pays. Recovery hours stake more, capped at{" "}
                  {(Number(stake) * 10 || 0).toFixed(2)}.
                </p>

                <button
                  onClick={start}
                  disabled={busy || !accountId || Number(stake) < 0.35}
                  className="btn-admin self-start"
                >
                  {busy ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Play size={15} />
                  )}{" "}
                  Start printing
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div>
    <label className="text-[11px] uppercase tracking-wider text-slate-500">
      {label}
    </label>
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-white outline-none"
    />
  </div>
);

const TradeLog = ({ session }: { session: PrinterSession }) => {
  if (!session.trades.length) {
    return (
      <div className="card text-sm text-slate-400">
        No rounds yet. The first one lands within a minute of the hour starting.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-slate-500">
          <tr className="border-b border-line">
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Market</th>
            <th className="px-4 py-3">Legs</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">P/L</th>
          </tr>
        </thead>
        <tbody>
          {session.trades.map((t) => (
            <tr
              key={`${t.hourKey}-${t.placedAt}`}
              className="border-b border-line/60 last:border-0"
            >
              <td className="px-4 py-3 text-slate-300">
                {new Date(t.placedAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 font-medium text-white">
                {t.symbol}
                {t.mode === "recovery" && (
                  <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    recovery
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-400">
                {t.legs
                  .map((l) =>
                    l.contract_type === "DIGITEVEN" ||
                    l.contract_type === "DIGITODD"
                      ? `${l.contract_type === "DIGITEVEN" ? "Even" : "Odd"} @ ${t.stake}`
                      : `${l.contract_type === "DIGITOVER" ? "Over" : "Under"} ${l.barrier}`,
                  )
                  .join(" + ")}
              </td>
              <td className="px-4 py-3">
                {t.status === "failed" ? (
                  <span className="text-rose-400" title={t.reason}>
                    failed
                  </span>
                ) : t.status === "open" ? (
                  <span className="text-amber-400">open</span>
                ) : (
                  <span className="text-slate-400">settled</span>
                )}
              </td>
              <td
                className={`px-4 py-3 text-right font-semibold ${
                  t.profit === null
                    ? "text-slate-500"
                    : t.profit >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                }`}
              >
                {t.profit === null ? "—" : t.profit.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPrinter;
