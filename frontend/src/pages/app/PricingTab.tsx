import PricingPlans from '@/components/PricingPlans';

const PricingTab = () => (
    <div>
        <div className='mb-8 text-center'>
            <h2 className='text-2xl font-bold text-white sm:text-3xl'>Choose your Nexora AI plan</h2>
            <p className='mt-2 text-sm text-slate-400'>
                Start free, upgrade when you&apos;re ready. No hidden fees — cancel anytime.
            </p>
        </div>
        <PricingPlans />
    </div>
);

export default PricingTab;
