/**
 * Intent chips ask in full.
 *
 * A chip's face is a label — three or four words, sized to sit in a row of
 * chips. What the chip SENDS is not that label. It is the brief the member
 * would have written if they had the patience to write it: what the answer has
 * to contain, how it has to be grounded, what to do where the data runs out,
 * and what they expect to be able to decide once they have read it.
 *
 * The brief is composed at send time out of the chip itself, so every chip in
 * the app sends one — including chips added later — and no chip's label, size
 * or wording has to change to get it.
 *
 * Two things are load-bearing.
 *
 * The brief OPENS on the chip's own ask, word for word. The transcript still
 * reads as the thing the member tapped, the used-chip match that restores a
 * saved thread still finds it, and the chip's own words are still the first
 * thing said.
 *
 * The brief VARIES with what is being asked. A count does not need what a
 * comparison needs, and neither needs what a report needs — so the kind of ask
 * chooses the body, the subject matter adds to it, and the chip's own id picks
 * between phrasings so two chips of the same kind do not read as one template.
 *
 * Routing deliberately does not run on the brief. Hosts route their replies on
 * keywords, and a page of text matches half of them; callers post the brief and
 * route on the short ask. See `chipPrompt` in js/wiseai-chat.js.
 */

/* ── Small helpers ──────────────────────────────────────────────────────── */

/* A stable number per chip, so the phrasing a chip lands on is the same every
   time that chip is tapped but different from its neighbour's. */
function seedOf(s) {
  let h = 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i += 1) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pick(list, seed, salt) {
  if (!list || !list.length) return '';
  return list[(seed + (salt || 0)) % list.length];
}
function norm(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

/* ── What kind of ask is this? ──────────────────────────────────────────────
   Ordered most specific first: "Show me a pretty report" is a report, not a
   list; "Show the retailer breakdown" is a breakdown, not a list. */
const KIND_TESTS = [
  ['mention', /^@/],
  ['count', /^how (many|much|big|large|long|old)\b|\bnumber of\b|\bhow many\b|\bcount\b|\bskus?\b\s*[·|]|\btotal\b\s*(number|count)|\bshare that\b|\bwhat (share|percent|proportion)\b/i],
  ['compare', /\bcompare\b|\bcomparison\b|\bvs\.?\b|\bversus\b|side by side|\bagainst each other\b/i],
  ['breakdown', /\bbreak\s+(?:\w+\s+){0,3}(down|out)\b|\bbreakdown\b|\bdistribution\b|\bbroken (down|out)\b|\bby (?:its |their )?\w+ (status|level|tier|type|band|group|class)\b|\bby (category|categories|brand|brands|retailer|retailers|status|level|tier|type|region|team|owner|month|state|pl level|score)\b|\bper (category|brand|retailer|month)\b/i],
  ['chart', /\bchart\b|\bgraph\b|\bheatmap\b|\bvisuali[sz]|\bradar\b|\bplot\b|\bspider\b|\bcurve\b/i],
  ['report', /\breport\b|\bdeck\b|\bsummar(y|ise|ize)\b|\bbrief\b|\bwrite[- ]?up\b|\bone[- ]pager\b|\bexecutive\b/i],
  ['verify', /\bverif(y|ied|ication)\b|\bclaim\b|\baudit\b|\bconfirm\b|\bvalidate\b|\bsubstantiat/i],
  ['fix', /\bfix\b|\bresolve\b|\breformulat|\bimprove\b|\bswap\b|\bremediat|\bclean up\b|\breduce\b|\bcut\b|\braise\b|\brework\b/i],
  ['filter', /\bonly\b|\bnarrow\b|\bfilter\b|\bjust the\b|\bexclude\b|\brestrict\b|\bwithout\b/i],
  ['why', /^why\b|\bwhy (does|is|are|do|did|would|should)\b/i],
  ['how', /^how (do|does|can|should|would|will|is|are)\b|\bwalk me through\b|\bexplain\b|\bwhat does .+ mean\b|\bhow it works\b|\bwhat happens\b/i],
  ['story', /\bstory\b|\bplayful\b|\bjoke\b|\bpoem\b|\bidentified as\b/i],
  ['control', /^(open|switch|toggle|connect|add|invite|export|download|create|start|send|assign|remove|enable|disable|upload|save|apply|set|refresh|sync|play|pause|generate|build|make|redo|rebuild|re-?weight|file|copy|move|scan)\b/i],
  ['list', /^(list|show|give me|find|which|what are|what's|whats|who|where|top \d|bottom \d|browse|meet)\b|\ball (my|our) \b/i],
];
function kindOf(base, def) {
  const s = norm(base);
  if (def && def.promptKind) return def.promptKind;
  for (let i = 0; i < KIND_TESTS.length; i += 1) {
    if (KIND_TESTS[i][1].test(s)) return KIND_TESTS[i][0];
  }
  return 'question';
}

/* ── What is it about? ──────────────────────────────────────────────────────
   The domain layer is where a brief stops being generic. A GRAS chip's brief
   talks about affirmation routes and dossiers; an invoice chip's talks about
   terms and amounts. Each match contributes its own requirements. */
const DOMAINS = [
  {
    id: 'upf',
    test: /\bupf\b|ultra[- ]process|super ultra|\bpl ?[1-4]\b|processing level|\bnova\b/i,
    wants: [
      'Name the processing level for everything you mention, and say which marker put it there — the additive class, the industrial ingredient, or the process itself.',
      'Separate what is ultra-processed from what is merely processed. They are not the same finding and I do not want them averaged together.',
    ],
    ground: 'Use the WISEcode UPF coding as the definition of record, and note anywhere the federal proposal would score something differently.',
  },
  {
    id: 'gras',
    test: /\bgras\b|generally recognized as safe|self[- ]affirm|\bfema\b|\bgrn\b/i,
    wants: [
      'For each ingredient, say which GRAS route it sits on — an FDA response, a self-affirmed determination, a published notice, or nothing at all — and never let "no record" read as "safe".',
      'Flag anything whose only support is a self-affirmed determination, because that is the part of this that will not survive a buyer asking.',
    ],
    ground: 'Ground it in the ingredient records and the notice history, and cite the notice or docket where one exists.',
  },
  {
    id: 'score',
    test: /wisescore|wise score|\bguiding stars\b|\bpillar\b|\bmetric\b|\bscoring\b|\bscore\b/i,
    wants: [
      'Show the score and the metrics underneath it, not the score alone — I need to see which pillars carried it and which dragged it.',
      'Say how far each figure is from the next band, so I know whether this is a real gap or a rounding one.',
    ],
    ground: 'Use the current scoring model and say which version it is, so the numbers can be reconciled with a report pulled last month.',
  },
  {
    id: 'ingredient',
    test: /\bingredient|\badditive|\bemulsifier|\bsweeten|\bsodium\b|\badded sugar\b|\ballergen|\bpreservative|\bdye\b|\bcolor(ing|ant)\b|\bseed oil|\bflavou?r\b/i,
    wants: [
      'Work at the ingredient level, naming each one as it appears on the label rather than by its category.',
      'Call out the ones that are doing the damage, and for each say what it is there to do so I can judge whether it can come out.',
    ],
    ground: 'Read the ingredient statements themselves, and say when a statement is incomplete rather than inferring what is probably in there.',
  },
  {
    id: 'allergen',
    test: /\ballergen|\bgluten\b|\bdairy\b|\bnut\b|\bsesame\b|\bmay contain\b|\bcross[- ]contact\b/i,
    wants: [
      'Treat allergens as a compliance question, not a preference one: declared allergens, advisory statements, and anything that is implied but not declared.',
      'Say plainly where the label would fail a review, and what wording would fix it.',
    ],
    ground: 'Cite the label copy you read for each allergen finding.',
  },
  {
    id: 'brand',
    test: /\bbrand|\bretailer|\bstore\b|private label|\bwalmart|\bkroger|\bcostco|\bsprouts|\bkraft|\balbertsons|\bwhole foods|\bshelf\b/i,
    wants: [
      'Give the brand or retailer view as well as the item view — how many products, how they are spread, and where this one sits inside that.',
      'Say whether the pattern is the brand\u2019s doing or the category\u2019s, because those lead to opposite decisions.',
    ],
    ground: 'Name the brands and retailers exactly as the catalog spells them, and keep a parent company separate from its labels.',
  },
  {
    id: 'portfolio',
    test: /\bmy (foods|products|portfolio|catalog|brand|skus)\b|\bour (foods|products|portfolio|catalog)\b|\bunclaimed\b|\bclaimed\b/i,
    wants: [
      'Answer it for my own portfolio first and only bring in the wider catalog as the comparison.',
      'Say how much of my portfolio the answer actually covers, and which products fell out of it for want of data.',
    ],
    ground: 'Use the products attributed to my organization, and treat unclaimed products as unclaimed rather than quietly counting them in.',
  },
  {
    id: 'recipe',
    test: /\brecipe\b|\bmeal\b|\bdiet\b|\bcook|\bbrisket\b|\beat\b|\bmenu\b|\bswap\b.*\bfood\b/i,
    wants: [
      'Give me the real thing — quantities, method and timing — not a description of a dish.',
      'Say what each choice is doing nutritionally, and where a substitution would cost me flavour or texture.',
    ],
    ground: 'Keep the nutrition claims tied to the actual foods you name.',
  },
  {
    id: 'people',
    test: /\bteam|\bteammate|\buser|\bmember|\binvite|\brole\b|\bpermission|\bseat\b|\baccess\b|\bowner\b|\borganization|\bstaff\b/i,
    wants: [
      'Say who, on what role, with what access — and when that access was last actually used.',
      'Flag anything that looks like a permission nobody meant to grant, and what it would take to remove it.',
    ],
    ground: 'Use the current directory and role assignments, and note pending invitations separately from active accounts.',
  },
  {
    id: 'billing',
    test: /\binvoice|\bbilling|\bpayment|\bplan\b|\bcharge|\boutstanding|\bcredit|\brefund|\bsubscription|\bprice|\bcost\b|\bmargin|\bprofit/i,
    wants: [
      'Give the amounts, the dates and the terms — a number with no date on it is not an answer here.',
      'Separate what is genuinely overdue from what is simply not yet due, and total each.',
    ],
    ground: 'Use the billing records as they stand today and say when they were last reconciled.',
  },
  {
    id: 'api',
    test: /\bapi\b|\bkey\b|\btoken|\bendpoint|\bwebhook|\brate limit|\bintegration|\bsandbox\b/i,
    wants: [
      'Cover scope, age and last use for anything credential-shaped, and say which keys should be rotated.',
      'Where an endpoint is involved, give the call and the shape of what comes back.',
    ],
    ground: 'Use the live key and usage records, and never print a full secret.',
  },
  {
    id: 'alerts',
    test: /\balert|\bnotification|\bwatch\b|\bthreshold|\bqueue\b|\bpending\b|\bflagged\b/i,
    wants: [
      'Put the queue in the order I should work it, and say what makes the top item the top item.',
      'Separate what needs a decision from what only needs to be read.',
    ],
    ground: 'Use the live queue and say how old the oldest item is.',
  },
  {
    id: 'docs',
    test: /\bdoc(s|umentation)?\b|\bguide\b|\bhow[- ]to\b|\breference\b|\brelease notes\b|\bchangelog\b|\bupdates\b/i,
    wants: [
      'Point me at the specific place that answers this, not the section it lives in.',
      'Quote the part that matters and then say what it means for what I am doing.',
    ],
    ground: 'Cite the page or note you took each line from.',
  },
  {
    id: 'campaign',
    test: /\bcampaign|\bmarketing\b|\bposter|\bfilm\b|\bvideo\b|\bteaser\b|\blookbook|\bmerch|\bad\b|\bcreative\b|\bbillboard/i,
    wants: [
      'Show me finished work rather than a description of work — the pieces themselves, laid out so I can open any one of them.',
      'Give me the line and the sign-off, and let the art carry the argument instead of explaining it.',
    ],
    ground: 'Keep every claim in the creative defensible against the actual product data.',
  },
  {
    id: 'compliance',
    test: /\bfda\b|\blabel\b|\bregulat|\bfederal register\b|\blaw\b|\bcompliance|\bnutrition facts\b|\bstatute|\bproposal\b|\brule\b|\bpolicy\b/i,
    wants: [
      'Distinguish what is in force from what is proposed, and date each.',
      'Say what would actually have to change on pack, and by when.',
    ],
    ground: 'Cite the primary source — the rule, the notice, the docket — not a summary of it.',
  },
  {
    id: 'system',
    test: /\bagent|\bmodel\b|\bstudio\b|\bhelix\b|\bmodule\b|\bcodebase\b|\bapp\b|\bpage\b|\bsurface\b/i,
    wants: [
      'Describe what it does on the surface, in the words someone using it would use.',
      'Say what is actually wired versus what is still a placeholder.',
    ],
    ground: 'Ground it in what is really there right now, not in what was planned.',
  },
];
function domainsOf(base, def) {
  const hay = `${norm(base)} ${String((def && def.intent) || '').replace(/_/g, ' ')}`;
  const hits = DOMAINS.filter((d) => d.test.test(hay));
  return hits.slice(0, 2);
}

/* ── The subject, when it can be lifted cleanly ─────────────────────────────
   Only used where any noun phrase reads correctly. A label that is a whole
   question ("Why is Anti-Inflammatory my weakest metric?") yields nothing, and
   the neutral phrasing is used instead — a brief that reads like a mail merge
   is worse than one that says "this". */
const LEAD_STRIP = /^(please\s+)?(can you\s+|could you\s+)?(show me( the| a| all)?|show( me)?( the| a| all)?|give me( the| a| all)?|list( out)?( the| all| my)?|find( me)?( the| all| my)?|tell me about|break down|break out|compare|analy[sz]e|summari[sz]e|open|display|pull up|surface|what are( the| my)?|which of( my| our)?|which( are| is)?|how many( of)?|top \d+|bottom \d+)\s+/i;
function subjectOf(base) {
  let s = norm(base).replace(/[?.!]+$/, '');
  if (/^@/.test(s)) return '';
  const cut = s.replace(LEAD_STRIP, '');
  if (cut === s) return '';
  s = cut.trim();
  if (!s || s.length < 4) return '';
  if (s.split(' ').length > 8) return '';
  /* A clause, not a noun phrase — no template can host it safely. */
  if (/\b(is|are|was|were|do|does|did|can|should|would|will|have|has)\b/i.test(s)) return '';
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/* The surface is only named when it has a name. A page title that is really a
   tagline ("Ask your verified food data anything") would read as nonsense in
   "I am asking this on the … page", so anything sentence-shaped is dropped and
   the brief simply does not mention where it was sent from. */
function surfaceName(raw) {
  const s = norm(raw).replace(/\u2122/g, '').replace(/[.?!]+$/, '').trim();
  if (!s) return '';
  const words = s.split(' ');
  if (words.length > 4) return '';
  if (/^(ask|show|find|get|see|make|build|discover|explore|verify)\b/i.test(s)) return '';
  if (/^wisecodeai$/i.test(s) || /^wise$/i.test(s)) return '';
  return s;
}

/* ── The bodies, one per kind ───────────────────────────────────────────────
   `lead` opens the list and ends in a colon, so the transcript's prompt
   formatter gives it the weight of a lead-in. */
function bodyFor(kind, seed, subject) {
  switch (kind) {
    case 'count':
      return {
        scope: pick([
          'I want the number, and I want to be able to defend it in a meeting, so do not stop at the figure.',
          'Treat this as a number I am going to be quoted back on. That means the figure and the reasoning that produced it.',
        ], seed, 1),
        lead: 'Give me the count first and then show me how it was reached:',
        wants: [
          'The exact figure as of the latest sync, not a rounded one, and the date that sync ran.',
          'The denominator it sits inside, so I can read it as a share as well as a total.',
          `How the set was defined — what counted as ${subject || 'a member of it'}, what was deliberately left out, and why.`,
          'The same figure one level down, split by whichever cut actually explains it.',
        ],
        ground: 'If the underlying records disagree with each other, say so instead of picking a side, and tell me which figure I can quote and which one I cannot.',
        close: pick([
          'Then close on the one thing this number should change about what I do next.',
          'End by telling me whether this figure is good, bad, or unremarkable for a portfolio this size.',
        ], seed, 2),
      };
    case 'compare':
      return {
        scope: pick([
          'Put them side by side rather than describing them one after another — the whole value of this is in the gap.',
          'This is a comparison, so the answer is the difference, not two descriptions.',
        ], seed, 3),
        lead: 'Lay it out so the difference is the thing I read first:',
        wants: [
          'One row per item and one column per metric, with every metric named in full rather than abbreviated.',
          'The gap stated as a number — not "higher", not "better".',
          'The single metric where they diverge most, called out on its own line.',
          'Anything they have in common that makes the comparison less meaningful than it looks.',
        ],
        ground: 'Where a value is missing for one side, leave the cell empty and say so underneath. Do not fill it with a category average.',
        close: pick([
          'Then tell me which one I would pick, on what grounds, and what would have to change for that to flip.',
          'Finish with the call: which one wins, and how close it actually was.',
        ], seed, 4),
      };
    case 'breakdown':
      return {
        scope: pick([
          'Split it properly. A total with no structure under it tells me nothing I can act on.',
          'I am after the shape of it, not the headline — show me where it concentrates.',
        ], seed, 5),
        lead: 'Break it out so I can see where it concentrates:',
        wants: [
          'Every group, with its count and its share of the whole, ordered largest first.',
          'The long tail collapsed into one honest "everything else" rather than dropped.',
          'The two groups that move the total most, named, with what they contribute.',
          'The cut that surprised you, if one did, even though I did not ask for it.',
        ],
        ground: 'Say how many records could not be placed in any group, and keep them visible instead of quietly excluding them.',
        close: pick([
          'Then tell me which group I should be working on first.',
          'End on which slice is worth my time and which is noise.',
        ], seed, 6),
      };
    case 'chart':
      return {
        scope: pick([
          'Draw it. I want to read this off a chart, not out of a paragraph about a chart.',
          'This should arrive as a real visualization I can look at and then interrogate.',
        ], seed, 7),
        lead: 'Build the visual so it stands on its own:',
        wants: [
          'A chart type that suits the question rather than the prettiest one — and say in a line why that type.',
          'Axes, units and scale labelled, with the scale starting where it honestly should.',
          'The handful of points that matter annotated on the chart itself.',
          'A short read-out underneath: what the shape means, in two or three sentences.',
        ],
        format: 'Keep it legible in both light and dark, and readable at the width it lands in rather than only full screen.',
        ground: 'Plot only what the data supports. Where a series is incomplete, break the line rather than interpolating across the gap.',
        close: pick([
          'Then tell me the one thing this chart should change my mind about.',
          'Finish by telling me what I would look at next if this chart is right.',
        ], seed, 8),
      };
    case 'report':
      return {
        scope: pick([
          'Write this as a document somebody else could read without me in the room.',
          'Build it as a finished piece of work — something I could forward as it stands.',
        ], seed, 9),
        lead: 'Structure it properly:',
        wants: [
          'An opening that states the finding in one sentence, before any method.',
          'The evidence in the middle, as tables and charts rather than prose where a table would do.',
          'The assumptions written down, including the ones that are only conventions.',
          'Recommendations that name an owner and a first step, not a list of considerations.',
          'A closing section on what would change the conclusion.',
        ],
        format: 'Give it real headings and let it run long where the substance needs it. Do not pad the parts where it does not.',
        ground: 'Every number in it has to trace back to a source I can open, and anything modelled has to be labelled as modelled.',
        close: pick([
          'Then tell me which section will get argued with first, and shore it up.',
          'End with the single decision this report exists to unblock.',
        ], seed, 10),
      };
    case 'verify':
      return {
        scope: pick([
          'Treat this as a verification pass, not a summary — I need to know what holds up.',
          'Check it rather than describe it. The output I want is a verdict with its working shown.',
        ], seed, 11),
        lead: 'For each item, give me the verdict and the evidence behind it:',
        wants: [
          'Verified, unverified, or contradicted — and never "unknown" where you mean "nobody has looked".',
          'The source that supports the verdict, named specifically enough that I can open it.',
          'What is missing, item by item, and what would close the gap.',
          'The ones I should not put in front of a customer yet, listed on their own.',
        ],
        ground: 'Where the evidence is weak, say it is weak. A confident-sounding verdict on thin support is worse to me than an honest gap.',
        close: pick([
          'Then give me the order to work through them in.',
          'Finish with what I can safely claim today and what has to wait.',
        ], seed, 12),
      };
    case 'fix':
      return {
        scope: pick([
          'I am asking for a change, so give me the change — the current state, the target, and the route between them.',
          'This is a fix, not an assessment. Tell me what to do, in order.',
        ], seed, 13),
        lead: 'Give me something I can actually execute:',
        wants: [
          'What it is now and what it would become, with both numbers.',
          'The specific moves, in the order they should happen.',
          'What each move costs — in formulation, in label copy, in money, in time.',
          'The knock-on effects, including the ones I would not think to check.',
          'The cheapest move that gets most of the benefit, if there is one.',
        ],
        ground: 'Do not propose anything that would break a claim or a regulation without flagging it, and say where a change needs a lab or a supplier to confirm it.',
        close: pick([
          'Then tell me what to do first, this week.',
          'End on the one change you would make if you could only make one.',
        ], seed, 14),
      };
    case 'filter':
      return {
        scope: pick([
          'Narrow it, and be explicit about what the narrowing removed.',
          'Apply the cut — but a filtered answer that hides its own edges is a trap, so show me the edges.',
        ], seed, 15),
        lead: 'Re-run it against the narrower set:',
        wants: [
          'The filtered result, with how many records came in and how many are left.',
          'The rule you filtered on, written out, so I can tell whether it is the rule I meant.',
          'What changed versus the unfiltered answer — including anything that reversed.',
          'The borderline cases the rule excluded that I might want back.',
        ],
        ground: 'If the filter leaves too little to say anything reliable, tell me that instead of reporting a pattern from a handful of records.',
        close: pick([
          'Then tell me whether the narrower cut changes the conclusion or just sharpens it.',
          'Finish by saying whether this is the right cut to be looking at.',
        ], seed, 16),
      };
    case 'why':
      return {
        scope: pick([
          'I want the cause, not the restatement. Do not tell me it is low; tell me what made it low.',
          'Answer the "why" as a chain I can follow, and stop when you reach something I could actually change.',
        ], seed, 17),
        lead: 'Work back from the effect to the cause:',
        wants: [
          'The direct cause, stated first and plainly.',
          'The chain behind it, one step at a time, with the number at each step.',
          'What is driving it that I control, kept separate from what I do not.',
          'The explanation somebody else would reach for that is wrong, and why it is wrong.',
        ],
        ground: 'Where the data supports correlation but not cause, say so in those words rather than implying the stronger claim.',
        close: pick([
          'Then tell me what would have to be true for this to stop being the case.',
          'End on the single lever that moves it most.',
        ], seed, 18),
      };
    case 'how':
      return {
        scope: pick([
          'Walk me through it as though I am going to do it straight after reading this.',
          'Explain it the way you would to someone competent who has simply never done it here.',
        ], seed, 19),
        lead: 'Take it in order and leave nothing implied:',
        wants: [
          'The steps, numbered, each one an action rather than a topic.',
          'Where each step happens on the surface, and what it looks like when it worked.',
          'The step people get wrong, called out where it falls.',
          'What to do when it does not work, and who owns it then.',
        ],
        ground: 'Only describe what is actually there today. If a step depends on something that is not wired yet, say so at that step.',
        close: pick([
          'Then give me the short version — the same thing in three lines, for when I have done it once.',
          'End with what changes once this is done.',
        ], seed, 20),
      };
    case 'list':
      return {
        scope: pick([
          'Give me the actual items. A description of the set is not the set.',
          'I want the list itself, ordered by something I can defend, not a sample of it.',
        ], seed, 21),
        lead: 'Return it as a real list I can work down:',
        wants: [
          'Every item, ordered by whichever measure makes the order meaningful, and say which measure that is.',
          'The two or three fields per item that let me tell them apart, and nothing else.',
          `How many there are in total, and whether what you are showing me is all of ${subject || 'them'} or only the top of the set.`,
          'The ones at the bottom as well as the top — the tail is usually where the work is.',
        ],
        format: 'Put it in a table once there is more than a handful, and keep the columns narrow enough to read at this width.',
        ground: 'Every row has to be a real record. If you are short of data on one, show the row and mark the gap rather than dropping it.',
        close: pick([
          'Then pick out the two or three worth my attention and say why.',
          'Finish on what this list tells me that the total did not.',
        ], seed, 22),
      };
    case 'control':
      return {
        scope: pick([
          'Do it, and then tell me plainly what changed — I should not have to go and check.',
          'Carry it out and report back on the state I am now in.',
        ], seed, 23),
        lead: 'Confirm it the way I would want it confirmed:',
        wants: [
          'What you changed, in one sentence, in the words the surface uses.',
          'What it was before, so I can tell whether this is what I meant.',
          'Anything else it affected, including things on other pages.',
          'How to undo it, if it can be undone.',
        ],
        ground: 'If any part of it could not be done, say which part and why, rather than reporting a partial job as finished.',
        close: pick([
          'Then tell me the next thing this makes possible.',
          'End with what I should look at now that it is done.',
        ], seed, 24),
      };
    case 'story':
      return {
        scope: pick([
          'Have some fun with this, but keep every fact in it true.',
          'Tell it properly — voice, shape, an ending — and let the real data do the work underneath.',
        ], seed, 25),
        lead: 'Keep it honest while you are enjoying yourself:',
        wants: [
          'A real beginning, middle and end rather than a paragraph of whimsy.',
          'Actual foods, actual numbers, actual names from the catalog.',
          'The point of it landing in the last line, not explained in the first.',
        ],
        ground: 'Nothing invented that reads as a fact. If you need a figure and do not have one, write around it.',
        close: pick([
          'Then, underneath, give me the one true thing the story was about.',
          'Finish with the straight version in a sentence, for the people who want it.',
        ], seed, 26),
      };
    case 'mention':
      return {
        scope: 'This is addressed to one person in the room, so answer as them, in their voice, from their own remit.',
        lead: 'Keep it in character and keep it useful:',
        wants: [
          'The view from that discipline specifically, not a general answer with a name on it.',
          'What they would need from someone else before they could go further.',
          'Where they disagree with the room, if they do.',
        ],
        ground: 'Only speak to what that role would actually know. Hand the rest to whoever owns it.',
        close: 'Then say what they want to happen next, and who has to do it.',
      };
    case 'help':
      return {
        scope: 'Tell me what I can actually ask you on this surface, and be concrete about it.',
        lead: 'Group it so I can find myself in it:',
        wants: [
          'The things this surface is genuinely good at, each with an example ask I could send as written.',
          'What it can do that I would not guess from looking at it.',
          'What it cannot do here, and where that lives instead.',
        ],
        ground: 'Only offer asks that really work on this page today.',
        close: 'Then suggest the one I should start with, given what is in front of me.',
      };
    default:
      return {
        scope: pick([
          'Answer it fully. I would rather read something long and complete than something tidy and thin.',
          'Take the question seriously and give me the whole of it, including the parts I did not think to ask about.',
        ], seed, 27),
        lead: 'What the answer needs to contain:',
        wants: [
          'The direct answer, first, in one or two sentences, before any working.',
          'The evidence behind it, with the numbers written out.',
          'The part of it that is uncertain, marked as uncertain.',
          `Anything about ${subject || 'the question itself'} that changes how I should read the answer.`,
        ],
        ground: 'Ground it in the records rather than in general knowledge, and say which source each part came from. Where you do not have the data, say that plainly instead of filling it in.',
        close: pick([
          'Then tell me what to do about it.',
          'End on what this changes, and what I should ask next.',
        ], seed, 28),
      };
  }
}

/* ── Compose ────────────────────────────────────────────────────────────── */

const CACHE = new Map();

/**
 * The full prompt a chip sends.
 *
 * @param {object} def   the chip / scorecard definition
 * @param {object} [ctx] { surface } — the module or page the ask is sent from
 * @returns {string} a multi-line brief opening on the chip's own ask
 */
export function expandIntentPrompt(def, ctx) {
  if (!def) return '';
  /* A chip may carry its own hand-written brief, and a long `ask` already IS
     one (the Atlas and campaign briefs are written out in full at the call
     site). Neither gets rewritten. */
  if (def.prompt) return String(def.prompt);
  const base = norm(def.ask || def.label || def.title || '');
  if (!base) return '';
  if (/\n/.test(String(def.ask || ''))) return String(def.ask);
  if (base.length > 260) return base;
  /* Opted out — a chip whose posted line has to stay exactly as written. */
  if (def.expandPrompt === false) return base;

  const surface = surfaceName(ctx && ctx.surface);
  const key = `${def.intent || base}\u0000${base}\u0000${surface}`;
  if (CACHE.has(key)) return CACHE.get(key);

  const seed = seedOf(def.intent || base);
  const kind = kindOf(base, def);
  const subject = subjectOf(base);
  const body = bodyFor(kind, seed, subject);
  const domains = domainsOf(base, def);

  const wants = body.wants.slice();
  domains.forEach((d) => { wants.push(d.wants[seed % d.wants.length]); });

  const blocks = [base, ''];
  if (surface) {
    blocks.push(`${body.scope} I am asking this on the ${surface} page, so start with what is already in front of me there.`, '');
  } else {
    blocks.push(body.scope, '');
  }
  blocks.push(body.lead);
  wants.forEach((w) => blocks.push(`- ${w}`));
  blocks.push('');
  if (body.format) blocks.push(body.format, '');
  const grounds = [body.ground].concat(domains.map((d) => d.ground)).filter(Boolean);
  blocks.push(grounds.join(' '), '');
  blocks.push(body.close);

  const out = blocks.join('\n');
  CACHE.set(key, out);
  return out;
}

/* Same expansion for a bare string, where the caller has no chip object —
   the hand-rolled flows post fixed lines and still owe the member a full ask. */
export function expandAskText(text, ctx, seedKey) {
  const base = norm(text);
  if (!base) return '';
  return expandIntentPrompt({ intent: seedKey || base, ask: base }, ctx);
}

/* Non-module surfaces (a page script, a flow loaded without imports) read it
   off the window rather than forking a second copy. */
try {
  window.WiseIntentPrompt = { expand: expandIntentPrompt, expandText: expandAskText };
} catch (_) { /* no window */ }
