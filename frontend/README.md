# DeriveOptions — Live Deriv Options

A React + Vite + Tailwind front-end for automated Deriv options trading. Supports
**both** Deriv authentication modes, ported from the QuantumSyn Pro project:

- **Legacy mode** — the classic OAuth redirect that returns tokens directly in
  the URL (`token1`/`acct1`/`cur1`). Tokens are validated against the Deriv
  WebSocket and stored locally.
- **OAuth 2.0 (PKCE)** — `auth.deriv.com/oauth2` authorization-code flow with a
  CSRF `state` token and PKCE `code_challenge`. The `?code` callback is exchanged
  for an access token, then accounts + an OTP-authenticated WebSocket URL are
  resolved via the DerivWS REST gateway.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your Deriv app credentials
npm run dev            # http://localhost:5173
```

### Environment variables

| Var            | Purpose                                                              |
| -------------- | -------------------------------------------------------------------- |
| `CLIENT_ID`    | OAuth2 client id for the PKCE flow (`auth.deriv.com/oauth2`).         |
| `APP_ID`       | Legacy Deriv app id (legacy redirect + WebSocket). Defaults to 36300.|
| `REDIRECT_URL` | Optional. Defaults to `<origin>/callback`. Must match a registered URI. |

Register an app and get these at <https://api.deriv.com>. The redirect URI you
register must match `REDIRECT_URL` (or `<origin>/callback`).

## Scripts

```bash
npm run dev       # dev server
npm run build     # type-check + production build
npm run preview   # preview the production build
```

## Structure

```
src/
  config/      brand config + auth-config (PKCE/CSRF, generateOAuthURL, getSocketURL)
  services/    deriv-api, deriv-ws, oauth-token-exchange, derivws-accounts
  utils/       auth-utils (legacy token parsing/validation/storage)
  hooks/       useOAuthCallback (PKCE code + CSRF validation)
  context/     AuthContext (auth state, login/logout, balance stream)
  pages/       Home, Callback, Dashboard
  components/  Header, Footer, LoginModal, BrandLogo, Spinner
```

> Not an official Deriv product. Trading involves risk.
