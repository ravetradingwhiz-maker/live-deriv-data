import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserRound, X } from 'lucide-react';
import { NICKNAME_MAX } from '@/hooks/useNickname';

interface Props {
    /** Pre-filled suggestion — the Deriv first name, when there is one. */
    suggestion?: string | null;
    /** What the greeting falls back to, shown so the choice is concrete. */
    loginid: string | null;
    initial?: string | null;
    onSave: (value: string) => void;
    onClose: () => void;
}

/**
 * Asks the user what to call them. Portaled to <body> so it sits above the
 * header's backdrop-blur layers, matching the app's other modals.
 */
const NicknameModal = ({ suggestion, loginid, initial, onSave, onClose }: Props) => {
    const [value, setValue] = useState(initial ?? suggestion ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const trimmed = value.trim();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!trimmed) return;
        onSave(trimmed);
        onClose();
    };

    return createPortal(
        <div
            className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
            onClick={onClose}
            role='dialog'
            aria-modal='true'
            aria-label='Choose a nickname'
        >
            <form
                onClick={e => e.stopPropagation()}
                onSubmit={submit}
                className='relative w-full max-w-sm overflow-hidden rounded-2xl border border-cyan-400/40 bg-ink-800 p-6 text-center shadow-2xl'
            >
                <div className='pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-cyan-400/25 blur-3xl' />

                <button
                    type='button'
                    onClick={onClose}
                    aria-label='Close'
                    className='absolute right-3 top-3 text-slate-400 transition-colors hover:text-white'
                >
                    <X size={18} />
                </button>

                <div className='relative flex flex-col items-center gap-3'>
                    <div className='flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300'>
                        <UserRound size={28} />
                    </div>

                    <h2 className='text-lg font-extrabold text-white'>What should we call you?</h2>

                    {loginid && (
                        <p className='text-sm text-slate-400'>
                            We show <span className='font-mono text-slate-300'>{loginid}</span> until you pick a
                            name.
                        </p>
                    )}

                    <input
                        ref={inputRef}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        maxLength={NICKNAME_MAX}
                        placeholder='Nickname'
                        aria-label='Nickname'
                        className='mt-1 w-full rounded-lg border border-line bg-ink-900 px-4 py-2.5 text-center text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none'
                    />

                    <button
                        type='submit'
                        disabled={!trimmed}
                        className='mt-1 w-full rounded-lg bg-cyan-500 px-6 py-2.5 font-bold text-[#04121a] transition-colors hover:bg-cyan-400 disabled:opacity-50'
                    >
                        Save
                    </button>

                    <button
                        type='button'
                        onClick={onClose}
                        className='text-xs text-slate-500 transition-colors hover:text-slate-300'
                    >
                        Not now
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
};

export default NicknameModal;
