# WISE — Food Intelligence Dashboard

A front-end prototype for the WISE brand/food-intelligence platform: an interactive
dashboard, WISEcodeAI AI chat surfaces, analytics views, and report prototypes built as
static HTML/CSS/JS.

## Structure

- `index.html` — single primary entry point: the public marketing home for
  logged-out visitors (redirects signed-in users to `pages/overview.html`)
- `marketing-products.html`, `marketing-solutions.html` — the top-level marketing
  story pages (the whole catalog, and the catalog seen by role/outcome)
- `marketing-app.html`, `marketing-coach.html`, `marketing-enterprise.html`,
  `marketing-wiseai.html` — per-product sub-pages, reached from the nav's "Apps"
  menu; all share the nav + footer that `js/marketing-shell.js` injects
- `pages/` — individual screens (dashboard `overview.html`, `analytics-types.html`,
  `ai-chat.html`, accessibility review, report prototypes in `_reports/`, etc.)
- `js/` — UI modules (dashboard rendering, WISEcodeAI chat/dock, topbar, appearance menu,
  navigation, charts/animations)
- `assets/` — brand art, product imagery, banners
- `dev_server.py` — optional local dev server with live reload

## Running locally

Any static file server works. For example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/pages/overview.html

For live reload during development:

```bash
pip install livereload
python3 dev_server.py
```

## Notes

This is a design/UX prototype. Data shown is placeholder/mock content, and charts are
rendered with lightweight CSS/SVG rather than a charting library.
