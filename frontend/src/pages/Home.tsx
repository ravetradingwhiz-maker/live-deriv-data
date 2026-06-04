import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, KeyRound, LogIn, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NexoraStar from '@/components/NexoraStar';

const TRADEPILOT_STATS = [
    { value: '10K+', label: 'Trades' },
    { value: '24/7', label: 'Uptime' },
    { value: '<50ms', label: 'Latency' },
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
        icon: '🤖',
        title: 'Automated strategies',
        body: 'Run rule-based options strategies around the clock without watching every tick.',
    },
    {
        icon: '📊',
        title: 'Live market data',
        body: 'Stream real-time prices and balances straight from the Deriv WebSocket API.',
    },
    {
        icon: '🔒',
        title: 'Secure by design',
        body: 'Log in with OAuth 2.0 (PKCE) or the classic token flow — your credentials never touch us.',
    },
    {
        icon: '⚡',
        title: 'Fast execution',
        body: 'Low-latency order routing reacts to market moves in under a second.',
    },
    {
        icon: '🎛️',
        title: 'Full control',
        body: 'Start, stop, and switch accounts instantly. You stay in charge at all times.',
    },
    {
        icon: '📈',
        title: 'Performance insights',
        body: 'Track balance, open positions, and results from a single clean dashboard.',
    },
];

const MARKETS = [
    { name: 'Volatility 75 Index', tag: 'Synthetic', change: '+2.4%' },
    { name: 'Volatility 100 Index', tag: 'Synthetic', change: '+1.1%' },
    { name: 'Boom 1000 Index', tag: 'Synthetic', change: '-0.6%' },
    { name: 'Crash 500 Index', tag: 'Synthetic', change: '+0.9%' },
    { name: 'EUR/USD', tag: 'Forex', change: '+0.3%' },
    { name: 'Gold / USD', tag: 'Commodities', change: '+1.8%' },
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
        a: 'No. Live Deriv Data is an independent platform that connects to your Deriv account through the official Deriv API.',
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

const Home = () => {
    const { isAuthenticated, loginOAuth2, signup } = useAuth();
    const navigate = useNavigate();

    // Mirrors quantumsyn's handleLogin: redirect straight to the OAuth URL.
    const primaryCta = () => (isAuthenticated ? navigate('/dashboard') : loginOAuth2());

    return (
        <div className='min-h-screen bg-ink-900'>
            <Header />

            {/* Hero */}
            <section className='border-b border-line'>
                <div className='container-page grid gap-12 pb-16 pt-8 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-28'>
                    <div>
                        <span className='inline-flex items-center gap-2 rounded-full border border-line bg-ink-800 px-3 py-1 text-xs font-semibold text-cyan-300'>
                            <span className='h-1.5 w-1.5 rounded-full bg-cyan-400' />
                            Automated Deriv options trading
                        </span>
                        <h1 className='mt-5 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl'>
                            Trade Deriv options on autopilot
                        </h1>
                        <p className='mt-5 max-w-xl text-lg text-slate-400'>
                            Build, run, and monitor automated options strategies with live market data and a
                            secure Deriv login. No manual ticking required.
                        </p>
                        <div className='mt-8 flex flex-wrap gap-3'>
                            <button className='btn-primary px-7 py-3 text-base' onClick={primaryCta}>
                                {isAuthenticated ? (
                                    'Open dashboard'
                                ) : (
                                    <>
                                        <LogIn size={20} />
                                        Login with Deriv
                                    </>
                                )}
                            </button>
                            <a href='#how-it-works' className='btn-ghost px-7 py-3 text-base'>
                                See how it works
                            </a>
                        </div>
                        <div className='mt-8 flex items-center gap-2 text-sm text-slate-500'>
                            <span className='text-cyan-400'>✓</span> OAuth 2.0 &amp; legacy login
                            <span className='mx-2 text-slate-700'>•</span>
                            <span className='text-cyan-400'>✓</span> No card required
                        </div>

                        {!isAuthenticated && (
                            <button
                                onClick={signup}
                                className='mt-5 inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-800 px-5 py-2.5 text-sm text-slate-300 transition-colors hover:border-cyan-600 hover:text-white'
                            >
                                Don&apos;t have a Deriv account?
                                <span className='font-bold text-cyan-300'>Register here</span>
                            </button>
                        )}
                    </div>

                    {/* Nexora AI card — cyan glow */}
                    <div className='rounded-3xl border border-cyan-700 bg-ink-800 p-7 shadow-2xl shadow-cyan-900/30 ring-1 ring-cyan-500/20'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                                <span className='flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 ring-1 ring-cyan-500/30'>
                                    <NexoraStar size={30} />
                                </span>
                                <div>
                                    <p className='text-2xl font-extrabold text-nexora'>Nexora AI</p>
                                    <p className='text-xs text-slate-400'>Your autonomous trading copilot</p>
                                </div>
                            </div>
                            <span className='inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-ink-900 px-2.5 py-1 text-xs font-bold'>
                                <span className='h-1.5 w-1.5 rounded-full bg-violet-400' />
                                <span className='text-nexora'>AI Powered</span>
                            </span>
                        </div>

                        {/* Stats */}
                        <div className='mt-6 grid grid-cols-3 gap-3'>
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
                            className='btn-nexora mt-6 w-full text-base'
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
            </section>

            {/* Stats */}
            <section className='border-b border-line bg-ink-800'>
                <div className='container-page grid grid-cols-2 gap-8 py-12 lg:grid-cols-4'>
                    {STATS.map(s => (
                        <div key={s.label} className='text-center'>
                            <p className='text-3xl font-extrabold text-cyan-400'>{s.value}</p>
                            <p className='mt-1 text-sm text-slate-400'>{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section id='features' className='container-page py-20'>
                <div className='mx-auto max-w-2xl text-center'>
                    <h2 className='text-3xl font-bold text-white sm:text-4xl'>Everything you need to trade smarter</h2>
                    <p className='mt-4 text-slate-400'>
                        A focused toolkit for running automated options strategies on Deriv.
                    </p>
                </div>
                <div className='mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                    {FEATURES.map(f => (
                        <div key={f.title} className='card transition-colors hover:border-cyan-800'>
                            <div className='flex h-11 w-11 items-center justify-center rounded-lg bg-ink-700 text-xl'>
                                {f.icon}
                            </div>
                            <h3 className='mt-4 text-lg font-semibold text-white'>{f.title}</h3>
                            <p className='mt-2 text-sm text-slate-400'>{f.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Markets */}
            <section id='markets' className='border-y border-line bg-ink-800 py-20'>
                <div className='container-page'>
                    <div className='mx-auto max-w-2xl text-center'>
                        <h2 className='text-3xl font-bold text-white sm:text-4xl'>Trade the markets that move</h2>
                        <p className='mt-4 text-slate-400'>
                            Synthetic indices, forex, and commodities — all from one account.
                        </p>
                    </div>
                    <div className='mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                        {MARKETS.map(m => {
                            const up = m.change.startsWith('+');
                            return (
                                <div
                                    key={m.name}
                                    className='flex items-center justify-between rounded-xl border border-line bg-ink-900 px-5 py-4'
                                >
                                    <div>
                                        <p className='font-semibold text-white'>{m.name}</p>
                                        <span className='mt-1 inline-block rounded bg-ink-700 px-2 py-0.5 text-xs text-slate-400'>
                                            {m.tag}
                                        </span>
                                    </div>
                                    <span
                                        className={`font-mono font-semibold ${up ? 'text-cyan-300' : 'text-rose-400'}`}
                                    >
                                        {m.change}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id='how-it-works' className='container-page py-20'>
                <div className='mx-auto max-w-2xl text-center'>
                    <h2 className='text-3xl font-bold text-white sm:text-4xl'>Up and running in three steps</h2>
                    <p className='mt-4 text-slate-400'>From login to live trading in minutes.</p>
                </div>
                <div className='mt-12 grid gap-6 md:grid-cols-3'>
                    {STEPS.map(s => (
                        <div key={s.step} className='card'>
                            <span className='font-mono text-3xl font-bold text-cyan-700'>{s.step}</span>
                            <h3 className='mt-3 text-lg font-semibold text-white'>{s.title}</h3>
                            <p className='mt-2 text-sm text-slate-400'>{s.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section id='faq' className='border-t border-line bg-ink-800 py-20'>
                <div className='container-page mx-auto max-w-3xl'>
                    <h2 className='text-center text-3xl font-bold text-white sm:text-4xl'>Frequently asked questions</h2>
                    <div className='mt-10 space-y-3'>
                        {FAQS.map(f => (
                            <details
                                key={f.q}
                                className='group rounded-xl border border-line bg-ink-900 p-5 [&_summary]:cursor-pointer'
                            >
                                <summary className='flex items-center justify-between font-semibold text-white marker:content-none'>
                                    {f.q}
                                    <span className='text-cyan-500 transition-transform group-open:rotate-45'>+</span>
                                </summary>
                                <p className='mt-3 text-sm text-slate-400'>{f.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className='container-page py-20'>
                <div className='rounded-2xl border border-cyan-800 bg-ink-800 px-8 py-14 text-center'>
                    <h2 className='text-3xl font-bold text-white sm:text-4xl'>Ready to automate your trading?</h2>
                    <p className='mx-auto mt-4 max-w-xl text-slate-400'>
                        Connect your Deriv account and launch your first automated strategy today.
                    </p>
                    <button className='btn-primary mx-auto mt-8 px-8 py-3 text-base' onClick={primaryCta}>
                        {isAuthenticated ? (
                            'Open dashboard'
                        ) : (
                            <>
                                <LogIn size={20} />
                                Login with Deriv
                            </>
                        )}
                    </button>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Home;
