/* Dev Ready seed — the committed default for the green "Dev Ready" switches on
 * pages/all-modules.html.
 *
 * The switches used to live only in localStorage ('wise-dsc-dev-ready'), which
 * is scoped per origin, so state built up on a local dev origin never reached
 * a deployed one. This map ships with the code instead. localStorage now holds
 * only the *diff* against this seed, so an updated seed reaches every browser
 * on the next push — including ones that have already toggled switches.
 *
 * Keys are the same stable ready ids the toggles render with:
 *   component name  e.g. "Score card"
 *   'dir:<area>'    directory areas        'tbl:<selector|label>'  tables
 *   'motion:<title>' motion items          'trace:<part>'          trace states
 *   'ds:<title>' / 'dsfont:*' / 'dstype:*'  design system parts
 *   'mi-*'          a whole module (set implicitly when every part is ready)
 * A value of `true` ships green; anything else ships off.
 *
 * On the local livereload server (127.0.0.1:8765) a toggle writes this file
 * automatically, so the next commit / pull is what the Ubuntu origin shows.
 * Manual fallback from any origin that holds the state you want to ship:
 *   1. open pages/all-modules.html there
 *   2. run  WiseDevReady.dumpSeed()  in the console (also copies to clipboard)
 *   3. paste the result over the export below and commit
 */
export const DEV_READY_SEED = {
  "Action scorecards": true,
  "Activity strip": true,
  "App search": true,
  "Attachments": true,
  "Avatars": true,
  "Buttons": true,
  "Chat composer": true,
  "Chat ⋯ menu": true,
  "Claim scorecards": true,
  "Data table": true,
  "Filter tiles": true,
  "Form fields": true,
  "History": true,
  "Intent chips": true,
  "Large intent cards": true,
  "Left-nav item": true,
  "Output chips": true,
  "Segmented control": true,
  "Status chips (domain)": true,
  "Status pills": true,
  "Switch": true,
  "Toast": true,
  "Transcript actions": true,
  "Transcript lines": true,
  "Width toggle": true,
  "ds:Brand": true,
  "ds:Elevation": true,
  "ds:Ink": true,
  "ds:Lines": true,
  "ds:Radii": true,
  "ds:Semantic · amber": true,
  "ds:Semantic · green": true,
  "ds:Semantic · red": true,
  "ds:Surfaces": true,
  "ds:font:DM Mono": true,
  "ds:font:DM Sans": true,
  "ds:font:Mono stack": true,
  "ds:font:Noto Serif": true,
  "ds:font:WISE Digits": true,
  "ds:type:Body large / lede": true,
  "ds:type:Body small": true,
  "ds:type:Eyebrow / label": true,
  "ds:type:Hero title": true,
  "ds:type:Micro badge": true,
  "ds:type:Module title": true,
  "ds:type:Section title": true,
  "ds:type:Stat numeral": true,
  "ds:type:UI base": true,
  "mi-design": true,
  "mi-motion": true,
  "mi-trace": true,
  "motion:Accordion &amp; panel open": true,
  "motion:Activity strip ticks": true,
  "motion:Carousel rail": true,
  "motion:Chart replay": true,
  "motion:Chat composer sheen": true,
  "motion:Chip fly-in": true,
  "motion:Count-up": true,
  "motion:Drag to file": true,
  "motion:Drag to found a folder": true,
  "motion:Drag to reorder": true,
  "motion:Gold chip shimmer": true,
  "motion:Jam equalizer": true,
  "motion:Jam visualizers": true,
  "motion:Module drag-resize": true,
  "motion:Output chip fan": true,
  "motion:Paragraph streaming": true,
  "motion:Sticky drawer slide-in": true,
  "motion:Thinking helix": true,
  "motion:Toast": true,
  "motion:Welcome helix": true,
  "motion:Width tiers": true,
  "trace:detail": true,
  "trace:done": true,
  "trace:live": true,
  "trace:mid": true,
};
