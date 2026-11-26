import { NavLink } from 'react-router-dom';
import { Crown, LayoutDashboard, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import NexoraStar from '@/components/NexoraStar';

export interface Tab {
    to: string;
    label: string;
    /** What the mobile bar calls it, where the full name has no room. */
    short: string;
    icon?: LucideIcon;
    /** Use the multi-color Nexora star instead of a lucide icon. */
    star?: boolean;
    /** Icon color. */
    color?: string;
}

export const APP_TABS: Tab[] = [
    { to: '/app/dashboard', label: 'Dashboard', short: 'Dashboard', icon: LayoutDashboard, color: 'text-cyan-400' },
    { to: '/app/trade-pilot-free', label: 'Nexora AI Free', short: 'Free', star: true },
    {
        to: '/app/trade-pilot-premium',
        label: 'Nexora AI Premium',
        short: 'Premium',
        icon: Crown,
        color: 'text-amber-400',
    },
    // Open positions and trade history are not tabs: both live in the
    // positions panel, which is reachable from every tab rather than being one.
    { to: '/app/pricing', label: 'AI Pricing', short: 'Pricing', icon: Tag, color: 'text-emerald-400' },
];

/**
 * The tabs themselves, in whichever bar is carrying them.
 *
 * Where you are is said with a rule under the label and the label turning
 * white. It was a filled pill with two glow shadows, which made the quietest
 * statement on the page — you are here — the loudest thing on it.
 */
const TabLinks = ({ className }: { className?: string }) => (
    <nav className={className}>
        {APP_TABS.map(tab => {
            const Icon = tab.icon;
            return (
                <NavLink
                    key={tab.to}
                    to={tab.to}
                    className={({ isActive }) =>
                        `relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                            isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            {tab.star ? <NexoraStar size={17} /> : Icon && <Icon size={17} className={tab.color} />}
                            {tab.label}
                            {/* Always rendered, so moving between tabs is the rule
                                fading rather than one element replacing another. */}
                            <span
                                aria-hidden='true'
                                className={`absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-cyan-400 transition-opacity duration-200 ${
                                    isActive ? 'opacity-100' : 'opacity-0'
                                }`}
                            />
                        </>
                    )}
                </NavLink>
            );
        })}
    </nav>
);

/**
 * The tabs inside the app header, from `xl` up.
 *
 * The header's middle was empty across its whole width while the tabs took a
 * second bar of their own — 112px of chrome before any page began. One bar
 * carries both.
 *
 * `xl` and not `lg`: the brand, four labels and the account controls come to
 * roughly a thousand pixels, which is more than a 1024px window has once the
 * page gutters are off it. The row below is the one that has to hold a tab
 * nobody can read, so the merge waits for the width rather than taking it.
 *
 * Centred on the bar rather than on the space left over, which is why it is
 * taken out of the flow: the brand on one side and the account controls on
 * the other are nowhere near the same width, so a nav centred between them
 * would sit visibly off the middle of the page it belongs to.
 */
export const HeaderTabs = () => (
    <TabLinks className='absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 xl:flex' />
);

/**
 * The tabs on their own row, between `md` and `xl`.
 *
 * Four labels plus the brand and the account controls genuinely do not fit on
 * one line at those widths, and shrinking the type to force it would cost more
 * than the row saves.
 */
const TabNav = () => (
    <div className='sticky top-16 z-30 hidden bg-ink-900/95 backdrop-blur md:block xl:hidden'>
        {/* The scroll lives on the outside and the centring on the inside. A
            row that is both centred and scrollable puts its first tab out of
            reach the moment the set is wider than the window; `w-max` means
            the centring simply stops applying at that point. */}
        <div className='container-page overflow-x-auto border-b border-line'>
            <TabLinks className='mx-auto flex w-max gap-1 py-1.5' />
        </div>
    </div>
);

export default TabNav;
