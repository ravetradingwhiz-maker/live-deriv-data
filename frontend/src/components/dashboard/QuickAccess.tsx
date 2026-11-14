import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight, Crown, Gem, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { StatTone } from '@/components/dashboard/StatCard';

const TONES: Record<StatTone, { fg: string; disc: string }> = {
    emerald: { fg: 'text-emerald-400', disc: 'bg-emerald-400/10' },
    violet: { fg: 'text-violet-300', disc: 'bg-violet-300/10' },
    cyan: { fg: 'text-cyan-300', disc: 'bg-cyan-300/10' },
    amber: { fg: 'text-amber-300', disc: 'bg-amber-300/10' },
};

interface QuickLink {
    to: string;
    icon: LucideIcon;
    tone: StatTone;
    title: string;
    subtitle: string;
}

/** Every row goes somewhere the app already has. */
const LINKS: QuickLink[] = [
    {
        to: '/app/trade-pilot-free',
        icon: Sparkles,
        tone: 'violet',
        title: 'Nexora AI Free',
        subtitle: 'Basic AI trading features',
    },
    {
        to: '/app/trade-pilot-premium',
        icon: Crown,
        tone: 'amber',
        title: 'Nexora AI Premium',
        subtitle: 'Advanced tools & strategies',
    },
    {
        to: '/app/pricing',
        icon: Gem,
        tone: 'cyan',
        title: 'Pricing',
        subtitle: 'Choose your plan',
    },
    {
        to: '/app/pricing',
        icon: BarChart3,
        tone: 'emerald',
        title: 'Better Tools',
        subtitle: 'Bigger Opportunities',
    },
];

/** The platforms and tools, one tap each. */
const QuickAccess = () => (
    /* One per row on a phone, as the reference has it; two up once there is
       width for them, so the section does not run long on a desktop. */
    <div className='grid gap-2 sm:grid-cols-2'>
        {LINKS.map(({ to, icon: Icon, tone, title, subtitle }) => {
            const { fg, disc } = TONES[tone];
            return (
                <Link
                    key={title}
                    to={to}
                    className='flex items-center gap-3 rounded-xl border border-line bg-ink-800/40 px-3 py-3 transition-colors hover:border-cyan-700/60 hover:bg-ink-800'
                >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${disc}`}>
                        <Icon size={18} className={fg} />
                    </span>
                    <span className='min-w-0 flex-1'>
                        <span className='block truncate text-sm font-bold text-white'>{title}</span>
                        <span className='block truncate text-xs text-slate-500'>{subtitle}</span>
                    </span>
                    <ChevronRight size={18} className='shrink-0 text-slate-500' />
                </Link>
            );
        })}
    </div>
);

export default QuickAccess;
