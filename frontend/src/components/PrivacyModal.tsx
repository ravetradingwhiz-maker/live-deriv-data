import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, X } from 'lucide-react';

interface PrivacyModalProps {
    open: boolean;
    onClose: () => void;
    /** When true, the user must tick the checkbox before they can continue, and
     *  the modal cannot be dismissed via the backdrop, Escape, or a close button. */
    requireAccept?: boolean;
    /** Called when the user accepts (only used in requireAccept mode). */
    onAccept?: () => void;
}

/**
 * Privacy Policy modal. Includes the Risk Disclaimer (ported from quantumsyn).
 * Can act as a first-visit consent gate via `requireAccept`.
 */
const PrivacyModal = ({ open, onClose, requireAccept = false, onAccept }: PrivacyModalProps) => {
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        if (open) setAccepted(false);
    }, [open]);

    useEffect(() => {
        if (!open || requireAccept) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, requireAccept, onClose]);

    if (!open) return null;

    const handleBackdrop = (e: React.MouseEvent) => {
        if (requireAccept) return; // gate mode: cannot dismiss by clicking outside
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className='fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4'
            onClick={handleBackdrop}
            role='dialog'
            aria-modal='true'
            aria-labelledby='privacy-title'
        >
            <div className='flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-ink-800'>
                {/* Header */}
                <div className='flex items-center justify-between border-b border-line px-6 py-4'>
                    <div className='flex items-center gap-2.5'>
                        <ShieldCheck size={22} className='text-cyan-400' />
                        <h2 id='privacy-title' className='text-lg font-bold text-white'>
                            Privacy Policy
                        </h2>
                    </div>
                    {!requireAccept && (
                        <button
                            className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-300 hover:text-white'
                            onClick={onClose}
                            aria-label='Close'
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className='space-y-6 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-slate-300'>
                    {requireAccept && (
                        <p className='rounded-lg border border-cyan-900 bg-ink-900 px-4 py-3 text-cyan-200'>
                            Before you continue, please read and accept our Privacy Policy and Risk Disclaimer.
                        </p>
                    )}

                    <section className='space-y-2'>
                        <h3 className='font-semibold text-white'>Your privacy</h3>
                        <p>
                            Live Deriv Data Analysis connects to your Deriv account through the official Deriv API using
                            OAuth. We never see or store your Deriv password. Authentication tokens are kept only in
                            your browser&apos;s local storage and are used solely to communicate with Deriv on your
                            behalf.
                        </p>
                    </section>

                    <section className='space-y-2'>
                        <h3 className='font-semibold text-white'>What we access</h3>
                        <ul className='list-disc space-y-1.5 pl-5'>
                            <li>Your account list, balance, and trade activity needed to operate the platform.</li>
                            <li>A scoped access token granted by you during login — revocable at any time in Deriv.</li>
                        </ul>
                    </section>

                    {/* Risk Disclaimer (ported from quantumsyn) */}
                    <section className='space-y-2 rounded-xl border border-cyan-900 bg-ink-900 p-4'>
                        <div className='flex items-center gap-2'>
                            <ShieldAlert size={20} className='text-amber-400' />
                            <h3 className='font-semibold text-white'>Risk Disclaimer</h3>
                        </div>
                        <p>
                            Deriv offers complex derivatives, such as options and contracts for difference
                            (&ldquo;CFDs&rdquo;). These products may not be suitable for all clients, and trading them
                            puts you at risk.
                        </p>
                        <p>Please make sure that you understand the following risks before trading Deriv products:</p>
                        <ul className='list-disc space-y-1.5 pl-5'>
                            <li>You may lose some or all of the money you invest in the trade.</li>
                            <li>
                                If your trade involves currency conversion, exchange rates will affect your profit and
                                loss.
                            </li>
                        </ul>
                        <p className='font-semibold text-amber-300'>
                            You should never trade with borrowed money or with money that you cannot afford to lose.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className='space-y-3 border-t border-line px-6 py-4'>
                    {requireAccept && (
                        <label className='flex cursor-pointer items-start gap-2.5 text-sm text-slate-300'>
                            <input
                                type='checkbox'
                                checked={accepted}
                                onChange={e => setAccepted(e.target.checked)}
                                className='mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-cyan-500'
                            />
                            <span>
                                I have read and accept the Privacy Policy and Risk Disclaimer, and I understand the
                                risks of trading.
                            </span>
                        </label>
                    )}
                    <button
                        className='btn-primary w-full'
                        disabled={requireAccept && !accepted}
                        onClick={requireAccept ? onAccept : onClose}
                    >
                        {requireAccept ? 'Accept & Continue' : 'I Understand'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyModal;
