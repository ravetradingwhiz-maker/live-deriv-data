import { NavLink } from 'react-router-dom';
import { CandlestickChart, Crown, History, ListChecks, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import NexoraStar from '@/components/NexoraStar';

export interface Tab {
    to: string;
    label: string;
    /** Two-line label for the mobile bottom bar (kept uniform across items). */
    lines: [string, string];
    icon?: LucideIcon;
    /** Use the multi-color Nexora star instead of a lucide icon. */
    star?: boolean;
    /** Icon color. */
    color?: string;
}

export const APP_TABS: Tab[] = [
    { to: '/app/manual', label: 'Manual Trading', lines: ['Manual', 'Trading'], icon: CandlestickChart, color: 'text-cyan-400' },
    { to: '/app/trade-pilot-free', label: 'Nexora AI Free', lines: ['Nexora AI', 'Free'], star: true },
    { to: '/app/trade-pilot-premium', label: 'Nexora AI Premium', lines: ['Nexora AI', 'Premium'], icon: Crown, color: 'text-amber-400' },
    { to: '/app/open-positions', label: 'Open Positions', lines: ['Open', 'Positions'], icon: ListChecks, color: 'text-sky-400' },
    { to: '/app/trade-history', label: 'Trade History', lines: ['Trade', 'History'], icon: History, color: 'text-violet-400' },
    { to: '/app/pricing', label: 'AI Pricing', lines: ['AI', 'Pricing'], icon: Tag, color: 'text-emerald-400' },
];

/**
 * Horizontal, scrollable tab navigation shown below the header. Divider lines
 * sit on the inner container so they align with the content width.
 */
const TabNav = () => (
    <div className='sticky top-16 z-30 hidden bg-ink-900/95 backdrop-blur md:block'>
        <nav className='container-page flex gap-2 overflow-x-auto border-y border-line py-2.5 md:overflow-visible'>
            {APP_TABS.map(tab => {
                const Icon = tab.icon;
                return (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        className={({ isActive }) =>
                            `flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all md:flex-1 ${
                                isActive
                                    ? 'border-cyan-400 bg-cyan-600 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.6),0_0_18px_rgba(34,211,238,0.55)]'
                                    : 'border-line bg-ink-800 text-slate-200 hover:border-cyan-700 hover:text-cyan-300'
                            }`
                        }
                    >
                        {tab.star ? <NexoraStar size={17} /> : Icon && <Icon size={17} className={tab.color} />}
                        {tab.label}
                    </NavLink>
                );
            })}
        </nav>
    </div>
);

export default TabNav;
