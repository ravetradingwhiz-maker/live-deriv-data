import { NavLink } from 'react-router-dom';
import NexoraStar from '@/components/NexoraStar';
import { APP_TABS } from '@/components/TabNav';

/**
 * Fixed bottom tab bar for mobile (hidden on md+). Active item is highlighted in
 * cyan with a glowing top indicator bar.
 */
const BottomTabNav = () => (
    <nav
        className='fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-ink-900 md:hidden'
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
        {APP_TABS.map(tab => {
            const Icon = tab.icon;
            return (
                <NavLink
                    key={tab.to}
                    to={tab.to}
                    className='relative flex flex-1 flex-col items-center gap-1 px-0.5 py-2'
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <span className='absolute top-0 h-0.5 w-9 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]' />
                            )}
                            {tab.star ? (
                                <NexoraStar size={20} />
                            ) : (
                                Icon && <Icon size={20} className={tab.color} />
                            )}
                            <span
                                className={`flex flex-col text-center text-[9px] font-semibold leading-tight ${
                                    isActive ? 'text-cyan-400' : 'text-slate-400'
                                }`}
                            >
                                <span>{tab.lines[0]}</span>
                                <span>{tab.lines[1] || ' '}</span>
                            </span>
                        </>
                    )}
                </NavLink>
            );
        })}
    </nav>
);

export default BottomTabNav;
