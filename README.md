README — TypingMind Auto-RTL Extension

What it is
- A tiny client-side JS extension that automatically detects mostly-Persian/Arabic (RTL) text and sets direction and alignment (dir/text-align) for editors and message bubbles in TypingMind.

Install (for TypingMind users)
1. Copy this public JS URL:
   https://cdn.jsdelivr.net/gh/barooni/typingmind-RTL-extension@main/auto-rtl.js
2. In TypingMind: Settings → Extensions → Add extension.
3. Paste the URL and install it.
4. Restart TypingMind.

Alternative hosting
- You can host the same file anywhere that serves a direct HTTPS .js URL (GitHub Pages, Netlify, Vercel, S3 + CloudFront, etc.). jsDelivr (used above) is recommended because it serves proper headers and is stable.

Quick notes
- The script decides RTL vs LTR by character ratio; adjust MIN_CHAR_RATIO in the file if needed.
- Extensions can access app data — install only from sources you trust.
- If it doesn’t load: check DevTools Network/Console for CORS, MIME-type, or 404 errors.
