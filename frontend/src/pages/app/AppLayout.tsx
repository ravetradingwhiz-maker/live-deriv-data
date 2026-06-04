import { Outlet, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';
import AccountSwitcher from '@/components/AccountSwitcher';
import AdminMenu from '@/components/AdminMenu';
import TabNav from '@/components/TabNav';
import BottomTabNav from '@/components/BottomTabNav';
import { PortfolioProvider } from '@/context/PortfolioContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { AdminProvider } from '@/context/AdminContext';
import PositionsDrawer from '@/components/PositionsDrawer';
import AdminPanel from '@/components/AdminPanel';

/** Authenticated app shell: header + tab nav (top on desktop, bottom on mobile). */
const AppLayout = () => {
    const { pathname } = useLocation();
    // Manual Trading hosts a full-bleed iframe: lock the shell to the viewport
    // height with no page scroll, and let the page fill the remaining space
    // edge-to-edge (full screen on mobile). Other tabs keep the padded container.
    const is_manual = pathname === '/app/manual';

    return (
        // PortfolioProvider lives here (above the tab Outlet) so the open-positions
        // stream and session trade history survive tab navigation.
        <SubscriptionProvider>
        <AdminProvider>
        <PortfolioProvider>
            <div className={`flex flex-col bg-ink-900 ${is_manual ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
                <header className='sticky top-0 z-40 border-b border-line bg-ink-900/90 backdrop-blur'>
                    <div className='container-page flex h-16 items-center justify-between'>
                        <div className='flex items-center gap-2.5'>
                            <AdminMenu />
                            <BrandLogo />
                        </div>
                        <AccountSwitcher />
                    </div>
                </header>

                <TabNav />

                <main
                    className={
                        is_manual
                            ? 'min-h-0 flex-1 overflow-hidden pb-[4.5rem] md:container-page md:py-6 md:pb-6'
                            : 'container-page py-8 pb-24 md:pb-8'
                    }
                >
                    <Outlet />
                </main>

                <BottomTabNav />
                <PositionsDrawer />
                <AdminPanel />
            </div>
        </PortfolioProvider>
        </AdminProvider>
        </SubscriptionProvider>
    );
};

export default AppLayout;
