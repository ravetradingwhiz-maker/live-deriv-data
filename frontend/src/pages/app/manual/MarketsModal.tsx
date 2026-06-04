import { useEffect, useMemo, useState } from 'react';
import { Search, Star, X } from 'lucide-react';
import MarketIcon from '@/components/market/MarketIcon';
import type { ActiveSymbol } from '@/services/trade-api';

interface MarketsModalProps {
    open: boolean;
    onClose: () => void;
    symbols: ActiveSymbol[];
    activeSymbol: string;
    favorites: string[];
    onToggleFavorite: (symbol: string) => void;
    onSelect: (symbol: string) => void;
}

const FAVORITES = '__favorites__';

const MarketsModal = ({
    open,
    onClose,
    symbols,
    activeSymbol,
    favorites,
    onToggleFavorite,
    onSelect,
}: MarketsModalProps) => {
    const [search, setSearch] = useState('');
    const [market, setMarket] = useState<string>(FAVORITES);

    // Build the market categories (with counts) from the symbol list.
    const markets = useMemo(() => {
        const map = new Map<string, { key: string; label: string; count: number }>();
        symbols.forEach(s => {
            const entry = map.get(s.market) ?? { key: s.market, label: s.market_display_name, count: 0 };
            entry.count += 1;
            map.set(s.market, entry);
        });
        return Array.from(map.values());
    }, [symbols]);

    // Default to the active symbol's market when opening (if no favorites).
    useEffect(() => {
        if (!open) return;
        setSearch('');
        if (favorites.length === 0) {
            const active = symbols.find(s => s.symbol === activeSymbol);
            setMarket(active?.market ?? markets[0]?.key ?? FAVORITES);
        } else {
            setMarket(FAVORITES);
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (q) {
            return symbols.filter(
                s => s.display_name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q)
            );
        }
        if (market === FAVORITES) return symbols.filter(s => favorites.includes(s.symbol));
        return symbols.filter(s => s.market === market);
    }, [search, market, symbols, favorites]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className='fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-0 sm:items-center sm:p-4'
            onClick={e => e.target === e.currentTarget && onClose()}
            role='dialog'
            aria-modal='true'
        >
            <div className='flex h-full w-full flex-col overflow-hidden bg-ink-800 sm:h-[80vh] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-line'>
                {/* Header + search */}
                <div className='border-b border-line p-4'>
                    <div className='mb-3 flex items-center justify-between'>
                        <h2 className='text-lg font-bold text-white'>Markets</h2>
                        <button
                            className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-300 hover:text-white'
                            onClick={onClose}
                            aria-label='Close'
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className='flex items-center gap-2 rounded-lg border border-line bg-ink-900 px-3'>
                        <Search size={16} className='text-slate-500' />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder='Search… (symbol or name)'
                            className='w-full bg-transparent py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none'
                        />
                    </div>
                </div>

                <div className='flex min-h-0 flex-1'>
                    {/* Categories */}
                    {!search && (
                        <div className='w-32 shrink-0 overflow-y-auto border-r border-line py-2 sm:w-44'>
                            <button
                                onClick={() => setMarket(FAVORITES)}
                                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm ${
                                    market === FAVORITES ? 'bg-ink-700 text-cyan-300' : 'text-slate-300 hover:bg-ink-700'
                                }`}
                            >
                                Favorites
                                <span className='text-xs text-slate-500'>{favorites.length}</span>
                            </button>
                            {markets.map(m => (
                                <button
                                    key={m.key}
                                    onClick={() => setMarket(m.key)}
                                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm ${
                                        market === m.key ? 'bg-ink-700 text-cyan-300' : 'text-slate-300 hover:bg-ink-700'
                                    }`}
                                >
                                    <span className='truncate'>{m.label}</span>
                                    <span className='ml-1 shrink-0 text-xs text-slate-500'>{m.count}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Symbol list */}
                    <div className='min-w-0 flex-1 overflow-y-auto py-2'>
                        {visible.length === 0 && (
                            <p className='px-4 py-6 text-center text-sm text-slate-500'>No symbols found.</p>
                        )}
                        {visible.map(s => {
                            const isActive = s.symbol === activeSymbol;
                            const isFav = favorites.includes(s.symbol);
                            return (
                                <div
                                    key={s.symbol}
                                    className={`flex items-center gap-3 px-4 py-2.5 ${
                                        isActive ? 'bg-ink-700' : 'hover:bg-ink-700'
                                    }`}
                                >
                                    <button
                                        className='flex min-w-0 flex-1 items-center gap-3 text-left'
                                        onClick={() => {
                                            onSelect(s.symbol);
                                            onClose();
                                        }}
                                    >
                                        <MarketIcon type={s.symbol} size='sm' />
                                        <span className='min-w-0'>
                                            <span className='block truncate text-sm font-semibold text-white'>
                                                {s.display_name}
                                            </span>
                                            <span className='block text-xs text-slate-500'>{s.symbol}</span>
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => onToggleFavorite(s.symbol)}
                                        aria-label='Toggle favorite'
                                        className='shrink-0 p-1'
                                    >
                                        <Star
                                            size={18}
                                            className={isFav ? 'fill-cyan-400 text-cyan-400' : 'text-slate-600'}
                                        />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketsModal;
