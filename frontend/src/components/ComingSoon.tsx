import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ComingSoonProps {
    icon?: LucideIcon;
    /** Custom icon node (e.g. the gradient Nexora star); takes precedence over `icon`. */
    iconNode?: ReactNode;
    title: string;
    description?: string;
}

/** Placeholder shown for tab pages that aren't built yet. */
const ComingSoon = ({ icon: Icon, iconNode, title, description }: ComingSoonProps) => (
    <div className='flex min-h-[50vh] flex-col items-center justify-center text-center'>
        <span className='flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-800 text-cyan-400'>
            {iconNode ?? (Icon ? <Icon size={30} /> : null)}
        </span>
        <h2 className='mt-5 text-2xl font-bold text-white'>{title}</h2>
        <p className='mt-2 max-w-md text-sm text-slate-400'>{description ?? 'This section is coming soon.'}</p>
        <span className='mt-5 rounded-full border border-line bg-ink-800 px-3 py-1 text-xs font-semibold text-cyan-300'>
            Coming soon
        </span>
    </div>
);

export default ComingSoon;
