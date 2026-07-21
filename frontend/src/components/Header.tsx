import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, ShieldCheck, UserPlus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import BrandLogo from '@/components/BrandLogo';
import AccountSwitcher from '@/components/AccountSwitcher';
import ThemeToggle from '@/components/ThemeToggle';

const NAV_LINKS = [
    { label: 'Features', href: '#features' },
    { label: 'Markets', href: '#markets' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
];

const Header = () => {
    const { isAuthenticated, loginOAuth2, signup, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <>
            <header className='sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4'>
                <div className='container-page'>
                    <div className='relative flex h-16 items-center justify-between rounded-full border border-line bg-ink-800/85 pl-4 pr-3 shadow-lg shadow-black/20 backdrop-blur sm:pl-6'>
                        <BrandLogo />

                        <nav className='absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex'>
                            {NAV_LINKS.map(link => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className='text-sm font-medium text-slate-300 transition-colors hover:text-cyan-300'
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>

                        <div className='hidden items-center gap-2 md:flex'>
                            <ThemeToggle />
                            {isAuthenticated ? (
                                <>
                                    <Link to='/app/manual' className='btn-ghost'>
                                        <LayoutDashboard size={18} />
                                        Open app
                                    </Link>
                                    <AccountSwitcher />
                                </>
                            ) : (
                                <>
                                    <button
                                        className='rounded-full border border-line px-5 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-300'
                                        onClick={loginOAuth2}
                                    >
                                        Login
                                    </button>
                                    <button className='btn-primary px-5 py-2 text-sm' onClick={signup}>
                                        Register
                                    </button>
                                </>
                            )}
                        </div>

                        <div className='flex items-center gap-1 md:hidden'>
                            <ThemeToggle />
                            <button
                                className='inline-flex h-10 w-10 items-center justify-center text-slate-200'
                                onClick={() => setMenuOpen(o => !o)}
                                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                            >
                                {menuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Dimmed backdrop below the header */}
            <div
                className={`fixed inset-x-0 bottom-0 top-[76px] z-40 bg-black/80 transition-opacity duration-300 md:hidden ${
                    menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                onClick={() => setMenuOpen(false)}
                aria-hidden={!menuOpen}
            />

            {/* Mobile drawer — starts below the header, slides in from the right */}
            <aside
                className={`fixed bottom-0 right-0 top-[76px] z-50 flex w-[82%] max-w-sm flex-col border-l-2 border-cyan-600 bg-ink-700 shadow-2xl shadow-black/70 transition-transform duration-300 ease-out md:hidden ${
                    menuOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
                }`}
                role='dialog'
                aria-modal='true'
                aria-hidden={!menuOpen}
            >
                <nav className='flex flex-col px-3 py-2'>
                    {NAV_LINKS.map(link => (
                        <a
                            key={link.href}
                            href={link.href}
                            className='px-3 py-4 text-base font-medium text-slate-300 transition-colors hover:text-cyan-300'
                            onClick={() => setMenuOpen(false)}
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                <div className='mt-auto flex flex-col gap-2 border-t border-line px-5 py-5'>
                    {isAuthenticated ? (
                        <>
                            <button
                                className='btn-ghost'
                                onClick={() => {
                                    setMenuOpen(false);
                                    navigate('/app/manual');
                                }}
                            >
                                <LayoutDashboard size={18} />
                                Open app
                            </button>
                            <button className='btn-primary' onClick={logout}>
                                <LogOut size={18} />
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <button className='btn-ghost' onClick={loginOAuth2}>
                                <ShieldCheck size={18} />
                                Login
                            </button>
                            <button className='btn-primary' onClick={signup}>
                                <UserPlus size={18} />
                                Register
                            </button>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Header;
