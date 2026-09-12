"""Cut the Think Wise launch film from the campaign's own artwork.

The film is not separate footage: every shot is one of the finished pieces in
assets/think-wise, pushed into slowly, cut against title cards that carry the
three-part line. That is deliberate — the campaign owns the billboards and the
molds, so the film is those objects rather than a parallel set of renders.

There is no ffmpeg on this machine, so frames are rendered here and handed to
scripts/_stills_to_mp4.swift, which encodes them through AVFoundation.

    python3 scripts/_thinkwise_film.py

Writes assets/think-wise/film-the-wise-walk.mp4.
"""
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "assets", "think-wise")
OUT = os.path.join(ART, "film-the-wise-walk.mp4")
ENCODER_SRC = os.path.join(ROOT, "scripts", "_stills_to_mp4.swift")

SIZE = (1280, 720)
FPS = 24
DISSOLVE = 0.30

# Sampled from the campaign artwork so the cards sit in the same world as the
# printed work: the map's navy ground, the billboard's cream, gold and green.
NAVY = (20, 47, 76)
CREAM = (241, 237, 225)
GOLD = (229, 163, 42)
GREEN = (123, 168, 60)

FONT_PATH = "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf"

_art_cache = {}


def art(name):
    """One campaign piece, decoded once."""
    if name not in _art_cache:
        _art_cache[name] = Image.open(os.path.join(ART, name + ".jpg")).convert("RGB")
    return _art_cache[name]


def font(px):
    return ImageFont.truetype(FONT_PATH, px)


def ease(t):
    """Smooth in and out, so a push never starts or stops on a jolt."""
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def lockup():
    """The white WISEcode lockup, lifted off the park map.

    The map renders it flat and unforeshortened on the same navy the cards use,
    so it composites onto an end card without a seam. Finding it by its own
    pixels rather than by hardcoded coordinates keeps this honest if the map is
    ever regenerated.
    """
    if "__lockup" in _art_cache:
        return _art_cache["__lockup"]
    src = art("park-map-installation")
    w, h = src.size
    quad = src.crop((int(0.70 * w), int(0.82 * h), w, h))
    px = quad.load()
    xs, ys = [], []
    for y in range(quad.height):
        for x in range(quad.width):
            r, g, b = px[x, y]
            if r > 200 and g > 205 and b > 205:
                xs.append(x)
                ys.append(y)
    if not xs:
        raise SystemExit("could not find the lockup on the park map")
    pad = 8
    box = (max(0, min(xs) - pad), max(0, min(ys) - pad),
           min(quad.width, max(xs) + pad + 1), min(quad.height, max(ys) + pad + 1))
    _art_cache["__lockup"] = quad.crop(box)
    return _art_cache["__lockup"]


def push(name, dur, z0, z1, focus=(0.5, 0.5)):
    """A slow push into one piece: a 16:9 window closing from z0 to z1."""
    def render(t):
        im = art(name)
        w, h = im.size
        ow, oh = SIZE
        ar = ow / float(oh)
        z = z0 + (z1 - z0) * ease(t / dur if dur else 1.0)
        bw = min(float(w), h * ar) / z
        bh = bw / ar
        cx, cy = focus[0] * w, focus[1] * h
        x0 = max(0.0, min(w - bw, cx - bw / 2.0))
        y0 = max(0.0, min(h - bh, cy - bh / 2.0))
        crop = im.crop((int(round(x0)), int(round(y0)),
                        int(round(x0 + bw)), int(round(y0 + bh))))
        return crop.resize(SIZE, Image.LANCZOS)
    return {"dur": dur, "render": render}


def card(text, color, dur, sub=None):
    """A title card: one line of the campaign's own type on the navy ground."""
    def render(t):
        im = Image.new("RGB", SIZE, NAVY)
        d = ImageDraw.Draw(im)
        ow, oh = SIZE
        # Size the line to the frame, then let it drift a hair larger so a
        # static card still breathes.
        size = 150
        f = font(size)
        while d.textlength(text, font=f) > ow * 0.80 and size > 40:
            size -= 4
            f = font(size)
        grow = 1.0 + 0.03 * ease(t / dur if dur else 1.0)
        f = font(max(20, int(size * grow)))
        tw = d.textlength(text, font=f)
        box = f.getbbox(text)
        th = box[3] - box[1]
        x = (ow - tw) / 2.0
        y = oh / 2.0 - th / 2.0 - box[1]
        if sub:
            y -= th * 0.30
        d.text((x, y), text, font=f, fill=color)
        if sub:
            sf = font(max(16, int(size * 0.20)))
            sw = d.textlength(sub, font=sf)
            d.text(((ow - sw) / 2.0, y + th * 1.35), sub, font=sf, fill=CREAM)
        return im
    return {"dur": dur, "render": render}


def endcard(dur):
    """The sign-off: the lockup, then the line the campaign closes on."""
    def render(t):
        im = Image.new("RGB", SIZE, NAVY)
        ow, oh = SIZE
        mark = lockup()
        target_w = int(ow * (0.30 + 0.012 * ease(t / dur if dur else 1.0)))
        scale = target_w / float(mark.width)
        mark_r = mark.resize((target_w, max(1, int(mark.height * scale))), Image.LANCZOS)
        im.paste(mark_r, ((ow - mark_r.width) // 2, int(oh * 0.34) - mark_r.height // 2))
        d = ImageDraw.Draw(im)
        line = "FOOD FOR TRUTH"
        f = font(84)
        tw = d.textlength(line, font=f)
        d.text(((ow - tw) / 2.0, oh * 0.56), line, font=f, fill=GOLD)
        return im
    return {"dur": dur, "render": render}


# The cut. Rue doubts it, Ollie scans it, Sage gives the verdict — the same
# order as the line, so the film teaches the line without explaining it.
TIMELINE = [
    card("INFORMATION IS EASY.", CREAM, 2.0),
    card("TRUTH IS NOT.", GOLD, 1.8),
    push("billboard-truth-is-not", 2.8, 1.06, 1.20, (0.66, 0.46)),
    card("THINK WISE.", CREAM, 1.3),
    push("mold-rue-think-wise", 2.3, 1.12, 1.26, (0.50, 0.34)),
    card("CODE WISE.", GOLD, 1.3),
    push("mold-ollie-code-wise", 2.3, 1.12, 1.26, (0.52, 0.30)),
    card("LIVE WISE.", GREEN, 1.3),
    push("mold-sage-live-wise", 2.3, 1.12, 1.26, (0.50, 0.32)),
    push("park-approach-lane", 2.8, 1.00, 1.22, (0.55, 0.46)),
    push("mold-night-lit", 3.0, 1.04, 1.18, (0.50, 0.46)),
    endcard(2.6),
]


def build_frames(out_dir):
    """Render the whole timeline, cross-dissolving each cut into the next."""
    starts = []
    at = 0.0
    for seg in TIMELINE:
        starts.append(at)
        at += seg["dur"] - DISSOLVE
    total = at + DISSOLVE
    frames = int(round(total * FPS))

    for i in range(frames):
        t = i / float(FPS)
        live = []
        for seg, start in zip(TIMELINE, starts):
            local = t - start
            if -1e-6 <= local <= seg["dur"] + 1e-6:
                live.append((seg, max(0.0, min(seg["dur"], local)), start))
        if not live:
            live = [(TIMELINE[-1], TIMELINE[-1]["dur"], starts[-1])]
        frame = live[0][0]["render"](live[0][1])
        for seg, local, start in live[1:]:
            # Two segments overlap only inside a dissolve, so the incoming
            # one's own elapsed time is the blend amount.
            alpha = max(0.0, min(1.0, local / DISSOLVE)) if DISSOLVE else 1.0
            frame = Image.blend(frame, seg["render"](local), alpha)
        # Fade up from the ground at the head, and back down at the tail.
        head, tail = 0.5, 0.7
        k = None
        if t < head:
            k = t / head
        elif t > total - tail:
            k = max(0.0, (total - t) / tail)
        if k is not None:
            frame = Image.blend(Image.new("RGB", SIZE, NAVY), frame, ease(k))
        frame.save(os.path.join(out_dir, "frame_%05d.jpg" % i), "JPEG", quality=92)
    return frames, total


def main():
    if not os.path.exists(FONT_PATH):
        raise SystemExit("missing font: %s" % FONT_PATH)
    encoder = os.path.join(tempfile.gettempdir(), "wise_stills2mp4")
    if not os.path.exists(encoder) or os.path.getmtime(ENCODER_SRC) > os.path.getmtime(encoder):
        print("compiling the encoder (this takes a moment)…")
        subprocess.run(["swiftc", "-O", ENCODER_SRC, "-o", encoder], check=True)
    work = tempfile.mkdtemp(prefix="thinkwise-film-")
    try:
        frames, total = build_frames(work)
        print("rendered %d frames (%.1fs)" % (frames, total))
        subprocess.run([encoder, work, OUT, str(FPS)], check=True)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
