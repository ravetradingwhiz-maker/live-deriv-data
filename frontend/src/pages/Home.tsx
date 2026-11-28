import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Check,
    ChevronRight,
    KeyRound,
    LogIn,
    Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import FestiveScene from '@/components/home/FestiveScene';
import FestiveWreaths from '@/components/home/FestiveWreaths';
import Footer from '@/components/Footer';
import LiveMarkets from '@/components/home/LiveMarkets';
import CandleBackdrop from '@/components/home/CandleBackdrop';
import NexoraStar from '@/components/NexoraStar';

const TRADEPILOT_STATS = [
    { value: '10K+', label: 'Trades' },
    { value: '24/7', label: 'Uptime' },
];

const TRADEPILOT_FEATURES = [
    'Unlimited live trades',
    'Adaptive risk engine',
    'Priority support',
    'Active 24/7',
    'Real-time analysis',
    'Cloud-powered',
];

const STATS = [
    { value: '24/7', label: 'Automated execution' },
    { value: '50+', label: 'Synthetic & forex markets' },
    { value: '<1s', label: 'Tick-level reaction' },
    { value: '2FA', label: 'OAuth-secured login' },
];


const FEATURES = [
    {
        title: 'Automated strategies',
        body: 'Run rule-based options strategies around the clock without watching every tick.',
    },
    {
        title: 'Live market data',
        body: 'Stream real-time prices and balances straight from the Deriv WebSocket API.',
    },
    {
        title: 'Secure by design',
        body: 'Log in with OAuth 2.0 (PKCE) or the classic token flow — your credentials never touch us.',
    },
    {
        title: 'Fast execution',
        body: 'Low-latency order routing reacts to market moves in under a second.',
    },
    {
        title: 'Full control',
        body: 'Start, stop, and switch accounts instantly. You stay in charge at all times.',
    },
    {
        title: 'Performance insights',
        body: 'Track balance, open positions, and results from a single clean dashboard.',
    },
];

const STEPS = [
    {
        step: '01',
        title: 'Connect your Deriv account',
        body: 'Securely log in with OAuth 2.0 or the legacy token flow in a couple of clicks.',
    },
    {
        step: '02',
        title: 'Pick a strategy',
        body: 'Choose from automated options strategies and configure your risk parameters.',
    },
    {
        step: '03',
        title: 'Go live & monitor',
        body: 'Let it run 24/7 and watch live balance and performance on your dashboard.',
    },
];

const FAQS = [
    {
        q: 'Is this an official Deriv product?',
        a: 'No. Live Deriv Data Analysis is an independent platform that connects to your Deriv account through the official Deriv API.',
    },
    {
        q: 'How do you handle my login?',
        a: 'Authentication happens directly with Deriv via OAuth. We only receive a scoped access token — never your password.',
    },
    {
        q: 'Which login methods are supported?',
        a: 'Both the modern OAuth 2.0 (PKCE) flow and the classic legacy token redirect are fully supported.',
    },
    {
        q: 'Can I use a demo account?',
        a: 'Yes. Virtual (demo) accounts work exactly like real ones so you can test strategies risk-free.',
    },
];

/**
 * The reference's repeating unit: a left-hand column that introduces the grid
 * beside it. Keeping it as one component is what holds the three sections that
 * use it to the same rhythm.
 */
const SectionIntro = ({
    eyebrow,
    title,
    lead,
    action,
}: {
    eyebrow: string;
    title: React.ReactNode;
    lead: string;
    action?: { label: string; onClick: () => void };
}) => (
    <div className='lg:sticky lg:top-24 lg:self-start'>
        <p className='text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400'>{eyebrow}</p>
        <h2 className='mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl'>{title}</h2>
        <p className='mt-4 max-w-sm text-slate-400'>{lead}</p>
        {action && (
            <button
                onClick={action.onClick}
                className='mt-7 inline-flex items-center gap-2 rounded-full border border-cyan-700 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition-colors hover:border-cyan-400 hover:text-cyan-200'
            >
                {action.label}
                <ArrowRight size={16} />
            </button>
        )}
    </div>
);

const Home = () => {
    const { isAuthenticated, loginOAuth2, signup } = useAuth();
    const navigate = useNavigate();

    // Mirrors quantumsyn's handleLogin: redirect straight to the OAuth URL.
    const primaryCta = () => (isAuthenticated ? navigate('/app/dashboard') : loginOAuth2());

    return (
        <div className='min-h-screen bg-ink-900'>
            <Header />

            {/* Hero */}
            <section className='relative overflow-hidden border-b border-line'>
                {/* December only, and behind everything — `relative` on the
                    content below is what keeps the headline in front of it. */}
                <FestiveScene />

                <div className='container-page relative grid gap-12 pb-28 pt-8 sm:py-20 sm:pb-32 lg:grid-cols-2 lg:items-center lg:py-28 lg:pb-36'>
                    <div>
                        <p className='festive-only festive-wordmark font-christmas hero-rise mb-1 text-3xl leading-none sm:text-4xl lg:text-5xl'>
                            Merry Christmas
                        </p>
                        <h1 className='hero-rise hero-headline font-extrabold leading-tight text-white'>
                            Trade Deriv options on <span className='text-cyan-400'>autopilot</span>
                        </h1>
                        <p className='hero-rise mt-5 max-w-xl text-[clamp(0.875rem,4vw,1.125rem)] text-slate-400' style={{ animationDelay: '90ms' }}>
                            Build, run, and monitor automated options strategies with live market data and a
                            secure Deriv login. No manual ticking required.
                        </p>
                        <div className='hero-rise mt-8 flex flex-wrap gap-3' style={{ animationDelay: '180ms' }}>
                            <button className='btn-primary hero-cta fit-line' onClick={primaryCta}>
                                {isAuthenticated ? (
                                    'Open dashboard'
                                ) : (
                                    <>
                                        <LogIn size={20} />
                                        Login with Deriv
                                    </>
                                )}
                            </button>
                            {/* Leaves the site, so it opens in its own tab. `noreferrer`
                                alongside `noopener` because the target is a third party. */}
                            <a
                                href='https://t.me/livederivdataanalysis_VIP'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='btn-ghost btn-ring hero-cta fit-line'
                            >
                                Join Community
                                <ArrowRight size={20} />
                            </a>
                        </div>

                        {!isAuthenticated && (
                            <button
                                onClick={signup}
                                className='hero-rise hero-note fit-line mt-5 inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-800 text-slate-300 transition-colors hover:border-cyan-600 hover:text-white'
                            >
                                Don&apos;t have a Deriv account?
                                <span className='font-bold text-cyan-300'>Register here</span>
                            </button>
                        )}
                    </div>

                    {/* Wrapped so the wreaths can break the card's edge: the
                        card clips its own overflow for the candles, and
                        anything hung inside it would be cut off at the border. */}
                    <div className='relative'>
                        <FestiveWreaths />

                    {/* Nexora AI card — cyan glow, over a candlestick field */}
                    <div
                        className='hero-rise relative overflow-hidden rounded-3xl border border-cyan-700 bg-ink-800 p-5 shadow-2xl sm:p-7 shadow-cyan-900/30 ring-1 ring-cyan-500/20 [&>*:not(svg)]:relative'
                        style={{ animationDelay: '260ms' }}
                    >
                        <CandleBackdrop />
                        {/* Everything below sits above the candles. */}
                        <div className='relative flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                                <span className='flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 ring-1 ring-cyan-500/30'>
                                    <NexoraStar size={30} />
                                </span>
                                <div>
                                    <p className='text-2xl font-extrabold text-nexora'>Nexora AI</p>
                                    <p className='text-xs text-slate-400'>Your autonomous trading copilot</p>
                                </div>
                            </div>
                            <span className='fit-line inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-ink-900 px-2.5 py-1 text-[clamp(0.6rem,2.6vw,0.75rem)] font-bold'>
                        
                                <span className='text-nexora'>AI Powered</span>
                            </span>
                        </div>

                        {/* Stats */}
                        <div className='mt-6 grid grid-cols-2 gap-3'>
                            {TRADEPILOT_STATS.map(s => (
                                <div
                                    key={s.label}
                                    className='rounded-xl border border-line bg-ink-900 px-2 py-3 text-center'
                                >
                                    <p className='text-xl font-extrabold text-cyan-400'>{s.value}</p>
                                    <p className='mt-0.5 text-xs text-slate-500'>{s.label}</p>
                                </div>
                            ))}
                        </div>

                        <p className='mt-6 text-sm text-slate-300'>
                            Sign in with Deriv using OAuth 2.0 and let Nexora AI handle the trading.
                        </p>
                        <p className='mt-1 flex items-center gap-1.5 text-xs text-cyan-300'>
                            <Sparkles size={13} />
                            One secure click, no password stored
                        </p>

                        {/* Feature chips */}
                        <div className='mt-5 grid grid-cols-2 gap-2'>
                            {TRADEPILOT_FEATURES.map(f => (
                                <span
                                    key={f}
                                    className='inline-flex items-center gap-2 rounded-lg bg-ink-700 px-3 py-2 text-xs font-medium text-slate-200'
                                >
                                    <Check size={14} className='shrink-0 text-cyan-400' />
                                    {f}
                                </span>
                            ))}
                        </div>

                        <button
                            className='btn-nexora hero-cta fit-line mt-6 w-full'
                            onClick={() => {
                                if (isAuthenticated) {
                                    navigate('/app/trade-pilot-free');
                                } else {
                                    sessionStorage.setItem('post_login_redirect', '/app/trade-pilot-free');
                                    loginOAuth2();
                                }
                            }}
                        >
                            <KeyRound size={20} />
                            Access Nexora AI For Free
                            <ArrowRight size={18} />
                        </button>
                        <p className='mt-2 text-center text-xs text-slate-500'>
                            Authorize with Deriv to activate
                        </p>
                    </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className='border-b border-line bg-ink-800'>
                <div className='container-page grid grid-cols-2 gap-y-8 py-12 lg:grid-cols-4'>
                    {STATS.map((s, i) => (
                        <div key={s.label} className={i > 0 ? 'lg:border-l lg:border-line lg:pl-8' : ''}>
                            <p className='font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl'>
                                {s.value}
                            </p>
                            <p className='mt-1.5 max-w-[18ch] text-sm leading-snug text-slate-400'>{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section id='features' className='container-page py-24'>
                <div className='grid gap-12 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-16'>
                    <SectionIntro
                        eyebrow='Powerful features'
                        title='Everything you need to trade smarter'
                        lead='A focused toolkit for running automated options strategies on Deriv. From real-time data to advanced analytics, we give you the edge.'
                        action={{ label: 'Explore all features', onClick: primaryCta }}
                    />

                    <ul className='sm:grid sm:grid-cols-2 sm:gap-x-12'>
                        {FEATURES.map(f => (
                            <li key={f.title} className='border-b border-line py-6 first:pt-0 sm:[&:nth-child(2)]:pt-0'>
                                <h3 className='font-semibold text-white'>{f.title}</h3>
                                <p className='mt-2 text-sm leading-relaxed text-slate-400'>{f.body}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Markets */}
            <section id='markets' className='border-y border-line bg-ink-800 py-24'>
                <div className='container-page grid gap-12 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-16'>
                    <SectionIntro
                        eyebrow='Global markets'
                        title='Trade the markets that move'
                        lead='Synthetic indices that run around the clock. Prices and curves below are live from Deriv.'
                        action={{ label: 'View all markets', onClick: primaryCta }}
                    />
                    <LiveMarkets />
                </div>
            </section>

            {/* How it works */}
            <section id='how-it-works' className='container-page py-24'>
                <p className='text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400'>Simple process</p>
                <h2 className='mt-4 text-3xl font-bold text-white sm:text-4xl'>Up and running in three steps</h2>
                <p className='mt-4 text-slate-400'>From login to live trading in minutes.</p>

                <ol className='mt-12 grid gap-8 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start md:gap-4'>
                    {STEPS.map((s, i) => (
                        <li key={s.step} className='contents'>
                            <div>
                                <span className='font-mono text-sm font-bold text-cyan-400'>{s.step}</span>
                                <h3 className='mt-3 font-semibold text-white'>{s.title}</h3>
                                <p className='mt-2 max-w-prose text-sm leading-relaxed text-slate-400'>{s.body}</p>
                            </div>
                            {i < STEPS.length - 1 && (
                                <ChevronRight
                                    size={20}
                                    aria-hidden
                                    className='hidden shrink-0 self-center text-slate-700 md:block'
                                />
                            )}
                        </li>
                    ))}
                </ol>
            </section>

            {/* FAQ */}
            <section id='faq' className='border-t border-line bg-ink-800 py-20'>
                <div className='container-page grid gap-12 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-16'>
                    <SectionIntro
                        eyebrow='Frequently asked questions'
                        title='Got questions?'
                        lead='Answers to the most common questions about the platform, trading, and account setup.'
                    />
                    <div>
                        {FAQS.map(f => (
                            <details
                                key={f.q}
                                className='group border-b border-line py-5 first:pt-0 [&_summary]:cursor-pointer'
                            >
                                <summary className='flex items-start justify-between gap-6 text-sm font-semibold text-white marker:content-none'>
                                    {f.q}
                                    <span className='mt-0.5 shrink-0 text-lg leading-none text-cyan-500 transition-transform group-open:rotate-45'>
                                        +
                                    </span>
                                </summary>
                                <p className='mt-3 max-w-prose text-sm leading-relaxed text-slate-400'>{f.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className='container-page py-20'>
                <div className='grid items-center gap-8 rounded-2xl border border-cyan-900 bg-ink-800 px-6 py-12 sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto]'>
                    <div>
                        <p className='text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400'>
                            Ready to trade?
                        </p>
                        <h2 className='mt-4 max-w-md text-3xl font-bold leading-tight text-white sm:text-4xl'>
                            Your Deriv trading journey starts here.
                        </h2>
                        <p className='mt-4 max-w-md text-slate-400'>
                            Connect your Deriv account and launch your first automated strategy today.
                        </p>
                    </div>
                    <div className='lg:text-right'>
                        <button className='btn-primary px-8 py-3 text-base' onClick={primaryCta}>
                            {isAuthenticated ? (
                                'Open dashboard'
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    Login with Deriv
                                </>
                            )}
                        </button>
                        <p className='mt-3 text-xs text-slate-500'>
                            Free, secure, and takes less than a minute.
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Home;
