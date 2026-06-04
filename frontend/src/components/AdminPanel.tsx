import { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

/**
 * Admin (fake-trade) setup. When the logged-in account is an admin and the mode
 * isn't active yet, a "Set balance" modal auto-pops so they can start. There is
 * no on-screen control to exit admin mode — admins simply log out to leave it.
 */
const AdminPanel = () => {
    const { eligible, needsSetup, currency, activate, dismissSetup } = useAdmin();

    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(1000);

    // Auto-open the modal the moment admin is detected (before activation).
    useEffect(() => {
        if (needsSetup) setOpen(true);
    }, [needsSetup]);

    if (!eligible || !open) return null;

    const valid = Number.isFinite(amount) && amount > 0;

    const onConfirm = () => {
        if (!valid) return;
        activate(amount);
        setOpen(false);
    };

    const onClose = () => {
        setOpen(false);
        dismissSetup();
    };

    return (
        <div className='fixed inset-0 z-[60] flex items-center justify-center p-4'>
            <div className='absolute inset-0 bg-black/60' onClick={onClose} />
            <div className='relative w-full max-w-sm rounded-2xl border border-violet-500/40 bg-ink-900 p-5 shadow-2xl'>
                <button
                    type='button'
                    aria-label='Close — stay in normal mode'
                    onClick={onClose}
                    className='absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-300 hover:bg-ink-800 hover:text-white'
                >
                    <X size={18} />
                </button>

                <div className='flex items-center gap-2'>
                    <span className='flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/20 text-violet-300'>
                        <ShieldCheck size={18} />
                    </span>
                    <div>
                        <h2 className='text-base font-bold text-white'>Admin mode</h2>
                        <p className='text-[11px] text-slate-400'>Set a starting balance to begin.</p>
                    </div>
                </div>

                <label className='mt-4 flex flex-col gap-1'>
                    <span className='text-xs font-medium text-slate-400'>Balance ({currency})</span>
                    <input
                        type='number'
                        min={0}
                        step='any'
                        autoFocus
                        value={Number.isFinite(amount) ? amount : ''}
                        onChange={e => setAmount(parseFloat(e.target.value))}
                        className='rounded-lg border border-line bg-ink-800 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-violet-400'
                    />
                </label>

                <button
                    type='button'
                    onClick={onConfirm}
                    disabled={!valid}
                    className='mt-4 w-full rounded-full bg-violet-600 py-2.5 font-bold text-white transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50'
                >
                    Activate admin mode
                </button>

                <button
                    type='button'
                    onClick={onClose}
                    className='mt-2 w-full rounded-full py-2 text-xs font-semibold text-slate-400 transition-colors hover:text-white'
                >
                    No thanks, continue normally
                </button>
            </div>
        </div>
    );
};

export default AdminPanel;
