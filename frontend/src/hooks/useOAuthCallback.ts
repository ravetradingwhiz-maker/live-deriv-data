import { useCallback, useEffect, useRef, useState } from 'react';
import { checkCSRFToken, type CSRFFailureReason } from '@/config/auth-config';

/**
 * OAuth 2.0 (PKCE) callback hook.
 *
 * Ported from quantumsynpro. Extracts the `code`/`state`/`error` params from the
 * URL, validates the CSRF state token, and exposes the authorization code plus a
 * cleanup function. The consumer exchanges the code and then calls cleanupURL().
 *
 * Two rules keep a single failure from becoming a permanently broken app:
 *  - Every terminal path strips the OAuth params from the URL. AppBody renders
 *    <Callback /> whenever the query string looks like a redirect, so leaving
 *    ?code&state in place made one failure replay on every reload.
 *  - The state token is NOT consumed here. It stays until the token exchange
 *    succeeds (Callback clears it), so a failed exchange can be retried instead
 *    of reporting a bogus "validation failed" on the second attempt.
 */
export interface OAuthCallbackParams {
    code: string | null;
    state: string | null;
    error: string | null;
    error_description: string | null;
}

export interface OAuthCallbackResult {
    isProcessing: boolean;
    isValid: boolean;
    params: OAuthCallbackParams;
    error: string | null;
    /** Set only when the state check failed, so callers can log which branch fired. */
    errorReason: CSRFFailureReason | 'missing_state' | 'missing_code' | 'provider_error' | null;
    cleanupURL: () => void;
}

const EMPTY_PARAMS: OAuthCallbackParams = { code: null, state: null, error: null, error_description: null };

export const useOAuthCallback = (): OAuthCallbackResult => {
    const [result, setResult] = useState<Omit<OAuthCallbackResult, 'cleanupURL'>>({
        isProcessing: true,
        isValid: false,
        params: EMPTY_PARAMS,
        error: null,
        errorReason: null,
    });

    // Guard so the callback is processed exactly once per mount.
    const processedRef = useRef(false);

    const cleanupURL = useCallback(() => {
        const url = new URL(window.location.href);
        ['code', 'state', 'scope', 'error', 'error_description'].forEach(p => url.searchParams.delete(p));
        window.history.replaceState({}, '', url.toString());
    }, []);

    useEffect(() => {
        if (processedRef.current) return;
        processedRef.current = true;

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const error_description = urlParams.get('error_description');

        const isOAuthCallback = code !== null || error !== null || state !== null;
        if (!isOAuthCallback) {
            setResult({ isProcessing: false, isValid: false, params: EMPTY_PARAMS, error: null, errorReason: null });
            return;
        }

        const params = { code, state, error, error_description };

        // Every failure clears the URL before handing back, so a reload shows the
        // app rather than replaying this same error.
        const fail = (message: string, reason: OAuthCallbackResult['errorReason']) => {
            setResult({ isProcessing: false, isValid: false, params, error: message, errorReason: reason });
            cleanupURL();
        };

        if (error) {
            console.error('[OAuth] provider error:', error, error_description);
            fail(error_description || error, 'provider_error');
            return;
        }

        if (!state) {
            console.error('[OAuth] Missing state parameter — ignoring this redirect');
            fail('Missing state parameter', 'missing_state');
            return;
        }

        const stateCheck = checkCSRFToken(state);
        if (!stateCheck.valid) {
            // Note which branch fired: only 'mismatch' resembles an attack. The
            // user's existing session is left alone — a stale redirect is not a
            // reason to sign out someone who is already logged in.
            console.error(`[OAuth] state check failed (${stateCheck.reason})`);
            fail('CSRF token validation failed', stateCheck.reason ?? null);
            return;
        }

        if (!code) {
            fail('Missing authorization code', 'missing_code');
            return;
        }

        setResult({ isProcessing: false, isValid: true, params, error: null, errorReason: null });
    }, [cleanupURL]);

    return { ...result, cleanupURL };
};
