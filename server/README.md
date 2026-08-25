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

The key is stored locally and stripped from the URL. From then on that browser
stays in admin mode, which adds **Close thread** and **Delete** to every thread
and signs everything you write as the owner.

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
| POST | `/api/feedback/comments/<id>/resolve` | yes | Close / reopen a thread |
| DELETE | `/api/feedback/comments/<id>` | yes | Delete a thread |

`GET /comments?page=…` returns only open threads. With the key it also returns
closed ones, which is the only way to reopen one.

Dates are stamped server-side in UTC, so a reviewer's wrong system clock can't
skew a thread. The one exception is a note replayed from the offline queue,
which keeps its original client timestamp if it is neither in the future nor
more than 90 days old — otherwise a backlog would all land at once at the top
of the thread. Posts are rate limited to 20 per IP per minute.

## Who is who

A note is a **Comment** unless the person leaving it says otherwise — Bug,
Design, Copy, Question and Idea are there to be chosen, never assumed.

Identity is settled by the server, not by the browser. Anyone holding the admin
key posts under `WISE_FEEDBACK_OWNER` and is stamped `is_owner`, whatever name
the request carries. That closes a real trap: the widget remembers one name per
browser, so replying from the browser a reviewer used would otherwise have
signed your answer with *their* name. In admin mode there is no name field at
all — the composer says "Replying as …" and the reply is badged **Owner**.

## Closing a thread

Closing is the owner's call alone, and it takes the pin off the page for
everyone — a closed thread is not a dimmed pin, it is gone. The owner still
finds it under **Closed** in the comments panel, where it can be reopened; a
closed thread has no reply box until it is. **Delete** remains separate, and
still destroys the thread and its replies.

## One store, wherever you are

There is a single comment database, on the server. A local checkout writes to
that same database, so a note left while working locally and a note left by a
reviewer on the deployed site are one shared thread — open either and you see
both.

The widget works out where to send things by asking rather than guessing. On
load it probes `/api/feedback/health` on its own origin:

- **Deployed** — the API answers, so it is used directly.
- **Local checkout on a plain static server** (`python3 -m http.server`,
  `dev_server.py`) — nothing answers, so it falls back to the deployed API at
  `window.WISE_FEEDBACK_REMOTE` (default `http://3.17.180.155:4144`). This is
  cross-origin, which is why the service sets
  `WISE_FEEDBACK_ALLOW_LOCALHOST=1`.
- **Local checkout on `feedback_api.py`** — the API answers on its own origin,
  so it is used and nothing goes to the deployed server.

If the server cannot be reached at all, a note is parked in a local queue and
its pin is drawn with a dashed amber ring. The queue is replayed on the next
load that gets through, and in the background when the tab regains focus or
the network returns — nothing is stranded in one browser.

Comments are deliberately **not** in git. They are feedback *about* the code,
not part of it, so `git pull` never touches them and there is nothing to merge.

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

Then open <http://127.0.0.1:8770/pages/wiseai.html> and press C. Note this uses
a throwaway database, so these notes stay local — that is the point of the
probe. To write to the real shared store instead, serve the pages with any
static server and let the widget fall back to the deployed API.

To drive the whole flow headlessly — press C, click, post, reply — in both
themes and capture screenshots to `/tmp/wise-feedback-shots`:

```bash
python3 scripts/verify_feedback.py
```

To prove notes actually flow both ways — local to server, server to local,
queued while offline, replayed on reconnect, and old stranded notes rescued —
run a static server on 8099 and the API on 8770, then:

```bash
python3 scripts/verify_feedback_sync.py
```

To check identity and closing — the default category, that the owner's reply
cannot inherit a reviewer's name, that only the owner can close, and that a
closed thread really leaves the page — in both themes:

```bash
python3 scripts/verify_feedback_roles.py
```

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `WISE_FEEDBACK_DB` | `/var/lib/wise-feedback/comments.db` | SQLite file |
| `WISE_FEEDBACK_KEY` | *(empty)* | Admin secret; empty disables admin entirely |
| `WISE_FEEDBACK_OWNER` | `Owner` | Name the owner's notes and replies are signed with |
| `WISE_FEEDBACK_ORIGIN` | *(empty)* | Extra allowed origins, comma separated |
| `WISE_FEEDBACK_ALLOW_LOCALHOST` | *(empty)* | `1` lets a local checkout on any `localhost`/`127.0.0.1` port write to this store |

On the widget side, `window.WISE_FEEDBACK_API` pins the API base outright and
`window.WISE_FEEDBACK_REMOTE` sets the host to fall back to when there is no
same-origin API. Set either before `js/feedback.js` loads.
