import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight, Crown, Gem, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface QuickLink {
    to: string;
    icon: LucideIcon;
    title: string;
    subtitle: string;
}

/** Every row goes somewhere the app already has. */
const LINKS: QuickLink[] = [
    {
        to: '/app/trade-pilot-free',
        icon: Sparkles,
        title: 'Nexora AI Free',
        subtitle: 'Basic AI trading features',
    },
    {
        to: '/app/trade-pilot-premium',
        icon: Crown,
        title: 'Nexora AI Premium',
        subtitle: 'Advanced tools & strategies',
    },
    {
        to: '/app/pricing',
        icon: Gem,
        title: 'Pricing',
        subtitle: 'Choose your plan',
    },
    {
        to: '/app/pricing',
        icon: BarChart3,
        title: 'Better Tools',
        subtitle: 'Bigger Opportunities',
    },
];

/** The platforms and tools, one tap each. */
const QuickAccess = () => (
    /* One per row on a phone, as the reference has it; two up once there is
       width for them, so the section does not run long on a desktop. */
    <div className='grid gap-2 sm:grid-cols-2'>
        {LINKS.map(({ to, icon: Icon, title, subtitle }) => (
            <Link
                key={title}
                to={to}
                /* The icon stays — it is what makes a row scannable — but the
                   tinted disc behind it was the same decoration four times in
                   four different colours, saying nothing each time. */
                className='flex items-center gap-3 rounded-lg bg-ink-800/40 px-3 py-3 transition-colors hover:bg-ink-800'
            >
                <Icon size={18} className='shrink-0 text-cyan-300' />
                <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-bold text-white'>{title}</span>
                    <span className='block truncate text-xs text-slate-500'>{subtitle}</span>
                </span>
                <ChevronRight size={16} className='shrink-0 text-slate-600' />
            </Link>
        ))}
    </div>
);

export default QuickAccess;
