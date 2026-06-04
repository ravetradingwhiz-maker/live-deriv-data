import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useAdminOptional } from '@/context/AdminContext';
import ConsentGate from '@/components/ConsentGate';
import Home from '@/pages/Home';
import Callback from '@/pages/Callback';
import Pricing from '@/pages/Pricing';
import AppLayout from '@/pages/app/AppLayout';
import ManualTrading from '@/pages/app/ManualTrading';
import TradePilotFree from '@/pages/app/TradePilotFree';
import TradePilotPremium from '@/pages/app/TradePilotPremium';
import OpenPositions from '@/pages/app/OpenPositions';
import TradeHistory from '@/pages/app/TradeHistory';
import PricingTab from '@/pages/app/PricingTab';
import Checkout from '@/pages/app/Checkout';
import AdminMarkup from '@/pages/app/admin/AdminMarkup';
import AdminSubscriptions from '@/pages/app/admin/AdminSubscriptions';
import AdminPayments from '@/pages/app/admin/AdminPayments';
import AdminPricing from '@/pages/app/admin/AdminPricing';

/**
 * True when the URL carries an auth redirect payload — either an OAuth 2.0
 * code/state/error or legacy tokens (acct1/token1 or loginInfo).
 */
const isAuthRedirect = (search: string): boolean => {
    const params = new URLSearchParams(search);
    if (params.has('code') || params.has('state') || params.has('error')) return true;
    const haystack = `${search}${window.location.hash}`;
    return /(?:^|[?&#])(token1=|acct1=|loginInfo\[)/.test(haystack);
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to='/' replace />;
    return <>{children}</>;
};

/** Gates the admin pages on admin eligibility (waits for the check to resolve). */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const admin = useAdminOptional();
    if (!admin || !admin.checked) {
        return (
            <div className='flex min-h-[50vh] items-center justify-center'>
                <Loader2 className='animate-spin text-cyan-400' />
            </div>
        );
    }
    if (!admin.eligible) return <Navigate to='/app/manual' replace />;
    return <>{children}</>;
};

/**
 * Renders the auth callback handler (a loader) the moment an auth redirect lands
 * — on ANY path — so the user never sees a page flash before being routed.
 */
const AppBody = () => {
    const location = useLocation();
    if (isAuthRedirect(location.search) || location.pathname === '/callback') {
        return <Callback />;
    }

    return (
        <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/pricing' element={<Pricing />} />

            {/* Authenticated app — tabbed layout. Landing tab: Manual Trading. */}
            <Route
                path='/app'
                element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to='/app/manual' replace />} />
                <Route path='manual' element={<ManualTrading />} />
                <Route path='trade-pilot-free' element={<TradePilotFree />} />
                <Route path='trade-pilot-premium' element={<TradePilotPremium />} />
                <Route path='open-positions' element={<OpenPositions />} />
                <Route path='trade-history' element={<TradeHistory />} />
                <Route path='pricing' element={<PricingTab />} />
                <Route path='checkout' element={<Checkout />} />

                {/* Admin-only pages */}
                <Route path='admin/markup' element={<AdminRoute><AdminMarkup /></AdminRoute>} />
                <Route path='admin/subscriptions' element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />
                <Route path='admin/payments' element={<AdminRoute><AdminPayments /></AdminRoute>} />
                <Route path='admin/pricing' element={<AdminRoute><AdminPricing /></AdminRoute>} />
            </Route>

            {/* Legacy path redirect */}
            <Route path='/dashboard' element={<Navigate to='/app/manual' replace />} />
            <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
    );
};

function App() {
    return (
        <AuthProvider>
            <ConsentGate />
            <BrowserRouter>
                <AppBody />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
