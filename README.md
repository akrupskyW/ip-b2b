# WISE — Food Intelligence Dashboard

A front-end prototype for the WISE brand/food-intelligence platform: an interactive
dashboard, Scout AI chat surfaces, analytics views, and report prototypes built as
static HTML/CSS/JS.

## Structure

- `index.html` — app hub / entry point
- `pages/` — individual screens (dashboard `aha.html`, `analytics-types.html`,
  `ai-chat.html`, accessibility review, report prototypes in `_reports/`, etc.)
- `js/` — UI modules (dashboard rendering, Scout chat/dock, topbar, appearance menu,
  navigation, charts/animations)
- `assets/` — brand art, product imagery, banners
- `dev_server.py` — optional local dev server with live reload

## Running locally

Any static file server works. For example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/pages/aha.html

For live reload during development:

```bash
pip install livereload
python3 dev_server.py
```

## Notes

This is a design/UX prototype. Data shown is placeholder/mock content, and charts are
rendered with lightweight CSS/SVG rather than a charting library.
