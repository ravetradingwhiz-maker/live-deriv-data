import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PricingPlans from '@/components/PricingPlans';

/** Public marketing pricing page (logged-out). In-app pricing is a tab. */
const Pricing = () => (
    <div className='min-h-screen bg-ink-900'>
        <Header />

        <section className='container-page py-16'>
            <div className='mx-auto max-w-2xl text-center'>
                <span className='inline-flex items-center gap-2 rounded-full border border-line bg-ink-800 px-3 py-1 text-xs font-semibold text-cyan-300'>
                    <span className='h-1.5 w-1.5 rounded-full bg-cyan-400' />
                    Pricing
                </span>
                <h1 className='mt-5 text-4xl font-extrabold text-white sm:text-5xl'>Choose your Nexora AI plan</h1>
                <p className='mt-4 text-slate-400'>
                    Start free, upgrade when you&apos;re ready. No hidden fees — cancel anytime.
                </p>
            </div>

            <div className='mt-12'>
                <PricingPlans />
            </div>
        </section>

        <Footer />
    </div>
);

export default Pricing;
