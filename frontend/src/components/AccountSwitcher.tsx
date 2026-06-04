import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAdminOptional } from '@/context/AdminContext';
import CurrencyIcon from '@/components/CurrencyIcon';

const fmt = (value: number, currency?: string): string =>
    `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${
        currency ?? ''
    }`.trim();

const Avatar = ({ isDemo, currency }: { isDemo: boolean; currency?: string }) => (
    <span className='flex h-9 w-9 shrink-0 items-center justify-center'>
        <CurrencyIcon currency={currency} isVirtual={isDemo} iconSize='sm' />
    </span>
);

/**
 * Header account switcher (modeled on quantumsyn's): shows the active account +
 * balance, a dropdown to switch between accounts (with live balances), and the
 * log out action inside the menu.
 */
const AccountSwitcher = () => {
    const { accounts, activeLoginId, balance, balanceCurrency, balances, switchAccount, logout } = useAuth();
    const admin = useAdminOptional();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const active = accounts.find(a => a.loginid === activeLoginId) ?? accounts[0];
    if (!active) return null;

    // Active account always listed first in the dropdown.
    const ordered = [active, ...accounts.filter(a => a.loginid !== active.loginid)];

    // In admin (fake-trade) mode the active account shows the simulated balance.
    const activeBalance = admin?.active ? admin.fakeBalance : (balance ?? balances[active.loginid]?.balance ?? 0);
    const activeCurrency =
        admin?.active ? admin.currency : (balanceCurrency ?? balances[active.loginid]?.currency ?? active.currency);

    return (
        <div className='relative' ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className='flex items-center gap-2.5 rounded-full border border-line bg-ink-800 py-1.5 pl-1.5 pr-3 transition-colors hover:border-cyan-600'
                aria-haspopup='menu'
                aria-expanded={open}
            >
                <Avatar isDemo={active.is_demo} currency={active.currency} />
                <span className='text-left leading-tight'>
                    <span className='block whitespace-nowrap font-mono text-sm font-semibold text-emerald-400'>
                        {fmt(activeBalance, activeCurrency)}
                    </span>
                    <span className='block whitespace-nowrap text-[11px] text-slate-400'>
                        {active.is_demo ? 'Demo account' : 'Real account'}
                    </span>
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className='absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-ink-800 shadow-2xl shadow-black/50'>
                    <p className='px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-500'>
                        Your accounts
                    </p>
                    <div className='max-h-72 overflow-y-auto'>
                        {ordered.map(acc => {
                            const isActive = acc.loginid === activeLoginId;
                            // The account admin mode is bound to always shows the fake
                            // balance — even while viewing a different account.
                            const isAdminAcc = !!admin?.adminLoginid && acc.loginid === admin.adminLoginid;
                            const b = balances[acc.loginid];
                            return (
                                <button
                                    key={acc.loginid}
                                    onClick={() => {
                                        switchAccount(acc.loginid);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink-700 ${
                                        isActive ? 'bg-ink-700' : ''
                                    }`}
                                >
                                    <Avatar isDemo={acc.is_demo} currency={acc.currency} />
                                    <span className='min-w-0 flex-1'>
                                        <span className='block text-sm font-semibold text-white'>
                                            {acc.is_demo ? 'Demo account' : 'Real account'}
                                        </span>
                                        <span className='block whitespace-nowrap font-mono text-xs text-emerald-400'>
                                            {isAdminAcc
                                                ? fmt(admin!.fakeBalance, admin!.adminCurrency)
                                                : b
                                                  ? fmt(b.balance, b.currency)
                                                  : acc.currency}
                                        </span>
                                    </span>
                                    {isActive && <Check size={16} className='shrink-0 text-cyan-400' />}
                                </button>
                            );
                        })}
                    </div>
                    <div className='border-t border-line'>
                        <button
                            onClick={() => {
                                setOpen(false);
                                logout();
                                navigate('/');
                            }}
                            className='flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-rose-300 transition-colors hover:bg-ink-700'
                        >
                            <LogOut size={16} />
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountSwitcher;
