import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, UserRound } from 'lucide-react';
import { NICKNAME_MAX } from '@/hooks/useNickname';

interface Props {
    /** Pre-filled suggestion — the Deriv first name, when there is one. */
    suggestion?: string | null;
    initial?: string | null;
    /** The save is a network call now, so the dialog has to wait on it. */
    saving?: boolean;
    error?: string | null;
    onSave: (value: string) => void;
    /** Called once a name has been saved. There is no other way out. */
    onDone: () => void;
}

/**
 * Asks the user what to call them. Portaled to <body> so it sits above the
 * header's backdrop-blur layers, matching the app's other modals.
 *
 * Answering is required, so this has no close control, no backdrop dismissal
 * and no Escape handler: saving a name is the only way out.
 */
const NicknameModal = ({ suggestion, initial, saving, error, onSave, onDone }: Props) => {
    const [value, setValue] = useState(initial ?? suggestion ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const trimmed = value.trim();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!trimmed || saving) return;
        onSave(trimmed);
    };

    /* Closes only once the save has actually landed. Closing on submit would
       dismiss the dialog over a request that then failed, leaving the user
       believing a name was saved that never was. */
    const savedRef = useRef(false);
    useEffect(() => {
        if (saving) savedRef.current = true;
        else if (savedRef.current && !error) onDone();
    }, [saving, error, onDone]);

    return createPortal(
        <div
            className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
            role='dialog'
            aria-modal='true'
            aria-label='Choose a nickname'
        >
            <form
                onSubmit={submit}
                className='relative w-full max-w-sm overflow-hidden rounded-2xl border border-cyan-400/40 bg-ink-800 p-6 text-center shadow-2xl'
            >
                <div className='pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-cyan-400/25 blur-3xl' />

                <div className='relative flex flex-col items-center gap-3'>
                    <div className='flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300'>
                        <UserRound size={28} />
                    </div>

                    <h2 className='text-lg font-extrabold text-white'>What should we call you?</h2>

                    <input
                        ref={inputRef}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        maxLength={NICKNAME_MAX}
                        placeholder='Enter your Nickname'
                        aria-label='Enter your Nickname'
                        className='mt-1 w-full rounded-lg border border-line bg-ink-900 px-4 py-2.5 text-center text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none'
                    />

                    <button
                        type='submit'
                        disabled={!trimmed || saving}
                        className='mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-6 py-2.5 font-bold text-[#04121a] transition-colors hover:bg-cyan-400 disabled:opacity-50'
                    >
                        {saving && <Loader2 size={15} className='animate-spin' />}
                        Save
                    </button>

                    {error && <p className='text-xs text-rose-400'>{error}</p>}
                </div>
            </form>
        </div>,
        document.body
    );
};

export default NicknameModal;
