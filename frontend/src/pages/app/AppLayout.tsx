import { Outlet } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';
import AccountSwitcher from '@/components/AccountSwitcher';
import AdminMenu from '@/components/AdminMenu';
import ThemeToggle from '@/components/ThemeToggle';
import TabNav from '@/components/TabNav';
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
                <header className='sticky top-0 z-40 border-b border-line bg-ink-900/90 backdrop-blur'>
                    <div className='container-page flex h-16 items-center justify-between'>
                        <div className='flex items-center gap-2.5'>
                            <AdminMenu />
                            <BrandLogo />
                        </div>
                        <div className='flex items-center gap-2'>
                            <ThemeToggle />
                            <AccountSwitcher />
                        </div>
                    </div>
                </header>

                <TabNav />

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
