import { Outlet } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';
import AccountSwitcher from '@/components/AccountSwitcher';
import AdminMenu from '@/components/AdminMenu';
import ThemeToggle from '@/components/ThemeToggle';
import TabNav, { HeaderTabs } from '@/components/TabNav';
import BottomTabNav from '@/components/BottomTabNav';
import { PortfolioProvider } from '@/context/PortfolioContext';
import { BotRunProvider } from '@/context/BotRunContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { AdminProvider } from '@/context/AdminContext';
import PositionsDrawer from '@/components/PositionsDrawer';
import ActivityToasts from '@/components/ActivityToasts';

/** Authenticated app shell: header + tab nav (top on desktop, bottom on mobile). */
const AppLayout = () => {
    return (
        // PortfolioProvider lives here (above the tab Outlet) so the open-positions
        // stream and session trade history survive tab navigation.
        <SubscriptionProvider>
        <AdminProvider>
        <PortfolioProvider>
        <BotRunProvider>
            <div className='flex min-h-screen flex-col bg-ink-900'>
                <header className='festive-app-header sticky top-0 z-40 border-b border-line bg-ink-900/90 backdrop-blur'>
                    <div className='container-page relative flex h-14 items-center gap-3 sm:h-16 sm:gap-4'>
                        <div className='flex shrink-0 items-center gap-2.5'>
                            <AdminMenu />
                            <BrandLogo markOnly />
                        </div>

                        {/* From `xl` up the tabs ride in the header's middle,
                            which was empty across its whole width while they
                            took a bar of their own below it. */}
                        <HeaderTabs />

                        <div className='ml-auto flex shrink-0 items-center gap-2'>
                            <ThemeToggle />
                            <AccountSwitcher />
                        </div>
                    </div>
                </header>

                <TabNav />

                {/* December, over the whole app rather than one card:
                    snow drifting behind everything and frost gathering at the
                    top edge. Both are decoration, so they are hidden from the
                    reader and cannot catch a pointer. */}
                <div
                    aria-hidden='true'
                    className='festive-app-only festive-snow pointer-events-none fixed inset-0 z-20'
                />
                <div aria-hidden='true' className='festive-app-only festive-frost' />

                <main className='container-page py-8 pb-24 md:pb-8'>
                    <Outlet />
                </main>

                <BottomTabNav />
                <PositionsDrawer />
                <ActivityToasts />
            </div>
        </BotRunProvider>
        </PortfolioProvider>
        </AdminProvider>
        </SubscriptionProvider>
    );
};

export default AppLayout;
