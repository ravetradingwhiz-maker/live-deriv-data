import { useCallback, useEffect, useRef, useState } from 'react';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { getActiveToken } from '@/services/deriv-api';

/**
 * Manual Trading — embeds the DTrader template (the same full trading app
 * QuantumSyn Pro uses) in an iframe and hands it the active session.
 *
 * OAuth 2.0: passes the access_token via URL params on first load and re-pushes
 * it on account switch via postMessage. Legacy: passes the v3 token as token1.
 */
const DTRADER_BASE_URL = 'https://dtrader-template-three.vercel.app/';
const DTRADER_ORIGIN = new URL(DTRADER_BASE_URL).origin;
// candle chart needs a time-based interval (the iframe forces a line on `1t`),
// so default to 1m candles with Rise/Fall selected.
const DEFAULT_PARAMS = 'chart_type=candle&interval=1m&symbol=1HZ100V&trade_type=rise_fall&theme=dark';

interface StoredAuth {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
}

const getActiveLoginId = (): string | null => {
    const id = localStorage.getItem('active_loginid');
    return id && id !== 'null' ? id : null;
};

const readOAuthAuthInfo = (): StoredAuth | null => {
    const info = OAuthTokenExchangeService.getAuthInfo();
    return info?.access_token ? info : null;
};

const getCurrencyForLogin = (loginId: string): string => {
    try {
        const accounts = JSON.parse(sessionStorage.getItem('deriv_accounts') ?? '[]');
        const oauthAcc = accounts.find((a: any) => a.account_id === loginId);
        if (oauthAcc?.currency) return oauthAcc.currency;
        const clientAccounts = JSON.parse(localStorage.getItem('clientAccounts') ?? '{}');
        return clientAccounts[loginId]?.currency || 'USD';
    } catch {
        return 'USD';
    }
};

const ManualTrading = () => {
    const [iframeSrc, setIframeSrc] = useState(`${DTRADER_BASE_URL}?${DEFAULT_PARAMS}`);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const lastSentRef = useRef<{ token: string | null; loginid: string | null }>({ token: null, loginid: null });

    const buildInitialIframeUrl = useCallback(() => {
        const auth = readOAuthAuthInfo();
        const loginId = getActiveLoginId();
        const legacyToken = getActiveToken();
        const currency = loginId ? getCurrencyForLogin(loginId) : 'USD';

        const params = new URLSearchParams(DEFAULT_PARAMS);
        if (auth?.access_token) {
            params.set('access_token', auth.access_token);
            if (auth.refresh_token) params.set('refresh_token', auth.refresh_token);
            if (auth.expires_at) {
                const seconds = Math.max(0, Math.floor((auth.expires_at - Date.now()) / 1000));
                if (seconds > 0) params.set('expires_in', String(seconds));
            }
        } else if (legacyToken) {
            params.set('token1', legacyToken);
        }
        if (loginId) params.set('loginid', loginId);
        if (currency) params.set('currency', currency);

        setIframeSrc(`${DTRADER_BASE_URL}?${params.toString()}`);
        lastSentRef.current = { token: auth?.access_token ?? legacyToken ?? null, loginid: loginId };
    }, []);

    const sendAuthPostMessage = useCallback(() => {
        const auth = readOAuthAuthInfo();
        const loginid = getActiveLoginId();
        const currency = loginid ? getCurrencyForLogin(loginid) : 'USD';
        if (!auth?.access_token || !iframeRef.current?.contentWindow) return;
        if (lastSentRef.current.token === auth.access_token && lastSentRef.current.loginid === loginid) return;

        const expires_in = auth.expires_at
            ? Math.max(0, Math.floor((auth.expires_at - Date.now()) / 1000))
            : undefined;
        iframeRef.current.contentWindow.postMessage(
            {
                type: 'AUTH_TOKEN',
                access_token: auth.access_token,
                refresh_token: auth.refresh_token,
                expires_in,
                loginid,
                currency,
            },
            DTRADER_ORIGIN
        );
        lastSentRef.current = { token: auth.access_token, loginid };
    }, []);

    // The host controls the iframe's theme. Re-assert dark on load in case the
    // URL param was stripped (e.g. after the iframe's own auth reload).
    const sendThemePostMessage = useCallback(() => {
        iframeRef.current?.contentWindow?.postMessage({ type: 'SET_THEME', theme: 'dark' }, DTRADER_ORIGIN);
    }, []);

    useEffect(() => {
        buildInitialIframeUrl();
    }, [buildInitialIframeUrl]);

    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (['auth_info', 'authToken', 'active_loginid', 'clientAccounts', 'accountsList'].includes(e.key ?? '')) {
                sendAuthPostMessage();
            }
        };
        const handleIframeMessage = (e: MessageEvent) => {
            if (e?.data?.type === 'TOKEN_EXPIRED' && e.data.source === 'dtrader-iframe') {
                lastSentRef.current = { token: null, loginid: null };
                sendAuthPostMessage();
            }
        };
        window.addEventListener('storage', handleStorage);
        window.addEventListener('message', handleIframeMessage);
        const interval = setInterval(sendAuthPostMessage, 2000);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('message', handleIframeMessage);
            clearInterval(interval);
        };
    }, [sendAuthPostMessage]);

    return (
        <div className='h-full w-full overflow-hidden md:rounded-xl md:border md:border-line'>
            <iframe
                ref={iframeRef}
                src={iframeSrc}
                title='Manual Trading'
                className='h-full w-full border-0'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                onLoad={() => {
                    sendAuthPostMessage();
                    sendThemePostMessage();
                }}
            />
        </div>
    );
};

export default ManualTrading;
