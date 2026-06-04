import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { BarChart3, CreditCard, Menu, ShieldCheck, Tag, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAdminOptional } from '@/context/AdminContext';

interface AdminPage {
    to: string;
    label: string;
    icon: LucideIcon;
    color: string;
}

export const ADMIN_PAGES: AdminPage[] = [
    { to: '/app/admin/markup', label: 'Markup', icon: BarChart3, color: 'text-cyan-400' },
    { to: '/app/admin/subscriptions', label: 'Subscriptions', icon: Users, color: 'text-emerald-400' },
    { to: '/app/admin/payments', label: 'Payments', icon: CreditCard, color: 'text-amber-400' },
    { to: '/app/admin/pricing', label: 'Pricing', icon: Tag, color: 'text-violet-400' },
];

/**
 * Admin-only hamburger in the header. Opens a left drawer (below the header,
 * over everything else — same pattern as the homepage mobile menu) listing the
 * admin pages. Hidden for non-admins.
 */
const AdminMenu = () => {
    const admin = useAdminOptional();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    if (!admin?.eligible) return null;

    return (
        <>
            <button
                type='button'
                aria-label={open ? 'Close admin menu' : 'Open admin menu'}
                onClick={() => setOpen(o => !o)}
                className='inline-flex h-10 w-10 items-center justify-center text-violet-300 transition-colors hover:text-violet-200'
            >
                {open ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Overlay is portaled to <body> so it escapes the header's
                backdrop-blur/stacking context (otherwise it renders transparent). */}
            {createPortal(
                <>
                    {/* Dimmed backdrop below the header */}
                    <div
                        className={`fixed inset-x-0 bottom-0 top-16 z-[60] bg-black/80 transition-opacity duration-300 ${
                            open ? 'opacity-100' : 'pointer-events-none opacity-0'
                        }`}
                        onClick={() => setOpen(false)}
                        aria-hidden={!open}
                    />

                    {/* Drawer — starts below the header, slides in from the left */}
                    <aside
                        style={{ backgroundColor: '#0f2730' }}
                        className={`fixed bottom-0 left-0 top-16 z-[61] flex w-72 max-w-[82%] flex-col border-r-2 border-cyan-600 shadow-2xl shadow-black/70 transition-transform duration-300 ease-out ${
                            open ? 'translate-x-0' : 'pointer-events-none -translate-x-full'
                        }`}
                        role='dialog'
                        aria-modal='true'
                        aria-hidden={!open}
                    >
                        <p className='flex items-center gap-2 px-4 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-violet-300'>
                            <ShieldCheck size={15} /> Admin
                        </p>

                        <nav className='flex flex-col gap-1 p-3'>
                            {ADMIN_PAGES.map(page => {
                                const Icon = page.icon;
                                return (
                                    <NavLink
                                        key={page.to}
                                        to={page.to}
                                        onClick={() => setOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                                                isActive
                                                    ? 'bg-ink-700 text-white'
                                                    : 'text-slate-300 hover:bg-ink-800 hover:text-white'
                                            }`
                                        }
                                    >
                                        <Icon size={18} className={page.color} />
                                        {page.label}
                                    </NavLink>
                                );
                            })}
                        </nav>

                        <div className='mt-auto border-t border-line p-3'>
                            <NavLink
                                to='/app/manual'
                                onClick={() => setOpen(false)}
                                className='block rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-ink-800 hover:text-white'
                            >
                                ← Back to app
                            </NavLink>
                        </div>
                    </aside>
                </>,
                document.body
            )}
        </>
    );
};

export default AdminMenu;
