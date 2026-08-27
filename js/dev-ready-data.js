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
 * Regenerate from the browser that holds the state you want to ship:
 *   1. open pages/all-modules.html there
 *   2. run  WiseDevReady.dumpSeed()  in the console (also copies to clipboard)
 *   3. paste the result over the export below and commit
 */
export const DEV_READY_SEED = {
  "mi-trace": true,
  "trace:detail": true,
  "trace:done": true,
  "trace:live": true,
  "trace:mid": true,
};
