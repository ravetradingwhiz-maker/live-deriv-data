import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAdminOptional } from '@/context/AdminContext';

/**
 * Hidden control: triple-click the logo to exit admin mode (a no-op with normal
 * navigation otherwise).
 */
const BrandLogo = ({ className = '' }: { className?: string }) => {
    const admin = useAdminOptional();
    const clicksRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onLogoClick = (e: React.MouseEvent) => {
        if (!admin?.active) return; // normal navigation unless admin mode is on
        e.preventDefault();
        clicksRef.current += 1;
        if (timerRef.current) clearTimeout(timerRef.current);
        if (clicksRef.current >= 3) {
            clicksRef.current = 0;
            admin.exit();
        } else {
            timerRef.current = setTimeout(() => {
                clicksRef.current = 0;
            }, 2000);
        }
    };

    return (
        <Link to='/' onClick={onLogoClick} className={`flex items-center gap-2.5 ${className}`}>
            <img src='/favicon.png' alt='Live Deriv Data Analysis' className='h-12 w-12 rounded-lg object-contain sm:h-14 sm:w-14' />
            <span className='font-logo mt-1.5 hidden flex-col font-extrabold leading-tight tracking-[0.18em] sm:flex'>
                <span className='text-sm text-white [text-shadow:0_0_10px_rgba(255,255,255,0.5)] sm:text-lg'>
                    Live Deriv
                </span>
                <span className='text-sm text-cyan-400 [text-shadow:0_0_12px_rgba(34,211,238,0.8)] sm:text-lg'>
                    Data Analysis
                </span>
            </span>
        </Link>
    );
};

export default BrandLogo;
