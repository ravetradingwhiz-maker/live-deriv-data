import { useId } from 'react';

/**
 * Multi-color "AI sparkle" icon for the Nexora AI brand. Uses an SVG gradient
 * (cyan → violet → amber) on the Lucide sparkles path. The gradient id is unique
 * per instance so multiple stars on a page (incl. hidden ones) all render.
 */
const NexoraStar = ({ size = 24, className = '' }: { size?: number; className?: string }) => {
    const gradId = useId();
    return (
        <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className} aria-hidden='true'>
            <defs>
                <linearGradient id={gradId} x1='2' y1='2' x2='22' y2='22' gradientUnits='userSpaceOnUse'>
                    <stop offset='0%' stopColor='#22d3ee' />
                    <stop offset='50%' stopColor='#a855f7' />
                    <stop offset='100%' stopColor='#f59e0b' />
                </linearGradient>
            </defs>
            <g stroke={`url(#${gradId})`} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z' />
                <path d='M20 3v4' />
                <path d='M22 5h-4' />
                <path d='M4 17v2' />
                <path d='M5 18H3' />
            </g>
        </svg>
    );
};

export default NexoraStar;
