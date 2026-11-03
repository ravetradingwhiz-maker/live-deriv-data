import DashboardHero from '@/components/dashboard/DashboardHero';

/**
 * Dashboard — the authenticated app's landing tab.
 *
 * Replaces the Manual Trading iframe: the account's own numbers (what it made
 * this month, what it made today, how close it is to the next reward) rather
 * than an embedded trading terminal.
 */
const Dashboard = () => (
    <div className='space-y-6'>
        <DashboardHero />
    </div>
);

export default Dashboard;
