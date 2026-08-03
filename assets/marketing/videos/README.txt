Drop the product demo films here to replace the placeholders.

The marketing "Watch it work" sections (#film) reference these files first, and
fall back to the shared hero film (../hero.mp4 / ../hero.webm) until they exist:

  marketing-app.html         -> wisecode-upf-demo.mp4  + wisecode-upf-demo.webm
  marketing-coach.html       -> wisecoach-demo.mp4     + wisecoach-demo.webm
  marketing-enterprise.html  -> wiseip-demo.mp4        + wiseip-demo.webm

Recommended: 16:9, H.264 .mp4 (+ VP9 .webm), 1080p, with a matching poster
image. Update each <video>'s poster="" and remove the .mkt-videoclip-badge
("Placeholder film") ribbon once the real cut is in.
