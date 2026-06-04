import { Link } from 'react-router-dom';

const BrandLogo = ({ className = '' }: { className?: string }) => (
    <Link to='/' className={`flex items-center gap-2.5 ${className}`}>
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

export default BrandLogo;
