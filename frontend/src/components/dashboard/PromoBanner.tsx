import { Link } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ArrowRight, Crown } from 'lucide-react';

/**
 * The upgrade, at the end of the scroll.
 *
 * Points at the plans rather than at a checkout: what it is selling is the
 * premium tier, and choosing one comes first.
 */
const PromoBanner = () => (
    <Link
        to='/app/pricing'
        className='group relative flex items-center gap-3 overflow-hidden rounded-xl border border-violet-300/30 bg-gradient-to-r from-violet-300/10 via-ink-800/60 to-cyan-300/10 p-4 transition-colors hover:border-violet-300/50'
    >
        <div className='min-w-0 flex-1'>
            <span className='inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300'>
                <span className='flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/50 bg-amber-400/10'>
                    <Crown size={11} />
                </span>
                Trade Smarter
            </span>
            <p className='mt-1 text-lg font-extrabold leading-tight text-white'>
                Let Nexora AI
                <br />
                Work For You
            </p>
            <p className='mt-1 text-xs leading-relaxed text-slate-400'>
                Smarter tools. Better decisions.
                <br />
                Bigger opportunities.
            </p>
        </div>

        <DotLottieReact src='/hero.json' loop autoplay className='h-24 w-24 shrink-0 sm:h-28 sm:w-28' />

        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 text-cyan-300 transition-colors group-hover:border-cyan-300 group-hover:text-cyan-200'>
            <ArrowRight size={16} />
        </span>
    </Link>
);

export default PromoBanner;
