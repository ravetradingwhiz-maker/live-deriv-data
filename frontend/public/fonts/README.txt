Drop the logo font file here:

    gevora.woff2   (preferred)
    gevora.ttf     (also works)

The @font-face in src/index.css loads /fonts/gevora.woff2 then /fonts/gevora.ttf.
If your file has a different name/extension (e.g. Gevora-Bold.otf), either rename
it to gevora.woff2 / gevora.ttf, or tell the dev to update the @font-face src.

After adding the file, restart `npm run dev` (or hard-refresh) and the
"Live Deriv Data" logo will switch to Gevora.
