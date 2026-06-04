import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { CONTRACT_TYPES } from '@/constants/contracts';
import TradeTypeIcon from '@/components/trade-type/TradeTypeIcon';

interface ContractTypeModalProps {
    open: boolean;
    onClose: () => void;
    activeId: string;
    onSelect: (id: string) => void;
}

const ContractTypeModal = ({ open, onClose, activeId, onSelect }: ContractTypeModalProps) => {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const categories = Array.from(new Set(CONTRACT_TYPES.map(c => c.category)));

    return (
        <div
            className='fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4'
            onClick={e => e.target === e.currentTarget && onClose()}
            role='dialog'
            aria-modal='true'
        >
            <div className='max-h-[80vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-ink-800 sm:max-w-md sm:rounded-2xl'>
                <div className='sticky top-0 flex items-center justify-between border-b border-line bg-ink-800 px-5 py-3'>
                    <h2 className='text-base font-bold text-white'>Contract type</h2>
                    <button
                        className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-slate-300 hover:text-white'
                        onClick={onClose}
                        aria-label='Close'
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className='p-3'>
                    {categories.map(cat => (
                        <div key={cat} className='mb-3'>
                            <p className='px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500'>
                                {cat}
                            </p>
                            {CONTRACT_TYPES.filter(c => c.category === cat).map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        onSelect(c.id);
                                        onClose();
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                                        c.id === activeId ? 'bg-ink-700' : 'hover:bg-ink-700'
                                    }`}
                                >
                                    <span className='flex h-8 w-8 items-center justify-center rounded-md bg-ink-900'>
                                        <TradeTypeIcon type={c.up.icon} size='sm' />
                                    </span>
                                    <span className='flex-1 text-sm font-semibold text-white'>{c.name}</span>
                                    {c.id === activeId && <Check size={16} className='text-cyan-400' />}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ContractTypeModal;
