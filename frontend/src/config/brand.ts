/**
 * Brand / platform configuration.
 *
 * Mirrors the structure of quantumsynpro's brand.config.json so the ported
 * auth services can read the same shape (auth2_url, derivws.url, directories).
 */
export const brandConfig = {
    brand_name: 'Live Deriv Data',
    brand_domain: 'https://deriveoptions.com',
    platform: {
        name: 'Live Deriv Data',
        // OAuth 2.0 (PKCE) authorization server — production only.
        auth2_url: {
            production: 'https://auth.deriv.com/oauth2/',
        },
        // DerivWS REST gateway used by the OAuth2 flow (accounts + OTP -> WS url).
        derivws: {
            url: {
                production: 'https://api.derivws.com/trading/v1/',
            },
            directories: {
                options: 'options/',
                derivatives: 'derivatives/',
            },
        },
    },
} as const;

export default brandConfig;
