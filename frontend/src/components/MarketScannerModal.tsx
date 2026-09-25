import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Radar } from 'lucide-react';

/**
 * The scan that plays between pressing Run and the first trade.
 *
 * Modelled on the QuantumSyn signal scanner (quantumsynpro/public/signals.html):
 * lime terminal logs raining behind a cyan-edged panel, with the same looping
 * tone. It is shown while the bot reports `running` and dismissed the moment it
 * reports `trading`, so it covers exactly the window where the bot is looking
 * for a signal and nothing else is on screen.
 *
 * Not dismissible by the user on purpose — it is a progress state, not a
 * message, and clicking it away would leave the bot running behind a screen
 * that said it was still scanning.
 */

/** The same source the QuantumSyn scanner uses, hotlinked as it is there. */
const SCAN_SOUND = 'https://www.fesliyanstudios.com/play-mp3/4386';

/** The log lines that make up the rain, as in signals.html. */
const LOGS = [
    '[INFO] Connecting to server... [OK]',
    '[INFO] Authenticating API key... [OK]',
    '[WARNING] Unstable connection detected...',
    '[ERROR] Connection timeout. Retrying...',
    '[INFO] Fetching market data... [OK]',
    '[INFO] Analysing Volatility Index...',
    '[SUCCESS] Data stream established...',
    '[SECURITY] Encryption enabled...',
    '[INFO] Predicting next digit...',
    '[WARNING] High market volatility detected...',
    '[INFO] Compiling results...',
    '[INFO] Data transmission complete...',
];

const LOGS_PER_ROW = 10;
const ROWS = 100;
/** How often the rain is redrawn. Fast enough to read as live data. */
const REDRAW_MS = 200;

const buildRain = (): string => {
    let text = '';
    for (let row = 0; row < ROWS; row++) {
        for (let i = 0; i < LOGS_PER_ROW; i++) {
            text += `${LOGS[Math.floor(Math.random() * LOGS.length)]} `;
        }
        text += '\n';
    }
    // Doubled so the halfway scroll lands on identical content and loops seamlessly.
    return text + text;
};

const MarketScannerModal = () => {
    const rainRef = useRef<HTMLDivElement>(null);

    /* Written straight to the node rather than held in state: this redraws five
       times a second, and putting a hundred rows of text through React each
       time would re-render the modal for something no other component reads. */
    useEffect(() => {
        const paint = () => {
            if (rainRef.current) rainRef.current.textContent = buildRain();
        };
        paint();
        const timer = setInterval(paint, REDRAW_MS);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const audio = new Audio(SCAN_SOUND);
        audio.loop = true;

        /* The modal opens from the Run button, so this is already inside a user
           gesture and should play. A browser that blocks it anyway gets one more
           chance on the next click, rather than the scan running silently. */
        audio.play().catch(() => {
            const retry = () => {
                audio.play().catch(() => {});
            };
            document.addEventListener('click', retry, { once: true });
        });

        return () => {
            audio.pause();
            audio.currentTime = 0;
        };
    }, []);

    return createPortal(
        <div
            className='fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/90 p-4'
            role='dialog'
            aria-modal='true'
            aria-label='Scanning the market'
        >
            {/* The rain. Two stacked copies scroll as one so the loop has no seam. */}
            <div
                ref={rainRef}
                aria-hidden='true'
                className='pointer-events-none absolute inset-0 scanner-rain whitespace-pre font-mono text-[13px] leading-tight text-[#00ff00]/70 select-none'
            />

            <div className='relative w-full max-w-md rounded-xl border-4 border-[#22d3ee] bg-black/80 p-8 text-center shadow-[0_0_30px_cyan]'>
                <div className='flex flex-col items-center gap-4'>
                    <Radar size={40} className='animate-spin text-[#67e8f9] [animation-duration:2.5s]' />

                    <h2 className='text-lg font-extrabold tracking-wide text-[#fff]'>
                        Scanning the market
                    </h2>

                    {/* Three dots, offset so they pulse in sequence. */}
                    <div className='flex items-center gap-1.5' aria-hidden='true'>
                        {[0, 1, 2].map(i => (
                            <span
                                key={i}
                                className='h-2 w-2 animate-pulse rounded-full bg-[#22d3ee]'
                                style={{ animationDelay: `${i * 0.2}s` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MarketScannerModal;
