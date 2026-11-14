import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { StatTone } from '@/components/dashboard/StatCard';

const TONES: Record<StatTone, { fg: string; disc: string }> = {
    emerald: { fg: 'text-emerald-400', disc: 'bg-emerald-400/10' },
    violet: { fg: 'text-violet-300', disc: 'bg-violet-300/10' },
    cyan: { fg: 'text-cyan-300', disc: 'bg-cyan-300/10' },
    amber: { fg: 'text-amber-300', disc: 'bg-amber-300/10' },
};

interface SectionCardProps {
    icon: LucideIcon;
    tone: StatTone;
    title: string;
    subtitle?: string;
    /** The control on the right of the header, if the section has one. */
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}

/** A titled panel: the two big cards below the figures share this frame. */
const SectionCard = ({ icon: Icon, tone, title, subtitle, action, children, className = '' }: SectionCardProps) => {
    const { fg, disc } = TONES[tone];

    return (
        <section className={`rounded-xl border border-line bg-ink-800/60 p-4 sm:p-5 ${className}`}>
            <header className='flex items-start justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-3'>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${disc}`}>
                        <Icon size={17} className={fg} />
                    </span>
                    <div className='min-w-0'>
                        <h2 className='truncate text-base font-bold text-white sm:text-lg'>{title}</h2>
                        {subtitle && <p className='truncate text-xs text-slate-500'>{subtitle}</p>}
                    </div>
                </div>
                {action && <div className='shrink-0'>{action}</div>}
            </header>

            <div className='mt-4'>{children}</div>
        </section>
    );
};

export default SectionCard;
