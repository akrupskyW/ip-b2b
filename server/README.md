# On-page comments

Reviewers press **C** on any page, click the exact spot they want to talk
about, pick a category chip, type a note and sign it with their name. The pin
stays glued to that element. Anyone can open a pin and reply, so each note is a
thread rather than a dead end.

- **Widget:** `js/feedback.js` (self-contained — injects its own CSS and icons)
- **API:** `server/feedback_api.py` (Flask + SQLite)

Without the API the widget still runs, but comments are saved in the
reviewer's own browser only and the panel says so. Deploy the API to actually
see what people wrote.

## How it runs on the Ubuntu box

The site has no nginx — it was a `python3 nocache_server.py 4144` static server
over the git checkout at `/home/ubuntu/wisealliance`. This service replaces that
process and serves **both** the pages and the API on port 4144, so the widget
talks to its own origin (no CORS, no second port to open in the AWS security
group) and the site keeps its no-cache headers.

Deploying a change is still just a pull:

```bash
cd ~/wisealliance && git pull && sudo systemctl restart wise-site
```

The comment database lives at `/home/ubuntu/wise-feedback/comments.db`, outside
the checkout, so pulls and resets never touch it. The admin secret lives in
`/home/ubuntu/wise-feedback/secret.env` (mode 600), which is why it is not in
this repo.

### First-time setup

```bash
sudo mkdir -p /home/ubuntu/wise-feedback
sudo chown ubuntu:ubuntu /home/ubuntu/wise-feedback
python3 -m venv /home/ubuntu/wise-feedback/venv
/home/ubuntu/wise-feedback/venv/bin/pip install -r ~/wisealliance/server/requirements.txt

printf 'WISE_FEEDBACK_KEY=%s\n' "$(openssl rand -hex 16)" \
  > /home/ubuntu/wise-feedback/secret.env
chmod 600 /home/ubuntu/wise-feedback/secret.env

sudo cp ~/wisealliance/server/wise-site.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wise-site
curl -s http://127.0.0.1:4144/api/feedback/health
```

`{"ok": true, "comments": 0}` means the widget is live. Unlike the old nohup
script, systemd restarts the site on failure and brings it back after a reboot.

## Reading and answering comments

Open any page with your secret once per browser:

```
http://3.17.180.155:4144/pages/wiseai.html?feedback=admin&key=YOUR_SECRET
```

The key is stored locally and stripped from the URL. Admin mode adds
**Resolve** and **Delete** to every thread; replying works the same as it does
for everyone else. From then on that browser stays in admin mode.

Straight from the terminal:

```bash
# every comment on every page (run on the server, or swap in the public host)
curl -s -H "X-Feedback-Key: $(. ~/wise-feedback/secret.env; echo $WISE_FEEDBACK_KEY)" \
  http://127.0.0.1:4144/api/feedback/comments/all | python3 -m json.tool

# one page
curl -s "http://127.0.0.1:4144/api/feedback/comments?page=/pages/add-product.html" \
  | python3 -m json.tool
```

## API

| Method | Path | Key | Purpose |
|---|---|---|---|
| GET | `/api/feedback/comments?page=…` | no | Comments for one page, with replies |
| POST | `/api/feedback/comments` | no | Leave a comment |
| POST | `/api/feedback/comments/<id>/replies` | no | Reply in a thread |
| GET | `/api/feedback/comments/all` | yes | Every comment, all pages |
| POST | `/api/feedback/comments/<id>/resolve` | yes | Resolve / reopen |
| DELETE | `/api/feedback/comments/<id>` | yes | Delete a thread |

Dates are stamped server-side in UTC, so a reviewer's wrong system clock can't
skew a thread. Posts are rate limited to 20 per IP per minute.

## Local testing

Point `WISE_FEEDBACK_STATIC` at the repo and one process serves both the site
and the API, so the widget reaches it on its own origin exactly as it does in
production:

```bash
pip install -r server/requirements.txt
WISE_FEEDBACK_DB=/tmp/wise-comments.db \
WISE_FEEDBACK_KEY=devsecret \
WISE_FEEDBACK_STATIC="$PWD" \
PORT=8770 python3 server/feedback_api.py
```

Then open <http://127.0.0.1:8770/pages/wiseai.html> and press C.

To drive the whole flow headlessly — press C, click, post, reply — in both
themes and capture screenshots to `/tmp/wise-feedback-shots`:

```bash
python3 scripts/verify_feedback.py
```

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `WISE_FEEDBACK_DB` | `/var/lib/wise-feedback/comments.db` | SQLite file |
| `WISE_FEEDBACK_KEY` | *(empty)* | Admin secret; empty disables admin entirely |
| `WISE_FEEDBACK_ORIGIN` | *(empty)* | Set only when the API is on another origin |

The widget reads `window.WISE_FEEDBACK_API` (default `/api/feedback`).
