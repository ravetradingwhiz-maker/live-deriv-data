import { useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import PrivacyModal from '@/components/PrivacyModal';

const COLUMNS = [
    {
        title: 'Platform',
        links: ['Features', 'Markets', 'Pricing', 'Dashboard'],
    },
    {
        title: 'Resources',
        links: ['How it works', 'API docs', 'Status', 'Support'],
    },
    {
        title: 'Company',
        links: ['About', 'Blog', 'Contact', 'Privacy Policy'],
    },
];

const Footer = () => {
    const [privacyOpen, setPrivacyOpen] = useState(false);

    return (
        <footer className='border-t border-line bg-ink-900'>
            <div className='container-page py-12'>
                <div className='grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]'>
                    <div>
                        <BrandLogo />
                        <p className='mt-4 max-w-xs text-sm text-slate-500'>
                            Automated options trading on Deriv. Build, run, and monitor strategies with a secure
                            login.
                        </p>
                    </div>
                    {COLUMNS.map(col => (
                        <div key={col.title}>
                            <h4 className='text-sm font-semibold text-white'>{col.title}</h4>
                            <ul className='mt-4 space-y-2.5'>
                                {col.links.map(link => (
                                    <li key={link}>
                                        {link === 'Privacy Policy' ? (
                                            <button
                                                className='text-sm text-slate-500 transition-colors hover:text-cyan-300'
                                                onClick={() => setPrivacyOpen(true)}
                                            >
                                                {link}
                                            </button>
                                        ) : (
                                            <a
                                                href='#'
                                                className='text-sm text-slate-500 transition-colors hover:text-cyan-300'
                                            >
                                                {link}
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className='mt-10 border-t border-line pt-6 text-xs text-slate-600'>
                    <p>
                        Trading involves risk. This product is not an official Deriv product and is provided for
                        educational purposes. © {new Date().getFullYear()} Live Deriv Data Analysis.
                    </p>

                    {/* Required by the licence the wreath is used under, so it
                        appears whenever the wreath does — on the page, not only
                        in the repository. */}
                    <p className='festive-any-only mt-2'>
                        <a
                            href='https://iconscout.com/3d-icons/christmas-wreath'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='underline hover:text-slate-400'
                        >
                            Christmas Wreath
                        </a>{' '}
                        by{' '}
                        <a
                            href='https://iconscout.com/contributors/nayzha-design'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='underline hover:text-slate-400'
                        >
                            Nay Design
                        </a>{' '}
                        on{' '}
                        <a
                            href='https://iconscout.com'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='underline hover:text-slate-400'
                        >
                            IconScout
                        </a>
                    </p>
                </div>
            </div>

            <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
        </footer>
    );
};

export default Footer;
