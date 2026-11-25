import type { ReactNode } from 'react';

interface SectionCardProps {
    title: string;
    /** The control on the right of the header, if the section has one. */
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}

/**
 * A titled panel.
 *
 * The header used to carry an icon on a tinted disc and a line of prose under
 * the title. The prose restated the title — "Track your account performance
 * over time" under "Performance Overview" — and the disc was the same
 * decoration on every section, so both are gone. The border stays here and
 * not on the stat tiles, which is what tells the two apart.
 */
const SectionCard = ({ title, action, children, className = '' }: SectionCardProps) => (
    /* min-w-0 so the card may shrink below its content, overflow-hidden so
       anything that still will not fit is clipped here rather than pushing
       the page sideways. */
    <section
        className={`min-w-0 overflow-hidden rounded-xl border border-line bg-ink-800/60 p-4 sm:p-5 ${className}`}
    >
        <header className='flex items-center justify-between gap-3'>
            <h2 className='min-w-0 truncate text-base font-bold text-white sm:text-lg'>{title}</h2>
            {action && <div className='shrink-0'>{action}</div>}
        </header>

        <div className='mt-4 min-w-0'>{children}</div>
    </section>
);

export default SectionCard;
