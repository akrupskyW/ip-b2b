/* ══════════════════════════════════════════════════════════════════════
   Reformulation Studio — chat-driven Guiding Stars reformulation.
   Data + scoring engine ported from the Guiding Stars Dashboard.
   Chat in the center drives intents; the right ⭐ panel visualizes them
   at both PORTFOLIO and PRODUCT level.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const D = window.GS_DATA;
if (!D) { document.getElementById('rf-view').innerHTML = '<div class="rf-empty">Could not load dataset (js/gs-data.js).</div>'; return; }
const BRANDS = D.brands, ADDS = D.adds, RECS = D.recs, DQRS = D.dqrs, VK = D.vk, VL = D.vl, S = D.summary, ROWS = D.rows;

/* ── Star color ramp (0★→3★) ──
   Reuses the exact distribution palette from analytics-types.html (the shared
   dashboard TIER scale) so the reformulation charts speak the same visual
   language as the rest of the app: 0★ = poor (red) → 1★ = okay (amber) →
   2★ = good → 3★ = excellent (green). No invented hues. */
const STAR_COLORS = ['var(--sec-red)', 'var(--ter-amber)', '#7DC470', 'var(--sec-green)'];
const ALGO_NAMES = { G: 'General Foods', M: 'Meat / Dairy / Nuts', F: 'Fats & Oils', I: 'Infant / Toddler', V: 'Beverage' };
const ALGO_KEYS = { G: 'General', M: 'Meat/Dairy', F: 'Fats & Oils', I: 'Infant', V: 'Beverages' };
const EFF_LBL = ['🟢 Low effort', '🟡 Medium effort', '🔴 Higher effort'];
const EFF_CLS = ['e0', 'e1', 'e2'];

/* ═══════════ Data accessors (compact array → values) ═══════════ */
const rName = r => r[0];
const rBrand = r => BRANDS[r[1]] || '';
const rSv = r => r[2];
const rKcal = r => r[3];
const rAlgo = r => r[4];
const rStars = r => r[5];
const rScore = r => r[6];
const rDq = r => r[7] === 1;
const rSatf = r => r[8] / 10, rFib = r => r[9] / 10, rAsug = r => r[10] / 10, rSod = r => r[11];
const rSatfSv = r => r[12] / 10, rFibSv = r => r[13] / 10, rAsugSv = r => r[14] / 10, rSodSv = r => r[15];
const rChol = r => r[16] / 10;
const rAddc = r => r[17];
const rAdds = r => (r[18] || []).map(i => ADDS[i]).filter(Boolean);
const rDpSatf = r => r[20], rDpSug = r => r[21], rDpSod = r => r[22], rDpTrans = r => r[23], rDpAdds = r => r[24];
const rCpFib = r => r[25], rCpVm = r => r[26], rCpWg = r => r[27];
const rDqrs = r => (r[28] || []).map(i => DQRS[i]).filter(Boolean);
const rTrans = r => r[31] === 1, rWg = r => r[32] === 1, rIng = r => r[33] || '';
const rAllVms = r => (r[34] || []).map(([ki, v]) => ({ k: VL[ki] || VK[ki] || '', v: v / 10 }));
const rStdStars = r => r.length > 35 ? r[35] : r[5];
const rStdScore = r => r.length > 36 ? r[36] : r[6];
const rStdVm = r => r.length > 37 ? r[37] : (r[26] || 0);
const rAsugPct = r => rAsug(r) * 4;

function servingGrams(r) {
  const sv = rSv(r) || '';
  const mg = sv.match(/\((\d+\.?\d*)\s*g\)/i) || sv.match(/(\d+\.?\d*)\s*g(?:\b|\s|$)/i);
  if (mg) return parseFloat(mg[1]);
  const mml = sv.match(/\((\d+\.?\d*)\s*ml\)/i) || sv.match(/(\d+\.?\d*)\s*ml(?:\b|\s|$)/i);
  if (mml) return parseFloat(mml[1]);
  return null;
}

/* ═══════════ Scoring engine (mirrors the dashboard / score_products.py) ═══════════ */
function scoreG(satf, chol, asug, sod, fib, adds, trans, wg, vm) {
  const p = asug * 4; const dqr = [];
  if (sod > 575) dqr.push('Sodium >575mg'); if (chol > 300) dqr.push('Cholesterol >300mg');
  if (p > 40) dqr.push('Sugar >40% kcal'); if (adds.length >= 2) dqr.push('≥2 additives');
  const dq = dqr.length > 0; let s = 0;
  s += trans ? -1 : 0; s += adds.length >= 1 ? -1 : 0;
  s += satf <= 1 ? 0 : satf <= 2 ? -1 : satf <= 3 ? -2 : -3;
  s += p === 0 ? 0 : p <= 6 ? -1 : p <= 25 ? -2 : -3;
  s += sod <= 115 ? 0 : sod <= 230 ? -1 : sod <= 345 ? -2 : -3;
  s += fib >= 4.2 ? 3 : fib >= 2.8 ? 2 : fib >= 1.4 ? 1 : 0;
  s += vm; s += wg ? 1 : 0;
  const stars = dq ? 0 : (s <= 0 ? 0 : s <= 2 ? 1 : s <= 4 ? 2 : 3);
  return { dq, dqr, score: s, stars };
}
function scoreV(satf, chol, asug, sod, fib, adds, trans, wg, vm) {
  const p = asug * 4; const dqr = [];
  if (sod > 575) dqr.push('Sodium >575mg'); if (chol > 300) dqr.push('Cholesterol >300mg');
  if (p > 40) dqr.push('Sugar >40% kcal'); if (adds.length >= 2) dqr.push('≥2 additives');
  const dq = dqr.length > 0; let s = 3;
  const tPts = trans ? -1 : 0; s += tPts;
  const aPts = adds.length >= 1 ? -1 : 0; s += aPts;
  const sfPts = satf <= 1 ? 0 : satf <= 2 ? -1 : satf <= 3 ? -2 : -3; s += sfPts;
  const sgPts = p === 0 ? 0 : p <= 6 ? -1 : p <= 25 ? -2 : -3; s += sgPts;
  const soPts = sod <= 115 ? 0 : sod <= 230 ? -1 : sod <= 345 ? -2 : -3; s += soPts;
  s += fib >= 4.2 ? 3 : fib >= 2.8 ? 2 : fib >= 1.4 ? 1 : 0;
  s += vm; s += wg ? 1 : 0;
  if (tPts === 0 && aPts === 0 && sfPts === 0 && sgPts === 0 && soPts === 0 && asug === 0 && sod === 0) s += 3;
  const stars = dq ? 0 : (s <= 0 ? 0 : s <= 2 ? 1 : s <= 4 ? 2 : 3);
  return { dq, dqr, score: s, stars };
}
function scoreM(satf, chol, asug, sod, fib, adds, trans, vm) {
  const p = asug * 4; const dqr = [];
  if (sod > 575) dqr.push('Sodium >575mg'); if (chol > 300) dqr.push('Cholesterol >300mg');
  if (adds.length >= 2) dqr.push('≥2 additives');
  const dq = dqr.length > 0; let s = 0;
  s += trans ? -1 : 0; s += adds.length >= 1 ? -1 : 0;
  s += satf <= 1.5 ? 0 : satf <= 2 ? -1 : satf <= 2.5 ? -2 : -3;
  s += p === 0 ? 0 : p <= 6 ? -1 : p <= 25 ? -2 : -3;
  s += sod <= 115 ? 0 : sod <= 230 ? -1 : sod <= 345 ? -2 : -3;
  s += fib >= 1.4 ? 1 : 0; s += vm;
  const stars = dq ? 0 : (s <= 0 ? 0 : s === 1 ? 1 : s === 2 ? 2 : 3);
  return { dq, dqr, score: s, stars };
}
function scoreF(satf, chol, asug, sod, adds, trans) {
  const p = asug * 4; const dqr = [];
  if (sod > 575) dqr.push('Sodium >575mg'); if (chol > 300) dqr.push('Cholesterol >300mg');
  if (p > 40) dqr.push('Sugar >40% kcal'); if (adds.length >= 2) dqr.push('≥2 additives');
  const dq = dqr.length > 0; let s = 0;
  s += trans ? -1 : 0; s += adds.length >= 1 ? -1 : 0;
  s += satf <= 2.2 ? 0 : satf <= 2.7 ? -1 : satf <= 3.2 ? -2 : -3;
  s += p === 0 ? 0 : p <= 6 ? -1 : p <= 25 ? -2 : -3;
  s += sod <= 115 ? 0 : sod <= 230 ? -1 : sod <= 345 ? -2 : -3;
  const stars = dq ? 0 : (s <= 0 ? 0 : s === 1 ? 1 : s === 2 ? 2 : 3);
  return { dq, dqr, score: s, stars };
}

/* ═══════════ Brand-owner mapping ═══════════ */
const OWNER_MAP = (() => {
  const M = {}; const add = (owner, brands) => brands.forEach(b => M[b] = owner);
  add('Kroger (Private Label)', ['KROGER', 'SIMPLE TRUTH', 'PRIVATE SELECTION', 'SMARTWAY', 'HOME CHEF', 'BAKERY FRESH', 'BAKERY FRESH GOODNESS', 'HERITAGE FARM', 'COMFORTS', 'ABOUND', "MURRAY'S", 'BIG K', 'CHECK THIS OUT', 'PSST']);
  add('Kraft Heinz', ['KRAFT', 'HEINZ', 'OSCAR MAYER', 'JELL-O', 'KOOL-AID', 'CRYSTAL LIGHT', 'VELVEETA', 'PHILADELPHIA', 'CAPRI SUN', 'ORE-IDA', 'MAXWELL HOUSE', 'LUNCHABLES', 'CLASSICO', 'GREY POUPON', 'STOVE TOP', 'A.1.', 'MIRACLE WHIP', 'CHEEZ WHIZ', 'PRIMAL KITCHEN', 'CLAUSSEN', 'MIO', 'BAGEL BITES', 'SMART ONES', 'DEVOUR']);
  add('PepsiCo', ['PEPSI', 'GATORADE', 'QUAKER', "LAY'S", 'CHEETOS', 'MOUNTAIN DEW', 'MTN DEW', 'DORITOS', 'TOSTITOS', 'FRITOS', 'RUFFLES', 'ROLD GOLD', 'SMARTFOOD', "STACY'S", 'SUNCHIPS', "MISS VICKIE'S", 'SIETE', 'SABRA', 'BUBLY', 'ROCKSTAR', 'NAKED', 'POPCORNERS', 'PEARL MILLING COMPANY', 'AUNT JEMIMA', "CAP'N CRUNCH", 'LIFE CEREAL', 'PURE LEAF', 'MUG', 'BARE', 'OFF THE EATEN PATH', 'HEALTH WARRIOR']);
  add('Nestlé', ['NESTLÉ', 'NESTLE', 'GERBER', "STOUFFER'S", 'LEAN CUISINE', 'DIGIORNO', 'COFFEE-MATE', 'NESQUIK', 'TOLL HOUSE', 'CARNATION', 'BOOST', 'HOT POCKETS', 'SWEET EARTH', 'PURE PROTEIN', "NATURE'S BOUNTY", 'PERRIER', 'S.PELLEGRINO', 'SAN PELLEGRINO', 'STARBUCKS', 'NESCAFÉ', 'NESCAFE']);
  add('General Mills', ['GENERAL MILLS', 'GENERAL MILLS (PILLSBURY)', 'BETTY CROCKER', "ANNIE'S", 'NATURE VALLEY', 'LARABAR', 'MUIR GLEN ORGANIC', 'MUIR GLEN', 'CASCADIAN FARM', 'OLD EL PASO', 'PROGRESSO', 'YOPLAIT', 'CHEERIOS', 'EPIC', 'GOLD MEDAL', 'FIBER ONE', "TOTINO'S", 'CHEX', 'LUCKY CHARMS', 'CINNAMON TOAST CRUNCH', 'TRIX', 'COCOA PUFFS', 'BUGLES', "GARDETTO'S", 'FRUIT BY THE FOOT', 'FRUIT ROLL-UPS', 'GUSHERS', 'PILLSBURY', 'WHEATIES', 'KIX', 'GOLDEN GRAHAMS', "REESE'S PUFFS", 'OUI', 'LIBERTÉ', ':RATIO', 'GOOD MEASURE']);
  add('Kellanova', ['KELLANOVA', 'CHEEZ-IT', 'POP-TARTS', 'EGGO', 'MORNINGSTAR FARMS', 'PRINGLES', 'RX BAR', 'RXBAR', 'NUTRI-GRAIN', 'RICE KRISPIES TREATS', 'TOWN HOUSE', 'CLUB CRACKERS', 'CLUB', "CARR'S", 'ZESTA', 'TOASTEDS', 'GARDENBURGER']);
  add('WK Kellogg Co', ['WK KELLOGG CO.', 'WK KELLOGG CO', "KELLOGG'S", 'KASHI', 'SPECIAL K', 'FROSTED FLAKES', 'FROOT LOOPS', 'RICE KRISPIES', 'RAISIN BRAN', 'CORN FLAKES', 'APPLE JACKS', 'BEAR NAKED', 'MINI-WHEATS', 'FROSTED MINI-WHEATS']);
  add('Mondelēz International', ['OREO', 'RITZ', 'CHIPS AHOY!', 'CHIPS AHOY', 'BELVITA', 'TRISCUIT', 'WHEAT THINS', 'HONEY MAID', 'NILLA', 'NUTTER BUTTER', "TATE'S BAKE SHOP", 'CLIF', 'LUNA', 'CLIF KID', 'SOUR PATCH KIDS', 'SWEDISH FISH', 'TOBLERONE', 'TRIDENT', 'HALLS', 'ENJOY LIFE FOODS', 'PERFECT SNACKS', 'PERFECT BAR', 'GOOD THINS']);
  add('The Hershey Company', ["HERSHEY'S", "REESE'S", "LILY'S", 'SKINNYPOP', "PIRATE'S BOOTY", "DOT'S HOMESTYLE PRETZELS", "DOT'S", 'KIT KAT', 'ICE BREAKERS', 'PAYDAY', 'ALMOND JOY', 'TWIZZLERS', 'JOLLY RANCHER', 'HEATH', 'MOUNDS', 'ROLO', 'WHOPPERS', 'YORK', 'BROOKSIDE', 'BARKTHINS', 'ONE BRANDS', 'FULFIL']);
  add('Mars', ["M&M'S", 'SKITTLES', 'KIND', 'SNICKERS', 'TWIX', 'DOVE', 'STARBURST', 'LIFE SAVERS', 'ORBIT', 'EXTRA', "BEN'S ORIGINAL", "NATURE'S BAKERY", "KEVIN'S NATURAL FOODS", 'TRÜFRÜ', 'TRU FRU', 'COMBOS', '3 MUSKETEERS', 'MILKY WAY', 'SEEDS OF CHANGE', 'TASTY BITE']);
  add('Conagra Brands', ['CONAGRA', 'BIRDS EYE - CONAGRA', 'BIRDS EYE', 'BANQUET', 'HEALTHY CHOICE', "MARIE CALLENDER'S", 'DUNCAN HINES', 'CHEF BOYARDEE', 'SWISS MISS', "HUNT'S", 'SLIM JIM', "ORVILLE REDENBACHER'S", 'REDDI-WIP', 'VLASIC', 'GARDEIN', 'FRONTERA', 'PAM', "ANGIE'S BOOMCHICKAPOP", 'ACT II', 'EARTH BALANCE', "UDI'S", 'GLUTINO', 'EVOL', 'ALEXIA', "P.F. CHANG'S", "BLAKE'S", 'WISH-BONE', 'RO*TEL', 'RO-TEL', 'SNACK PACK', 'HEBREW NATIONAL', 'ARMOUR']);
  add("The Campbell's Company", ["CAMPBELL'S", 'PEPPERIDGE FARM', 'PREGO', 'PACE', 'V8', 'SWANSON', 'GOLDFISH', "SNYDER'S OF HANOVER", 'LANCE', 'KETTLE BRAND', 'CAPE COD', 'LATE JULY', 'SNACK FACTORY', 'PACIFIC FOODS', "RAO'S", "RAO'S HOMEMADE", "MICHAEL ANGELO'S", 'NOOSA', 'CHUNKY', 'WELL YES!']);
  add('The J.M. Smucker Co.', ["SMUCKER'S", "SMUCKER'S (PILLSBURY)", 'FOLGERS', 'JIF', "DUNKIN'", 'HOSTESS', 'CAFÉ BUSTELO', 'CAFE BUSTELO', 'UNCRUSTABLES', 'SANTA CRUZ ORGANIC', "KNOTT'S BERRY FARM", 'ADAMS', 'VOORTMAN']);
  add('Hormel Foods', ['HORMEL', 'PLANTERS', 'SKIPPY', 'SPAM', 'JENNIE-O', 'APPLEGATE', "JUSTIN'S", 'WHOLLY', 'WHOLLY GUACAMOLE', 'HERDEZ', 'COLUMBUS', 'DINTY MOORE', 'LA VICTORIA', 'CORN NUTS', 'CHI-CHI\'S', 'MARY KITCHEN']);
  add('Tyson Foods', ['TYSON', 'JIMMY DEAN', 'HILLSHIRE FARM', 'BALL PARK', 'AIDELLS', 'STATE FAIR', 'WRIGHT', 'HILLSHIRE SNACKING']);
  add('Unilever', ['KNORR', "HELLMANN'S", 'BEST FOODS', "SIR KENSINGTON'S", 'MAILLE']);
  add('The Coca-Cola Company', ['COCA-COLA', 'MINUTE MAID', 'BODYARMOR', 'SIMPLY', 'SPRITE', 'FANTA', 'POWERADE', 'SMARTWATER', 'TOPO CHICO', 'FAIRLIFE', 'GOLD PEAK', 'COSTA', 'DASANI', 'VITAMINWATER', 'CORE POWER']);
  add('Keurig Dr Pepper', ['DR PEPPER', 'SNAPPLE', "MOTT'S", 'CANADA DRY', '7UP', 'A&W', 'SUNKIST', 'CORE', 'BAI', 'CLAMATO', 'HAWAIIAN PUNCH', 'GREEN MOUNTAIN', 'GHOST', 'CRUSH', 'SQUIRT', 'YOO-HOO']);
  add('Danone', ['SILK', 'SO DELICIOUS', 'DANNON', 'OIKOS', 'ACTIVIA', 'EVIAN', 'INTERNATIONAL DELIGHT', 'STOK', 'HAPPY BABY', 'HAPPY TOT', 'HAPPY FAMILY', 'TWO GOOD', 'LIGHT + FIT', 'LIGHT & FIT']);
  add('Post Holdings', ['POST', 'MALT-O-MEAL', 'BOB EVANS', 'PETER PAN', 'HONEY BUNCHES OF OATS', 'GRAPE-NUTS', 'PEBBLES']);
  add('Flowers Foods', ["NATURE'S OWN", "DAVE'S KILLER BREAD", 'CANYON BAKEHOUSE', 'WONDER', 'TASTYKAKE', 'SIMPLE MILLS']);
  add('Grupo Bimbo', ['SARA LEE', "THOMAS'", 'BROWNBERRY', 'OROWEAT', "ENTENMANN'S", 'ARNOLD', 'BIMBO', 'MARINELA', 'TAKIS', 'BOBOLI']);
  add('Ferrero', ['KINDER', 'NUTELLA', 'FERRERO ROCHER', 'KEEBLER', 'FAMOUS AMOS', "MOTHER'S", 'TIC TAC', 'BUTTERFINGER', 'BABY RUTH', 'CRUNCH BAR', 'HALO TOP', 'BLUE BUNNY', 'FUDGE STRIPES']);
  add('Ferrara Candy Co.', ['NERDS', 'SWEETARTS', 'LAFFY TAFFY', 'TROLLI', "BRACH'S", 'JELLY BELLY', 'NOW AND LATER', 'RED HOTS', 'LEMONHEAD']);
  add('McKee Foods', ['LITTLE DEBBIE', 'SUNBELT BAKERY', "DRAKE'S"]);
  add('Utz Brands', ['UTZ', 'BOULDER CANYON', 'ON THE BORDER', "ZAPP'S", 'GOLDEN FLAKE']);
  add('Abbott', ['ENSURE', 'PEDIALYTE', 'SIMILAC', 'GLUCERNA', 'ZONEPERFECT']);
  add("Walmart (Sam's Club)", ["MEMBER'S MARK"]);
  add('Costco', ['KIRKLAND SIGNATURE']);
  return M;
})();
function _normBrand(b) { return String(b || '').toUpperCase().replace(/\s+/g, ' ').trim(); }
function brandOwner(b) {
  const n = _normBrand(b);
  if (OWNER_MAP[n]) return OWNER_MAP[n];
  if (n.startsWith('KROGER')) return 'Kroger (Private Label)';
  if (n.includes('SIMPLE TRUTH')) return 'Kroger (Private Label)';
  if (n.includes('PRIVATE SELECTION')) return 'Kroger (Private Label)';
  if (n.includes('CONAGRA')) return 'Conagra Brands';
  if (n.includes('GENERAL MILLS')) return 'General Mills';
  if (n.includes('SMUCKER')) return 'The J.M. Smucker Co.';
  if (n.includes('KELLOGG')) return 'WK Kellogg Co';
  if (n.includes('NESTL')) return 'Nestlé';
  if (n.includes('PEPPERIDGE')) return "The Campbell's Company";
  return b || '(No brand)';
}
let _owners = null;
function ownersList() {
  if (_owners) return _owners;
  const cnt = {};
  for (const r of ROWS) { const o = brandOwner(rBrand(r)); cnt[o] = (cnt[o] || 0) + 1; }
  _owners = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b)).map(o => ({ name: o, n: cnt[o] }));
  return _owners;
}
let _brandCounts = null;
function brandsList() {
  if (_brandCounts) return _brandCounts;
  const cnt = {};
  for (const r of ROWS) { const b = rBrand(r); cnt[b] = (cnt[b] || 0) + 1; }
  _brandCounts = Object.keys(cnt).filter(b => b).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b)).map(b => ({ name: b, n: cnt[b] }));
  return _brandCounts;
}

/* ═══════════ Star-move engine — gap to next star + cheapest plan ═══════════ */
function movePlanFor(r) {
  const algo = rAlgo(r), st = rStars(r), dq = rDq(r);
  const kcal = rKcal(r) || 100; const sv = v => v * kcal / 100;
  const th = (algo === 'M' || algo === 'F') ? [1, 2, 3] : [1, 3, 5];
  if (st >= 3) return { gap: 0, plan: [], dqFixes: [], max: true, reach: true, effort: 0, unlock: false, dq: false };
  let sc = rScore(r);
  const dqFixes = [];
  if (dq) {
    if (rDpSod(r) <= -12) sc += 9;
    if (rDpSug(r) <= -12) sc += 9;
    for (const d of rDqrs(r)) {
      const dl = d.toLowerCase();
      if (dl.includes('addit')) dqFixes.push({ t: 'dqadd', effort: 1, lbl: 'Remove ' + Math.max(1, rAddc(r) - 1) + ' of ' + rAddc(r) + ' flagged additives (2+ disqualifies)' });
      else if (dl.includes('sodium')) { const cap = algo === 'I' ? 360 : 575; dqFixes.push({ t: 'dqsod', effort: 2, lbl: 'Cut sodium below ' + Math.round(sv(cap)) + ' mg/serving (exit disqualification)' }); }
      else if (dl.includes('sugar')) dqFixes.push({ t: 'dqsug', effort: 2, lbl: algo === 'I' ? 'Remove added-sugar ingredients (any disqualifies infant foods)' : 'Cut added sugar below ' + (40 / 4 * kcal / 100).toFixed(1) + ' g/serving (exit disqualification)' });
      else if (dl.includes('chol')) dqFixes.push({ t: 'dqchol', effort: 2, lbl: 'Reduce cholesterol below 300 mg per 100 kcal' });
    }
  }
  const target = th[st];
  const gap = target - sc;
  const q = [];
  const addc = rAddc(r);
  if (!dq && addc === 1 && rDpAdds(r) < 0) q.push([{ t: 'add', effort: 0, lbl: 'Swap out ' + ((rAdds(r)[0]) || 'the flagged additive') + ' for a natural alternative → clears additive debit' }]);
  if (rDpTrans(r) < 0) q.push([{ t: 'trans', effort: 1, lbl: 'Remove partially hydrogenated oils → clears trans-fat debit' }]);
  const clampN = d => { d = -(d || 0); return d > 3 ? 3 : d; };
  const sodB = algo === 'I' ? [120, 240, 360] : [115, 230, 345];
  const sn = clampN(rDpSod(r)); const sq = [];
  for (let j = sn; j >= 1; j--) sq.push({ t: 'sod', effort: 1, lbl: 'Cut sodium to ≤' + Math.round(sv(sodB[j - 1])) + ' mg/serving (now ' + Math.round(rSodSv(r)) + ' mg) — KCl salt blend' });
  if (sq.length) q.push(sq);
  if (algo !== 'I') {
    const pB = [0, 6, 25]; const gn = clampN(rDpSug(r)); const gq = [];
    for (let j = gn; j >= 1; j--) { const tp = pB[j - 1]; gq.push({ t: 'sug', effort: tp === 0 ? 2 : 1, lbl: tp === 0 ? ('Remove all added sugar (now ' + rAsugSv(r).toFixed(1) + ' g/serving) — stevia/monk fruit not flagged') : ('Cut added sugar to ≤' + (tp / 4 * kcal / 100).toFixed(1) + ' g/serving (' + tp + '% kcal; now ' + rAsugSv(r).toFixed(1) + ' g)') }); }
    if (gq.length) q.push(gq);
    const sB = algo === 'M' ? [1.5, 2, 2.5] : algo === 'F' ? [2.2, 2.7, 3.2] : [1, 2, 3];
    const fn = clampN(rDpSatf(r)); const fq = [];
    for (let j = fn; j >= 1; j--) fq.push({ t: 'sat', effort: 1, lbl: 'Cut saturated fat to ≤' + (sB[j - 1] * kcal / 100).toFixed(1) + ' g/serving (now ' + rSatfSv(r).toFixed(1) + ' g) — high-oleic oils' });
    if (fq.length) q.push(fq);
  }
  if (algo !== 'F') {
    const fibB = algo === 'M' ? [1.4] : algo === 'I' ? [1.9, 3.8, 5.7] : [1.4, 2.8, 4.2];
    const cf = Math.min(rCpFib(r), fibB.length); const fbq = [];
    for (let j = cf; j < fibB.length; j++) fbq.push({ t: 'fib', effort: 0, lbl: 'Raise fiber to ≥' + (fibB[j] * kcal / 100).toFixed(1) + ' g/serving (now ' + rFibSv(r).toFixed(1) + ' g) — oat/legume flour, inulin' });
    if (fbq.length) q.push(fbq);
    const vm = rCpVm(r); const vq = [];
    for (let j = vm; j < 3; j++) vq.push({ t: 'vit', effort: 0, lbl: 'Fortify one more vitamin/mineral to ≥5% DV per 100 kcal (now ' + j + ' credited)' });
    if (vq.length) q.push(vq);
    if ((algo === 'G' || algo === 'V') && !rWg(r) && rCpWg(r) === 0) q.push([{ t: 'wg', effort: 0, lbl: 'Use a named whole-grain ingredient → +1 whole-grain bonus' }]);
  }
  const PRI = { add: 0, fib: 1, vit: 2, wg: 3, sod: 4, sat: 5, sug: 6, trans: 7 };
  const plan = []; let need = gap;
  while (need > 0) {
    let bi = -1, bs = null;
    for (let i = 0; i < q.length; i++) {
      if (!q[i].length) continue; const s = q[i][0];
      if (bs === null || s.effort < bs.effort || (s.effort === bs.effort && PRI[s.t] < PRI[bs.t])) { bs = s; bi = i; }
    }
    if (bi < 0) break;
    plan.push(q[bi].shift()); need--;
  }
  let eff = 0;
  for (const s of dqFixes) eff = Math.max(eff, s.effort);
  for (const s of plan) eff = Math.max(eff, s.effort);
  return { gap, plan, dqFixes, max: false, reach: need <= 0, effort: eff, unlock: dq && gap <= 0, dq };
}
function mvOf(r) { if (!r._mv) r._mv = movePlanFor(r); return r._mv; }

/* ═══════════ Scope model ═══════════ */
const scope = { type: 'portfolio', name: null };
let currentProduct = null;   // selected row (product level)
let currentView = 'overview';

function scopeRows() {
  if (scope.type === 'portfolio') return ROWS;
  if (scope.type === 'owner') return ROWS.filter(r => brandOwner(rBrand(r)) === scope.name);
  if (scope.type === 'brand') return ROWS.filter(r => rBrand(r) === scope.name);
  return ROWS;
}
function scopeLabel() {
  if (scope.type === 'portfolio') return 'the whole portfolio';
  if (scope.type === 'owner') return scope.name + ' (brand owner)';
  return scope.name;
}

/* ── Aggregate analysis for a set of rows (cached by scope key) ── */
const _analysisCache = {};
function scopeKey() { return scope.type + '::' + (scope.name || ''); }
function analyze() {
  const key = scopeKey();
  if (_analysisCache[key]) return _analysisCache[key];
  const rows = scopeRows();
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const nm = { 0: 0, 1: 0, 2: 0 }, w2 = { 0: 0, 1: 0, 2: 0 };
  let nmTotal = 0, dqU = 0;
  const blockers = { 'High Sodium': 0, 'High Added Sugar': 0, 'High Sat. Fat': 0, 'Trans Fat': 0, 'Contains Additives': 0 };
  const levers = {};
  const nmProducts = [], dqProducts = [];
  const algoDist = { G: { 0: 0, 1: 0, 2: 0, 3: 0 }, M: { 0: 0, 1: 0, 2: 0, 3: 0 }, F: { 0: 0, 1: 0, 2: 0, 3: 0 }, I: { 0: 0, 1: 0, 2: 0, 3: 0 }, V: { 0: 0, 1: 0, 2: 0, 3: 0 } };
  for (const r of rows) {
    const st = rStars(r); dist[st]++;
    if (algoDist[rAlgo(r)]) algoDist[rAlgo(r)][st]++;
    // blockers (0★, single -1 debit that alone earns a star)
    if (!rDq(r) && rScore(r) === 0) {
      if (rDpSod(r) === -1) blockers['High Sodium']++;
      if (rDpSug(r) === -1) blockers['High Added Sugar']++;
      if (rDpSatf(r) === -1) blockers['High Sat. Fat']++;
      if (rDpTrans(r) === -1) blockers['Trans Fat']++;
      if (rDpAdds(r) === -1) blockers['Contains Additives']++;
    }
    if (st >= 3) continue;
    const m = mvOf(r);
    if (m.dq) {
      if (m.unlock) { dqU++; dqProducts.push(r); }
      continue;
    }
    if (!m.reach) continue;
    if (m.gap === 1) {
      nm[st]++; nmTotal++; nmProducts.push(r);
      const lead = m.plan[0]; if (lead) levers[lead.t] = (levers[lead.t] || 0) + 1;
    } else if (m.gap === 2) { w2[st]++; }
  }
  const res = { rows, dist, nm, w2, nmTotal, dqU, blockers, levers, nmProducts, dqProducts, algoDist, total: rows.length };
  _analysisCache[key] = res;
  return res;
}

/* ═══════════ Small render helpers ═══════════ */
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = n => (n || 0).toLocaleString();
const pct = (n, t) => t ? ((n / t) * 100).toFixed(1) + '%' : '0%';
function starsHTML(n) { let h = ''; for (let i = 0; i < 3; i++) h += '<span style="color:' + (i < n ? 'var(--ter-amber)' : '#C5CFD7') + '">★</span>'; return '<span class="rf-stars-big">' + h + '</span>'; }
const LEVER_LABEL = { add: 'Swap a flagged additive', trans: 'Remove trans fat', sod: 'Cut sodium', sug: 'Cut added sugar', sat: 'Cut saturated fat', fib: 'Add fiber', vit: 'Fortify a vitamin/mineral', wg: 'Add whole grain', dqadd: 'Resolve additive DQ', dqsod: 'Resolve sodium DQ', dqsug: 'Resolve sugar DQ', dqchol: 'Resolve cholesterol DQ' };

/* ── SVG star-distribution donut ──
   Ported verbatim from the Brand Intelligence dashboard donut
   (js/dashboard-home.js → roundedSector / donutRing): rounded annular-sector
   arcs on a 300-unit viewBox scaled into the shared .dash-donut 252px footprint,
   with the raised centre disc + legend styling from dashboard.css. */
function _polarPt(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2);
}
function _roundedSector(cx, cy, ri, ro, a0, a1, cr) {
  const spanRad = ((a1 - a0) * Math.PI) / 180;
  const r = Math.max(0, Math.min(cr, (ro - ri) / 2, (ri * spanRad) / 2));
  const offO = (r / ro) * (180 / Math.PI);
  const offI = (r / ri) * (180 / Math.PI);
  const big = a1 - offO - (a0 + offO) > 180 ? 1 : 0;
  const P = (rad, deg) => _polarPt(cx, cy, rad, deg);
  return [
    'M ' + P(ro, a0 + offO), 'A ' + ro + ' ' + ro + ' 0 ' + big + ' 1 ' + P(ro, a1 - offO),
    'A ' + r + ' ' + r + ' 0 0 1 ' + P(ro - r, a1), 'L ' + P(ri + r, a1),
    'A ' + r + ' ' + r + ' 0 0 1 ' + P(ri, a1 - offI), 'A ' + ri + ' ' + ri + ' 0 ' + big + ' 0 ' + P(ri, a0 + offI),
    'A ' + r + ' ' + r + ' 0 0 1 ' + P(ri + r, a0), 'L ' + P(ro - r, a0), 'A ' + r + ' ' + r + ' 0 0 1 ' + P(ro, a0 + offO), 'Z',
  ].join(' ');
}
function _ringArcs(dist, total, cx, cy, r, sw, gapPx) {
  const parts = [0, 1, 2, 3].map(k => ({ v: dist[k] || 0, color: STAR_COLORS[k], k }));
  const circ = 2 * Math.PI * r, tot = total || 1, ro = r + sw / 2, ri = r - sw / 2;
  const gapDeg = (gapPx / circ) * 360, minDeg = (4 / circ) * 360, cr = 7;
  let acc = 0;
  return parts.filter(p => p.v > 0).map(p => {
    const startDeg = (acc / tot) * 360, endDeg = ((acc + p.v) / tot) * 360; acc += p.v;
    let a0 = startDeg + gapDeg / 2, a1 = endDeg - gapDeg / 2;
    if (a1 - a0 < minDeg) { const mid = (startDeg + endDeg) / 2; a0 = mid - minDeg / 2; a1 = mid + minDeg / 2; }
    const d = _roundedSector(cx, cy, ri, ro, a0, a1, cr);
    const lab = p.k === 0 ? '0 Stars' : p.k + ' Star' + (p.k > 1 ? 's' : '');
    return '<path class="dash-donut-arc" d="' + d + '" style="fill:' + p.color + '"><title>' + lab + ' — ' + fmt(p.v) + ' (' + pct(p.v, tot) + ')</title></path>';
  }).join('');
}
function starDonut(dist, total, centerNum, centerTxt) {
  return '<div class="dash-donut rf-donut">' +
    '<svg class="dash-donut-svg" viewBox="0 0 300 300" role="img" aria-label="Star distribution">' +
    '<g transform="rotate(-90 150 150)">' + _ringArcs(dist, total, 150, 150, 124, 26, 11) + '</g></svg>' +
    '<div class="dash-donut-center"><span class="dash-donut-num">' + centerNum + '</span>' +
    '<span class="dash-donut-label">' + centerTxt + '</span></div></div>';
}
function starLegend(dist, total) {
  const items = [0, 1, 2, 3].map(k =>
    '<div class="rf-dlegend-item"><span class="dash-dot" style="background:' + STAR_COLORS[k] + '"></span>' +
    '<span class="rf-dlegend-lab">' + (k === 0 ? '0 Stars' : k + ' Star' + (k > 1 ? 's' : '')) + '</span>' +
    '<span class="rf-dlegend-val">' + fmt(dist[k] || 0) + '</span>' +
    '<span class="rf-dlegend-pct">' + pct(dist[k] || 0, total) + '</span></div>'
  ).join('');
  return '<div class="rf-dlegend">' + items + '</div>';
}
function donutHTML(dist, total, centerNum, centerTxt) {
  return '<div class="dash-donut-row">' + starDonut(dist, total, centerNum, centerTxt) + starLegend(dist, total) + '</div>';
}
/* Small legend chip row shared above the per-category star-mix bars. */
function segLegend() {
  return '<div class="dash-seg-tags">' + [0, 1, 2, 3].map(k =>
    '<span class="dash-seg-tag"><span class="dash-dot" style="background:' + STAR_COLORS[k] + '"></span>' + (k === 0 ? '0★' : k + '★') + '</span>'
  ).join('') + '</div>';
}
/* Stacked star-mix bar — the shared dashboard .dash-seg pill (14px, rounded,
   2px gaps), segments grown proportionally to each star count. */
function stackHTML(dist) {
  return '<div class="dash-seg">' + [0, 1, 2, 3].map(k => {
    const v = dist[k] || 0; if (!v) return '';
    const lab = k === 0 ? '0 Stars' : k + ' Star' + (k > 1 ? 's' : '');
    return '<span class="dash-seg-piece" style="flex:' + v + ' 1 0;background:' + STAR_COLORS[k] + '" title="' + lab + ' — ' + fmt(v) + '"></span>';
  }).join('') + '</div>';
}
function rankedBars(items, max, color) {
  const mx = max || Math.max(1, ...items.map(i => i.v));
  return '<div class="rf-bars">' + items.map(i =>
    '<div class="rf-bar-row' + (i.onclick ? ' rf-clickable' : '') + '"' + (i.onclick ? ' onclick="' + i.onclick + '"' : '') + '>' +
    '<span class="rf-bar-lab" title="' + esc(i.label) + '">' + esc(i.label) + '</span>' +
    '<span class="rf-bar-track"><span class="rf-bar-fill" style="width:' + (i.v / mx * 100).toFixed(1) + '%;background:' + (i.color || color || 'var(--primary)') + '"></span></span>' +
    '<span class="rf-bar-val">' + fmt(i.v) + '</span></div>'
  ).join('') + '</div>';
}

/* ═══════════ Chat plumbing ═══════════ */
const OWL = document.querySelector('.sc-bug svg').outerHTML;
function nowLabel() { try { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (_) { return ''; } }
function metaRow(src) {
  const s = src !== false ? '<span class="sc-trust-chip"><span class="material-icons">verified_user</span>Grounded in Guiding Stars data</span>' : '';
  return '<div class="sc-line-meta">' + s + '<span class="sc-line-time">' + nowLabel() + '</span></div>';
}
function addUser(text) {
  const box = document.getElementById('chat-messages');
  box.insertAdjacentHTML('beforeend', '<div class="mb-3 sc-line sc-line-you"><span class="sc-avatar sc-avatar-you" role="img" aria-label="You">AK</span><div class="sc-line-body">' + esc(text) + metaRow(false) + '</div></div>');
  box.scrollTop = box.scrollHeight;
}
function addWISEai(html, src) {
  const box = document.getElementById('chat-messages');
  box.insertAdjacentHTML('beforeend', '<div class="mb-3 sc-line sc-line-wiseai"><span class="sc-avatar sc-avatar-wiseai" role="img" aria-label="WISEai">' + OWL + '</span><div class="sc-line-body">' + html + metaRow(src) + '</div></div>');
  box.scrollTop = box.scrollHeight;
}
function showTyping(label) {
  const box = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = 'mb-3 sc-line sc-line-wiseai sc-line-typing';
  el.innerHTML = '<span class="sc-avatar sc-avatar-wiseai">' + OWL + '</span><div class="sc-line-body"><span class="sc-typing-status"><span class="sc-typing"><span></span><span></span><span></span></span><span class="sc-typing-label">' + (label || 'WISEai is analyzing') + '…</span></span></div>';
  box.appendChild(el); box.scrollTop = box.scrollHeight;
  return el;
}
function offerChips(chips) {
  const box = document.getElementById('chat-messages');
  if (!chips || !chips.length) return;
  const row = document.createElement('div');
  row.className = 'sc-reply-chips';
  row.innerHTML = chips.map(c => '<button type="button" class="chip" onclick="' + c.onclick + '">' + (c.icon ? '<span class="material-icons">' + c.icon + '</span>' : '') + esc(c.label) + '</button>').join('');
  box.appendChild(row); box.scrollTop = box.scrollHeight;
  _lastChips = chips;
}
let _lastChips = [];
function hideWelcome() {
  const ws = document.getElementById('welcome-screen');
  if (ws && !ws.classList.contains('sc-hidden')) { ws.classList.add('sc-hidden'); setTimeout(() => ws.style.display = 'none', 300); }
}

/* ═══════════ Scope breadcrumb ═══════════ */
function renderScopeBar() {
  const el = document.getElementById('rf-scope-bar');
  const crumbs = ['<span class="rf-scope-crumb rf-scope-title"><span class="material-icons">public</span> Portfolio</span>'];
  if (scope.type === 'owner') crumbs.push('<span class="rf-scope-sep">›</span><span class="rf-scope-crumb"><b>' + esc(scope.name) + '</b></span>');
  if (scope.type === 'brand') crumbs.push('<span class="rf-scope-sep">›</span><span class="rf-scope-crumb"><b>' + esc(scope.name) + '</b></span>');
  if (currentProduct) crumbs.push('<span class="rf-scope-sep">›</span><span class="rf-scope-crumb"><span class="material-icons" style="font-size:14px">inventory_2</span> ' + esc(rName(currentProduct).slice(0, 34)) + '</span>');
  const reset = (scope.type !== 'portfolio' || currentProduct) ? '<button class="rf-scope-reset" onclick="rfResetScope()">Reset scope</button>' : '';
  el.innerHTML = crumbs.join('') + reset;
}
function setScope(type, name) { scope.type = type; scope.name = name || null; currentProduct = null; renderScopeBar(); }
window.rfResetScope = function () { setScope('portfolio', null); runIntent(currentView === 'product' ? 'overview' : currentView, null, true); };

/* ═══════════ Chart / scorecard animation engine ═══════════
   Every chart, graph and scorecard animates in on render, and clicking any of
   them replays the whole thing — numbers count back up from zero, bars regrow,
   donuts + star-mix segments pop back in. Pure DOM/CSS so it works on the exact
   markup the view functions above emit (no chart library hooks needed). */
const _easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/* Numeric readouts across every view. Each holds a fully-formatted value
   (e.g. "42,060", "12.3%", "+128", "3★") that we parse and count up to. */
const RF_NUM_SEL = [
  '.rf-kpi .v', '.rf-kpi .s',
  '.dash-donut-num',
  '.rf-dlegend-val', '.rf-dlegend-pct',
  '.rf-bar-val',
  '.rf-delta-big',
  '.rf-mover .num',
  '.rf-tile .tc',
].join(', ');

/* Count a single readout up from 0 → its printed value, preserving the original
   prefix (+, ▲, currency), thousands separators, decimal places and suffix (%, ★). */
function rfCountUp(el) {
  const target = el.dataset.countText != null ? el.dataset.countText : el.textContent;
  el.dataset.countText = target;
  const m = target.match(/^(\D*?)(-?[\d,]*\.?\d+)(.*)$/s);
  if (!m) return;
  const prefix = m[1], numStr = m[2], suffix = m[3];
  const clean = numStr.replace(/,/g, '');
  const to = parseFloat(clean);
  if (!isFinite(to)) return;
  const hasComma = numStr.includes(',');
  const decimals = clean.includes('.') ? clean.split('.')[1].length : 0;
  const fmt = v => {
    let s = v.toFixed(decimals);
    if (hasComma) { const p = s.split('.'); p[0] = Number(p[0]).toLocaleString('en-US'); s = p.join('.'); }
    return prefix + s + suffix;
  };
  if (el._rfRaf) cancelAnimationFrame(el._rfRaf);
  const dur = 720, t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = fmt(to * _easeOutCubic(p));
    if (p < 1) el._rfRaf = requestAnimationFrame(step);
    else { el.textContent = target; el._rfRaf = null; }
  };
  el._rfRaf = requestAnimationFrame(step);
}

/* Regrow a ranked bar from 0 → its inline target width (CSS transition on
   .rf-bar-fill does the tween; we just reset then restore in the next frame). */
function rfGrowBar(fill) {
  const target = fill.style.width || '0%';
  fill.style.width = '0%';
  void fill.offsetWidth;
  requestAnimationFrame(() => { fill.style.width = target; });
}

/* Restart a CSS keyframe animation on an element (donut pop / segment grow /
   card entrance) — remove the class, force a reflow, re-add it. */
function rfRetrigger(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/* Replay every animatable piece inside a subtree (a whole view, or one card). */
function rfAnimate(root) {
  if (!root) return;
  root.querySelectorAll(RF_NUM_SEL).forEach(rfCountUp);
  root.querySelectorAll('.rf-bar-fill').forEach(rfGrowBar);
  root.querySelectorAll('.dash-donut, .rf-donut-mini').forEach(el => rfRetrigger(el, 'rf-anim-pop'));
  root.querySelectorAll('.dash-seg').forEach(el => rfRetrigger(el, 'rf-anim-grow'));
}

/* Animate just-appended block: stagger its cards/scorecards in, then run the
   piece-level animations (count-ups, bars, donuts, segments) inside it. */
function rfAnimateBlock(block) {
  if (!block) return;
  block.querySelectorAll('.rf-card, .rf-kpi, .rf-mover, .rf-tile').forEach((u, i) => {
    u.style.animationDelay = (i * 45) + 'ms';
    rfRetrigger(u, 'rf-anim-card');
  });
  rfAnimate(block);
}

/* Replay a single clicked unit (scorecard or card) with no entrance delay. */
function rfReplayUnit(unit) {
  unit.style.animationDelay = '0ms';
  rfRetrigger(unit, 'rf-anim-card');
  rfAnimate(unit);
}

/* Click anywhere on a chart / graph / scorecard → replay it. Bound once on the
   panel; interactive controls (buttons, sliders, steppers) are left alone so
   they keep doing their job while everything else re-animates. */
document.getElementById('rf-view').addEventListener('click', e => {
  if (e.target.closest('button, input, a, label, .rf-adj, .rf-basis-seg, .rf-scope-reset')) return;
  const unit = e.target.closest('.rf-kpi, .rf-mover, .rf-tile, .rf-card');
  if (unit) rfReplayUnit(unit);
});

/* ═══════════ RIGHT PANEL — transcript feed ═══════════
   Each intent APPENDS a new block to the ⭐ panel rather than replacing what was
   there, so the panel reads like the chat transcript: the newest analysis slides
   in and everything before it stays above — scrollable and still interactive
   (hover tips, drill-in chips, click-to-replay). */
let _blockSeq = 0;
function rfNewBlockId() { return 'rf-block-' + (++_blockSeq); }
function setView(name, html, sub, bid) {
  currentView = name;
  const view = document.getElementById('rf-view');
  bid = bid || rfNewBlockId();
  const block = document.createElement('section');
  block.className = 'rf-block';
  block.id = bid;
  block.dataset.view = name;
  block.innerHTML =
    '<div class="rf-block-head"><span class="rf-block-eyebrow">' + esc(sub || 'Live visualization') + '</span>' +
    '<span class="rf-block-time">' + nowLabel() + '</span></div>' + html;
  view.appendChild(block);
  const subEl = document.getElementById('rf-panel-sub');
  if (subEl) subEl.textContent = sub || 'Live visualization';
  renderScopeBar();
  rfAnimateBlock(block);
  // Bring the freshly built block to the top of the panel viewport so it's
  // front-and-centre, while older analyses remain just a scroll up away.
  requestAnimationFrame(() => {
    try { block.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (_) { view.scrollTop = view.scrollHeight; }
  });
  return block;
}

function viewOverview() {
  const a = analyze();
  const t = a.total;
  const kpis = '<div class="rf-kpis">' +
    '<div class="rf-kpi"><div class="v">' + fmt(t) + '</div><div class="l">Products</div></div>' +
    '<div class="rf-kpi k-red"><div class="v">' + fmt(a.dist[0]) + '</div><div class="l">0 Stars</div><div class="s">' + pct(a.dist[0], t) + '</div></div>' +
    '<div class="rf-kpi k-green" onclick="runIntent(\'movers\')"><div class="v">' + fmt(a.nmTotal) + '</div><div class="l">🎯 Near-miss</div><div class="s">1 pt from next star</div></div>' +
    '</div>';
  const donut = '<div class="rf-card"><h4>Star distribution</h4><div class="rf-card-sub">' + esc(scopeLabel()) + '</div>' +
    donutHTML(a.dist, t, fmt(a.dist[3]), '3★ products') + '</div>';
  // algorithm mix
  const algoRows = Object.keys(a.algoDist).filter(k => Object.values(a.algoDist[k]).some(v => v)).map(k => {
    const d = a.algoDist[k]; const tot = d[0] + d[1] + d[2] + d[3];
    return '<div class="rf-bar-row"><span class="rf-bar-lab">' + ALGO_KEYS[k] + '</span>' + '<span style="grid-column:2">' + stackHTML(d) + '</span><span class="rf-bar-val">' + fmt(tot) + '</span></div>';
  }).join('');
  const algo = '<div class="rf-card"><h4>Star mix by category</h4><div class="rf-card-sub">share of 0★ → 3★ products per category</div>' + segLegend() + '<div class="rf-bars" style="margin-top:10px">' + algoRows + '</div></div>';
  setView('overview', kpis + donut + algo, 'Portfolio overview · ' + scopeLabel());
}

function viewMovers() {
  const a = analyze();
  const card = (route, n, sub, intent) =>
    '<div class="rf-mover" onclick="runIntent(\'pick_product\',\'' + intent + '\')"><div class="route">' + route + '</div><div class="num">' + fmt(n) + '</div><div class="sub">' + sub + '</div><div class="cta">Reformulate these →</div></div>';
  const movers = '<div class="rf-movers">' +
    card('0★ → ⭐', a.nm[0], '+' + fmt(a.w2[0]) + ' more within 2 pts', 'nm0') +
    card('⭐ → ⭐⭐', a.nm[1], '+' + fmt(a.w2[1]) + ' more within 2 pts', 'nm1') +
    card('⭐⭐ → ⭐⭐⭐', a.nm[2], '+' + fmt(a.w2[2]) + ' more within 2 pts', 'nm2') +
    card('🔓 Fix DQ → ⭐', a.dqU, 'score already clears once DQ resolved', 'dqunlock') +
    '</div>';
  const total = a.nm[0] + a.nm[1] + a.nm[2] + a.dqU;
  const head = '<div class="rf-card"><h4>Star movers</h4><div class="rf-card-sub">Products one small reformulation from the next star — ' + esc(scopeLabel()) + '</div>' + movers +
    '<div style="margin-top:12px;font-size:12px;color:var(--text-muted)"><b style="color:var(--sec-green-text)">' + fmt(total) + ' quick reachable star gains</b> in this scope.</div></div>';
  setView('movers', head, 'Star movers · ' + scopeLabel());
}

function viewBlockers() {
  const a = analyze();
  const items = Object.keys(a.blockers).map(k => ({ label: k, v: a.blockers[k] })).filter(i => i.v > 0).sort((x, y) => y.v - x.v);
  const body = items.length
    ? rankedBars(items, null, 'var(--sec-red)')
    : '<div class="rf-empty">No single-fix 0★ blockers in this scope.</div>';
  const html = '<div class="rf-card"><h4>What\'s blocking 0-star products</h4><div class="rf-card-sub">0★ products where one low-effort fix (−1 debit) alone earns a star — ' + esc(scopeLabel()) + '</div>' + body + '</div>';
  setView('blockers', html, 'Blockers · ' + scopeLabel());
}

function viewBrands(mode) {
  mode = mode || 'brand';
  const list = (mode === 'owner' ? ownersList() : brandsList()).slice(0, 15);
  const rows = list.map(g => {
    const gr = ROWS.filter(r => (mode === 'owner' ? brandOwner(rBrand(r)) : rBrand(r)) === g.name);
    const d = { 0: 0, 1: 0, 2: 0, 3: 0 }; gr.forEach(r => d[rStars(r)]++);
    const intent = mode === 'owner' ? 'scope_owner' : 'scope_brand';
    return '<div class="rf-bar-row rf-clickable" onclick="runIntent(\'' + intent + '\',' + JSON.stringify(g.name).replace(/"/g, '&quot;') + ')">' +
      '<span class="rf-bar-lab" title="' + esc(g.name) + '">' + esc(g.name) + '</span>' +
      '<span style="grid-column:2">' + stackHTML(d) + '</span><span class="rf-bar-val">' + fmt(g.n) + '</span></div>';
  }).join('');
  const seg = '<div class="rf-basis-seg" style="margin-bottom:12px"><button class="' + (mode === 'brand' ? 'active' : '') + '" onclick="viewBrandsMode(\'brand\')">Brands</button><button class="' + (mode === 'owner' ? 'active' : '') + '" onclick="viewBrandsMode(\'owner\')">Brand owners</button></div>';
  const html = '<div class="rf-card"><h4>Star ratings by ' + (mode === 'owner' ? 'brand owner' : 'brand') + '</h4><div class="rf-card-sub">Top 15 by portfolio size — click to scope in</div>' + seg + '<div class="rf-bars">' + rows + '</div></div>';
  setView('brands', html, 'Brands & owners');
}
window.viewBrandsMode = function (m) { viewBrands(m); };

function viewCategories() {
  const a = analyze();
  const cats = Object.keys(a.algoDist).map(k => {
    const d = a.algoDist[k]; const tot = d[0] + d[1] + d[2] + d[3];
    return { k, tot, d };
  }).filter(c => c.tot > 0).sort((x, y) => y.tot - x.tot);
  const maxTot = Math.max(1, ...cats.map(c => c.tot));
  const tiles = cats.map(c => {
    const w = 30 + (c.tot / maxTot) * 62;
    const mix = [0, 1, 2, 3].map(k => c.d[k] / c.tot * 100).map((p, i) => p > 0 ? '<span style="width:' + p + '%;background:' + STAR_COLORS[i] + '"></span>' : '').join('');
    return '<div class="rf-tile" style="flex:1 1 ' + w + '%;background:var(--primary)"><div><div class="tn">' + ALGO_KEYS[c.k] + '</div><div class="tc">' + fmt(c.tot) + '</div></div><div class="tmix">' + mix + '</div></div>';
  }).join('');
  const html = '<div class="rf-card"><h4>Portfolio by category</h4><div class="rf-card-sub">Tile size = product count · bar = 0★→3★ mix — ' + esc(scopeLabel()) + '</div><div class="rf-tiles">' + tiles + '</div></div>';
  setView('categories', html, 'Category mix · ' + scopeLabel());
}

function viewProjection() {
  const a = analyze();
  const before = { ...a.dist };
  const after = { ...a.dist };
  // apply cheapest lever to each near-miss (gap 1) → +1 star; resolve DQ unlocks → to 1★
  [0, 1, 2].forEach(st => { after[st] -= a.nm[st]; after[st + 1] += a.nm[st]; });
  after[0] -= a.dqU; after[1] += a.dqU;
  const gained = a.nm[0] + a.nm[1] + a.nm[2] + a.dqU;
  const t = a.total;
  const beforeStarred = before[1] + before[2] + before[3];
  const afterStarred = after[1] + after[2] + after[3];
  const proj = '<div class="rf-card"><h4>Reformulation impact projection</h4><div class="rf-card-sub">If the cheapest reachable lever is applied to every near-miss product in ' + esc(scopeLabel()) + '</div>' +
    '<div class="rf-proj"><div class="rf-proj-col"><div class="cap">Today</div>' + donutMini(before, t) + '<div style="font-size:12px;margin-top:8px;color:var(--text-muted)"><b>' + fmt(beforeStarred) + '</b> starred<br>(' + pct(beforeStarred, t) + ')</div></div>' +
    '<div class="rf-proj-arrow">→</div>' +
    '<div class="rf-proj-col"><div class="cap">After</div>' + donutMini(after, t) + '<div style="font-size:12px;margin-top:8px;color:var(--sec-green-text)"><b>' + fmt(afterStarred) + '</b> starred<br>(' + pct(afterStarred, t) + ')</div></div></div>' +
    '<div style="text-align:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)"><div class="rf-delta-big">+' + fmt(gained) + '</div><div style="font-size:12px;color:var(--text-muted)">products gain a star from one reachable change</div></div></div>';
  const brk = '<div class="rf-card"><h4>Where the gains come from</h4>' + rankedBars([
    { label: '0★ → ⭐', v: a.nm[0], color: STAR_COLORS[1] },
    { label: '⭐ → ⭐⭐', v: a.nm[1], color: STAR_COLORS[2] },
    { label: '⭐⭐ → ⭐⭐⭐', v: a.nm[2], color: STAR_COLORS[3] },
    { label: '🔓 DQ unlock → ⭐', v: a.dqU, color: 'var(--primary)' },
  ].filter(i => i.v > 0)) + '</div>';
  setView('projection', proj + brk, 'Reformulation projection · ' + scopeLabel());
}
function donutMini(dist, total) {
  return '<div class="rf-donut-mini"><svg viewBox="0 0 120 120" role="img" aria-label="Star distribution">' +
    '<g transform="rotate(-90 60 60)">' + _ringArcs(dist, total, 60, 60, 46, 16, 6) + '</g></svg></div>';
}

function viewLevers() {
  const a = analyze();
  const items = Object.keys(a.levers).map(k => ({ label: LEVER_LABEL[k] || k, v: a.levers[k] })).sort((x, y) => y.v - x.v);
  const body = items.length ? rankedBars(items, null, 'var(--primary)') : '<div class="rf-empty">No single-lever near-miss products in this scope.</div>';
  const html = '<div class="rf-card"><h4>Highest-leverage reformulation levers</h4><div class="rf-card-sub">The cheapest single change per near-miss product, counted across ' + esc(scopeLabel()) + '. Tackle the biggest bars first.</div>' + body + '</div>';
  setView('levers', html, 'Top levers · ' + scopeLabel());
}

function viewActionPlan() {
  const a = analyze();
  const quick = a.nmProducts.filter(r => mvOf(r).effort === 0);
  const oneP = a.nmProducts;
  const ex = (arr, n) => arr.slice(0, n).map(r => '<b>' + esc(rName(r).slice(0, 40)) + '</b> (' + esc(rBrand(r)) + ')').join(' · ') || '—';
  const topLever = Object.keys(a.levers).sort((x, y) => a.levers[y] - a.levers[x])[0];
  const html =
    '<div class="rf-card"><h4>Action plan — ' + esc(scopeLabel()) + '</h4><div class="rf-card-sub">Prioritized by impact and effort</div>' +
    '<div class="rf-plan-phase"><h5>Executive summary</h5><p>Of <b>' + fmt(a.total) + '</b> products, <b>' + fmt(a.dist[0]) + '</b> earn 0★. <b>' + fmt(a.nmTotal + a.dqU) + '</b> are one reachable change from the next star — the fastest ROI.</p></div>' +
    '<div class="rf-plan-phase"><h5>1 · Tackle first — quick wins (' + fmt(quick.length) + ')</h5><p>Near-miss products whose cheapest lever is <b>low effort</b> (fiber, fortification, whole grain, single additive swap).</p><div class="rf-plan-ex">' + ex(quick, 4) + '</div></div>' +
    '<div class="rf-plan-phase"><h5>2 · Biggest reachable impact — one-point reformulations (' + fmt(oneP.length) + ')</h5><p>Every product 1 point from the next star. Most common single lever: <b>' + (topLever ? (LEVER_LABEL[topLever] || topLever) : '—') + '</b>.</p><div class="rf-plan-ex">' + ex(oneP, 4) + '</div></div>' +
    '<div class="rf-plan-phase"><h5>3 · Unlock disqualified products (' + fmt(a.dqU) + ')</h5><p>These already score enough for a star — resolving the disqualifier alone earns it.</p><div class="rf-plan-ex">' + ex(a.dqProducts, 4) + '</div></div>' +
    '<div class="rf-plan-phase"><h5>4 · Next tier — within two points</h5><p>' + fmt(a.w2[0] + a.w2[1] + a.w2[2]) + ' more products are two points out — schedule after the quick wins land.</p></div>' +
    '<div style="display:flex;gap:8px;margin-top:6px"><button class="rf-btn rf-btn-primary" onclick="rfExportPlan(this)">⬇ Export plan (.html)</button></div></div>';
  setView('plan', html, 'Action plan · ' + scopeLabel());
}
window.rfExportPlan = function (btn) {
  // Export only this plan block, not the whole transcript feed.
  const block = btn && btn.closest ? btn.closest('.rf-block') : null;
  const source = (block || document.getElementById('rf-view')).innerHTML;
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Guiding Stars Action Plan — ' + esc(scopeLabel()) + '</title><style>body{font-family:DM Sans,system-ui,sans-serif;max-width:820px;margin:32px auto;padding:0 20px;color:#111827}h1{font-size:22px}h5{margin:18px 0 4px}p{color:#444B55;font-size:14px}</style></head><body><h1>⭐ Guiding Stars Action Plan — ' + esc(scopeLabel()) + '</h1>' + source.replace(/<button[\s\S]*?<\/button>/g, '').replace(/<div class="rf-block-head"[\s\S]*?<\/div>/, '') + '</body></html>';
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'Guiding-Stars-Action-Plan-' + scopeLabel().replace(/[^a-z0-9]+/gi, '-') + '.html';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};

/* ── Product detail + what-if calculator (PRODUCT LEVEL) ──
   The calculator is block-scoped: every id (sliders, value chips, result box) is
   namespaced with the feed block's id, and its live state lives in _wiRegistry
   keyed by that id. So when several product blocks stack in the transcript, each
   keeps its own working sliders instead of colliding on shared element ids. */
const _wiRegistry = {};
function viewProduct(r) {
  currentProduct = r;
  const bid = rfNewBlockId();
  const dq = rDq(r), st = rStars(r), sc = rScore(r);
  const m = mvOf(r);
  const bk = (val, label, note) => {
    const cls = val > 0 ? 'pos' : val < 0 ? 'neg' : 'zero';
    return '<div class="rf-bk"><div class="bv ' + cls + '">' + (val >= 0 ? '+' : '') + val + '</div><div class="bl">' + label + '</div><div class="bn">' + note + '</div></div>';
  };
  const debits = bk(rDpSod(r) || 0, 'Sodium', Math.round(rSod(r)) + ' mg/100kcal') +
    bk(rDpSug(r) || 0, 'Added sugar', rAsugPct(r).toFixed(0) + '% kcal') +
    bk(rDpSatf(r) || 0, 'Saturated fat', rSatf(r).toFixed(1) + ' g/100kcal') +
    bk(rDpTrans(r) || 0, 'Trans fat', rTrans(r) ? 'detected' : 'none') +
    bk(rDpAdds(r) || 0, 'Additives', rAddc(r) + ' flagged');
  const credits = bk(rCpFib(r) || 0, 'Fiber', rFib(r).toFixed(1) + ' g/100kcal') +
    bk(rCpVm(r) || 0, 'Vitamins/minerals', (rCpVm(r) || 0) + ' credited') +
    bk(rCpWg(r) || 0, 'Whole grain', rWg(r) ? 'detected' : 'none');
  const head = '<div class="rf-card"><h4>' + esc(rName(r)) + '</h4><div class="rf-card-sub">' + esc(rBrand(r)) + ' · ' + (ALGO_NAMES[rAlgo(r)] || rAlgo(r)) + ' · ' + esc(rSv(r) || '') + '</div>' +
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">' + (dq ? '<span class="rf-pill r">🚫 Disqualified</span>' : starsHTML(st)) + '<span style="font-size:12px;color:var(--text-muted)">Score ' + (dq ? 'DQ' : sc) + '</span></div>' +
    (dq ? '<div style="font-size:11.5px;color:var(--sec-red-text);margin-top:4px">' + rDqrs(r).map(esc).join(' · ') + '</div>' : '') + '</div>';
  const breakdown = '<div class="rf-card"><h4>Score breakdown</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div><div class="rf-card-sub" style="margin-bottom:6px">Debits</div>' + debits + '</div><div><div class="rf-card-sub" style="margin-bottom:6px">Credits</div>' + credits + '</div></div></div>';
  // fastest path
  let fp = '';
  if (m.max) fp = '<div class="rf-card"><h4>🎯 Fastest path</h4><div style="color:var(--sec-green-text);font-size:12px">Already at the maximum ⭐⭐⭐.</div></div>';
  else {
    let steps = '';
    m.dqFixes.forEach(s => steps += '<div class="rf-step"><span class="pts dq">DQ</span><div>' + esc(s.lbl) + '<span class="rf-eff ' + EFF_CLS[s.effort] + '">' + EFF_LBL[s.effort] + '</span></div></div>');
    m.plan.forEach(s => steps += '<div class="rf-step"><span class="pts">+1</span><div>' + esc(s.lbl) + '<span class="rf-eff ' + EFF_CLS[s.effort] + '">' + EFF_LBL[s.effort] + '</span></div></div>');
    if (!m.reach) steps += '<div class="rf-step"><span class="pts" style="background:var(--text-subtle)">…</span><div>Single-tier changes alone can\'t close this gap — model a larger recipe change with the calculator.</div></div>';
    const headTxt = m.dq && m.unlock ? 'Resolving the disqualifier below immediately earns <b>' + '⭐'.repeat(Math.max(1, st + 1)) + '</b>.' : 'Needs <b>+' + m.gap + ' point' + (m.gap > 1 ? 's' : '') + '</b> to reach ' + '⭐'.repeat(st + 1) + '. Cheapest route:';
    fp = '<div class="rf-card"><h4>🎯 Fastest path to ' + (st + 1) + ' star' + (st ? 's' : '') + '</h4><div style="font-size:12px;margin-bottom:8px;line-height:1.5">' + headTxt + '</div>' + steps + '</div>';
  }
  // what-if calculator
  const grams = servingGrams(r); const hasG = grams && grams > 0;
  const calc = '<div class="rf-card"><h4>Reformulation calculator</h4><div class="rf-card-sub">Drag to model a recipe change — stars recompute live</div>' +
    '<div class="rf-basis-seg"><button class="active" data-b="serving" onclick="rfSetBasis(\'' + bid + '\',\'serving\')">Per serving</button><button data-b="100kcal" onclick="rfSetBasis(\'' + bid + '\',\'100kcal\')">Per 100 kcal</button><button data-b="100g" ' + (hasG ? '' : 'disabled') + ' onclick="rfSetBasis(\'' + bid + '\',\'100g\')">Per 100 g</button></div>' +
    sliderRow(bid, 'sod', 'Sodium', rSodSv(r), 0, Math.max(3000, rSodSv(r) * 2), 5, 'mg') +
    sliderRow(bid, 'sug', 'Added sugar', rAsugSv(r), 0, Math.max(60, rAsugSv(r) * 2), 0.5, 'g') +
    sliderRow(bid, 'satf', 'Sat. fat', rSatfSv(r), 0, Math.max(25, rSatfSv(r) * 2), 0.5, 'g') +
    sliderRow(bid, 'fib', 'Fiber', rFibSv(r), 0, Math.max(20, rFibSv(r) * 3), 0.5, 'g') +
    sliderRow(bid, 'adds', 'Additives', Math.min(rAddc(r), 3), 0, 3, 1, '') +
    '<div class="rf-result" id="' + bid + '-rf-result"><div class="rs-stars">' + starsHTML(st) + '</div><div class="rs-score">Current: ' + (dq ? 'DQ' : sc) + ' points</div><div class="rs-note">Adjust sliders to model impact</div></div></div>';
  setView('product', head + breakdown + fp + calc, 'Product · ' + rName(r).slice(0, 30), bid);
  // wire what-if state (block-scoped so stacked product blocks stay independent)
  _wiRegistry[bid] = { r: r, kcal: rKcal(r) || 100, basis: 'serving' };
}
function sliderRow(bid, id, label, val, min, max, step, unit) {
  const disp = (typeof val === 'number' ? parseFloat(val.toFixed(2)) : val) + unit;
  const wid = bid + '-wi-' + id;
  return '<div class="rf-slider-row"><div class="rf-slider-top"><label>' + label + '</label><span class="sv" id="' + wid + '-v">' + disp + '</span></div>' +
    '<div class="rf-slider-ctrl"><button class="rf-adj" onclick="rfAdj(\'' + bid + '\',\'' + id + '\',' + step + ',-1)">−</button>' +
    '<input type="range" id="' + wid + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" oninput="rfRecalc(\'' + bid + '\')">' +
    '<button class="rf-adj" onclick="rfAdj(\'' + bid + '\',\'' + id + '\',' + step + ',1)">+</button></div></div>';
}
window.rfAdj = function (bid, id, step, dir) {
  const el = document.getElementById(bid + '-wi-' + id); if (!el) return;
  const v = parseFloat(el.value), mn = parseFloat(el.min), mx = parseFloat(el.max);
  el.value = Math.min(mx, Math.max(mn, v + step * dir)); rfRecalc(bid);
};
window.rfSetBasis = function (bid, basis) {
  const wi = _wiRegistry[bid]; if (!wi) return; const r = wi.r;
  if (basis === '100g' && !servingGrams(r)) return;
  wi.basis = basis;
  const block = document.getElementById(bid); if (!block) return;
  block.querySelectorAll('.rf-basis-seg button').forEach(b => b.classList.toggle('active', b.dataset.b === basis));
  const kcal = wi.kcal, grams = servingGrams(r);
  const toB = (svVal, per100) => basis === 'serving' ? svVal : basis === '100kcal' ? per100 : (grams ? svVal * 100 / grams : svVal);
  const maxB = svMax => basis === 'serving' ? svMax : basis === '100kcal' ? svMax * 100 / kcal : (grams ? svMax * 100 / grams : svMax);
  const sodStep = basis === '100g' ? 1 : 5, oth = basis === '100g' ? 0.1 : 0.5;
  const sodUnit = basis === 'serving' ? 'mg' : basis === '100kcal' ? 'mg/100kcal' : 'mg/100g';
  const wU = basis === 'serving' ? 'g' : basis === '100kcal' ? 'g/100kcal' : 'g/100g';
  setSlider(bid, 'sod', toB(rSodSv(r), rSod(r)), maxB(Math.max(3000, rSodSv(r) * 2)), sodStep, sodUnit);
  setSlider(bid, 'sug', toB(rAsugSv(r), rAsug(r)), maxB(Math.max(60, rAsugSv(r) * 2)), oth, wU);
  setSlider(bid, 'satf', toB(rSatfSv(r), rSatf(r)), maxB(Math.max(25, rSatfSv(r) * 2)), oth, wU);
  setSlider(bid, 'fib', toB(rFibSv(r), rFib(r)), maxB(Math.max(20, rFibSv(r) * 3)), oth, wU);
  rfRecalc(bid);
};
function setSlider(bid, id, val, max, step, unit) {
  const el = document.getElementById(bid + '-wi-' + id); if (!el) return;
  el.min = 0; el.max = parseFloat(max.toFixed(1)); el.step = step; el.value = parseFloat(val.toFixed(1));
  const v = document.getElementById(bid + '-wi-' + id + '-v'); if (v) v.textContent = parseFloat(val.toFixed(2)) + unit;
}
window.rfRecalc = function (bid) {
  const wi = _wiRegistry[bid]; if (!wi) return; const r = wi.r; const kc = wi.kcal; const basis = wi.basis;
  const grams = servingGrams(r);
  let f = basis === '100kcal' ? 1 : basis === '100g' ? (grams ? grams / kc : 100 / kc) : 100 / kc;
  const get = id => parseFloat(document.getElementById(bid + '-wi-' + id).value) || 0;
  const sod = get('sod'), sug = get('sug'), satf = get('satf'), fib = get('fib'), adN = parseInt(document.getElementById(bid + '-wi-adds').value) || 0;
  ['sod', 'sug', 'satf', 'fib', 'adds'].forEach(id => {
    const v = parseFloat(document.getElementById(bid + '-wi-' + id).value) || 0;
    const unit = id === 'sod' ? 'mg' : id === 'adds' ? '' : ' g';
    document.getElementById(bid + '-wi-' + id + '-v').textContent = (id === 'adds' ? v : parseFloat(v.toFixed(2))) + unit;
  });
  const sod100 = sod * f, sug100 = sug * f, satf100 = satf * f, fib100 = fib * f;
  const chol = rChol(r), algo = rAlgo(r), trans = rTrans(r);
  const fakeAdds = new Array(adN).fill('a');
  const wg = fib100 >= 1.5 && rWg(r); const vm = rCpVm(r) || 0;
  let res;
  if (algo === 'M') res = scoreM(satf100, chol, sug100, sod100, fib100, fakeAdds, trans, vm);
  else if (algo === 'F') res = scoreF(satf100, chol, sug100, sod100, fakeAdds, trans);
  else if (algo === 'V') res = scoreV(satf100, chol, sug100, sod100, fib100, fakeAdds, trans, wg, vm);
  else res = scoreG(satf100, chol, sug100, sod100, fib100, fakeAdds, trans, wg, vm);
  const ns = res.dq ? 0 : res.stars, np = res.score || 0;
  const orig = rScore(r), delta = np - orig;
  const deltaStr = delta > 0 ? '<span style="color:var(--sec-green-text)">▲' + delta + '</span>' : delta < 0 ? '<span style="color:var(--sec-red-text)">▼' + Math.abs(delta) + '</span>' : '';
  const cur = rStars(r);
  const note = res.dq ? 'Would become DQ: ' + res.dqr[0] : ns > cur ? '✅ Gains ' + (ns - cur) + ' star' + (ns - cur !== 1 ? 's' : '') + '!' : ns === cur ? 'Same: ' + ns + ' star' + (ns !== 1 ? 's' : '') : '⚠ Drops to ' + ns + ' star' + (ns !== 1 ? 's' : '');
  document.getElementById(bid + '-rf-result').innerHTML = '<div class="rs-stars">' + starsHTML(ns) + '</div><div class="rs-score">New score: ' + np + ' ' + deltaStr + '</div><div class="rs-note">' + note + '</div>';
};

/* ═══════════ INTENT REGISTRY ═══════════ */
function respond(o) {
  hideWelcome();
  if (o.user) addUser(o.user);
  const typing = showTyping(o.status);
  setTimeout(() => {
    typing.remove();
    if (o.reply) addWISEai(o.reply, o.src);
    if (o.view) o.view();
    if (o.follow) offerChips(o.follow);
  }, o.delay || 480);
}
function chip(icon, label, onclick) { return { icon, label, onclick }; }

const FOLLOW_PORTFOLIO = () => [
  chip('trending_up', 'Star movers', "runIntent('movers')"),
  chip('bolt', 'Top levers', "runIntent('top_levers')"),
  chip('auto_graph', 'Impact projection', "runIntent('reform_projection')"),
  chip('assignment', 'Action plan', "runIntent('action_plan')"),
  chip('storefront', 'Narrow to a brand owner', "runIntent('choose_owner')"),
];

const INTENTS = {
  overview: () => respond({ user: 'Show me the portfolio overview.', status: 'WISEai is scoring the portfolio', reply: portfolioReply(), view: viewOverview, follow: FOLLOW_PORTFOLIO() }),
  movers: () => respond({ user: 'Where are the quickest star gains?', status: 'WISEai is finding near-miss products', reply: moversReply(), view: viewMovers, follow: [chip('bolt', 'Top levers', "runIntent('top_levers')"), chip('auto_graph', 'Impact projection', "runIntent('reform_projection')"), chip('search', 'Reformulate a product', "runIntent('pick_product','nmany')"), chip('storefront', 'Narrow to a brand owner', "runIntent('choose_owner')")] }),
  blockers: () => respond({ user: "What's blocking the 0-star products?", status: 'WISEai is scanning 0★ blockers', reply: blockersReply(), view: viewBlockers, follow: [chip('trending_up', 'Star movers', "runIntent('movers')"), chip('bolt', 'Top levers', "runIntent('top_levers')"), chip('assignment', 'Action plan', "runIntent('action_plan')")] }),
  brands: () => respond({ user: 'Break it down by brand and owner.', status: 'WISEai is grouping by brand', reply: 'Here are the top brands by portfolio size with their star mix. Click any bar to scope the whole studio to that brand or owner.', view: () => viewBrands('brand'), follow: [chip('business', 'Group by brand owner', "runIntent('choose_owner')"), chip('storefront', 'Pick a brand', "runIntent('choose_brand')"), chip('donut_large', 'Portfolio overview', "runIntent('overview')")] }),
  categories: () => respond({ user: 'Show the category mix.', status: 'WISEai is grouping by category', reply: 'Portfolio by Guiding Stars category, sized by product count and shaded by star mix.', view: viewCategories, follow: FOLLOW_PORTFOLIO() }),
  reform_projection: () => respond({ user: 'If we reformulate, how many stars do we gain?', status: 'WISEai is modeling reformulation impact', reply: projectionReply(), view: viewProjection, follow: [chip('bolt', 'Which levers?', "runIntent('top_levers')"), chip('assignment', 'Turn into an action plan', "runIntent('action_plan')"), chip('search', 'Reformulate a product', "runIntent('pick_product','nmany')")] }),
  top_levers: () => respond({ user: 'Which reformulation levers unlock the most stars?', status: 'WISEai is ranking levers', reply: leversReply(), view: viewLevers, follow: [chip('auto_graph', 'Impact projection', "runIntent('reform_projection')"), chip('assignment', 'Action plan', "runIntent('action_plan')"), chip('search', 'Reformulate a product', "runIntent('pick_product','nmany')")] }),
  action_plan: () => respond({ user: 'Build a reformulation action plan.', status: 'WISEai is drafting the action plan', reply: 'Here\'s a prioritized, phased action plan for <b>' + esc(scopeLabel()) + '</b> — quick wins first, then the biggest reachable impact, then DQ unlocks. You can export it as an HTML handout.', view: viewActionPlan, follow: [chip('search', 'Reformulate a product', "runIntent('pick_product','nmany')"), chip('storefront', 'Change scope', "runIntent('choose_owner')"), chip('donut_large', 'Overview', "runIntent('overview')")] }),
  choose_owner: () => {
    const owners = ownersList().slice(0, 12);
    respond({ user: 'Narrow to a brand owner.', status: 'WISEai is listing brand owners', reply: 'Which brand owner should we focus on? (Top 12 by size)', follow: owners.map(o => chip('business', o.name + ' (' + fmt(o.n) + ')', "runIntent('scope_owner'," + JSON.stringify(o.name).replace(/"/g, '&quot;') + ')')).concat([chip('public', 'Back to whole portfolio', "runIntent('scope_reset')")]) });
  },
  choose_brand: () => {
    const brands = brandsList().slice(0, 12);
    respond({ user: 'Pick a brand.', status: 'WISEai is listing brands', reply: 'Which brand? (Top 12 by size)', follow: brands.map(b => chip('storefront', b.name + ' (' + fmt(b.n) + ')', "runIntent('scope_brand'," + JSON.stringify(b.name).replace(/"/g, '&quot;') + ')')).concat([chip('public', 'Back to whole portfolio', "runIntent('scope_reset')")]) });
  },
  scope_owner: (name) => { setScope('owner', name); respond({ user: 'Focus on ' + name + '.', status: 'WISEai is scoping to ' + name, reply: scopeSetReply(), view: viewOverview, follow: FOLLOW_PORTFOLIO() }); },
  scope_brand: (name) => { setScope('brand', name); respond({ user: 'Focus on ' + name + '.', status: 'WISEai is scoping to ' + name, reply: scopeSetReply(), view: viewOverview, follow: [chip('trending_up', 'Star movers', "runIntent('movers')"), chip('bolt', 'Top levers', "runIntent('top_levers')"), chip('auto_graph', 'Impact projection', "runIntent('reform_projection')"), chip('search', 'Reformulate a product', "runIntent('pick_product','nmany')"), chip('assignment', 'Action plan', "runIntent('action_plan')")] }); },
  scope_reset: () => { setScope('portfolio', null); respond({ user: 'Back to the whole portfolio.', status: 'WISEai is resetting scope', reply: 'Scope reset to the whole portfolio.', view: viewOverview, follow: FOLLOW_PORTFOLIO() }); },
  pick_product: (kind) => {
    const a = analyze();
    let pool = a.nmProducts;
    if (kind === 'nm0') pool = a.nmProducts.filter(r => rStars(r) === 0);
    else if (kind === 'nm1') pool = a.nmProducts.filter(r => rStars(r) === 1);
    else if (kind === 'nm2') pool = a.nmProducts.filter(r => rStars(r) === 2);
    else if (kind === 'dqunlock') pool = a.dqProducts;
    pool = pool.slice(0, 10);
    if (!pool.length) { respond({ user: 'Show me products to reformulate.', status: 'WISEai is finding candidates', reply: 'No near-miss products in this scope for that filter. Try a broader scope or another star tier.', follow: [chip('trending_up', 'Star movers', "runIntent('movers')"), chip('public', 'Whole portfolio', "runIntent('scope_reset')")] }); return; }
    const chips = pool.map(r => chip('inventory_2', rName(r).slice(0, 32) + ' — ' + rBrand(r), "runIntent('open_product'," + ROWS.indexOf(r) + ')'));
    respond({ user: 'Pick a product to reformulate.', status: 'WISEai is finding reformulation candidates', reply: 'Here are near-miss products in <b>' + esc(scopeLabel()) + '</b> — each is one reachable change from the next star. Pick one to open its reformulation calculator.', follow: chips });
  },
  open_product: (idx) => { const r = ROWS[idx]; if (!r) return; respond({ user: 'Reformulate ' + rName(r) + '.', status: 'WISEai is scoring ' + rName(r).slice(0, 30), reply: productReply(r), view: () => viewProduct(r), follow: [chip('trending_up', 'Back to star movers', "runIntent('movers')"), chip('search', 'Another product', "runIntent('pick_product','nmany')"), chip('assignment', 'Action plan', "runIntent('action_plan')")] }); },
};

window.runIntent = function (id, param, silent) {
  const fn = INTENTS[id];
  if (!fn) return;
  if (silent) {
    // re-render current view without a new chat turn (used by scope reset)
    if (id === 'overview') viewOverview(); else if (id === 'movers') viewMovers(); else if (id === 'blockers') viewBlockers();
    else if (id === 'brands') viewBrands('brand'); else if (id === 'categories') viewCategories(); else if (id === 'reform_projection') viewProjection();
    else if (id === 'top_levers') viewLevers(); else if (id === 'action_plan') viewActionPlan(); else viewOverview();
    return;
  }
  fn(param);
};

/* ── Conversational replies (scope-aware) ── */
function portfolioReply() {
  const a = analyze();
  return 'Across <b>' + esc(scopeLabel()) + '</b> there are <b>' + fmt(a.total) + '</b> products. <b>' + fmt(a.dist[0]) + '</b> (' + pct(a.dist[0], a.total) + ') earn 0★, while <b>' + fmt(a.dist[3]) + '</b> already earn 3★. Most importantly, <b style="color:var(--sec-green-text)">' + fmt(a.nmTotal + a.dqU) + '</b> products are just one reachable change from the next star — that\'s where reformulation pays off fastest.';
}
function moversReply() {
  const a = analyze();
  return 'In <b>' + esc(scopeLabel()) + '</b>: <b>' + fmt(a.nm[0]) + '</b> products are one point from their first star, <b>' + fmt(a.nm[1]) + '</b> from a second, <b>' + fmt(a.nm[2]) + '</b> from a third, and <b>' + fmt(a.dqU) + '</b> are disqualified products that already score enough — fixing the disqualifier alone earns a star. Tap a card to reformulate that group.';
}
function blockersReply() {
  const a = analyze();
  const top = Object.keys(a.blockers).map(k => [k, a.blockers[k]]).sort((x, y) => y[1] - x[1])[0];
  return 'For 0★ products in <b>' + esc(scopeLabel()) + '</b>, the single most common one-fix blocker is <b>' + (top ? top[0] + '</b> (' + fmt(top[1]) + ' products)' : '—') + '. Each of these earns a star from removing just that one −1 debit.';
}
function projectionReply() {
  const a = analyze();
  const gained = a.nm[0] + a.nm[1] + a.nm[2] + a.dqU;
  return 'If you apply the single cheapest reachable lever to every near-miss product in <b>' + esc(scopeLabel()) + '</b>, <b style="color:var(--sec-green-text)">' + fmt(gained) + '</b> products move up a star — see the before/after on the right.';
}
function leversReply() {
  const a = analyze();
  const top = Object.keys(a.levers).sort((x, y) => a.levers[y] - a.levers[x])[0];
  return 'Ranked by how many near-miss products each unlocks in <b>' + esc(scopeLabel()) + '</b>. The single highest-leverage change is <b>' + (top ? (LEVER_LABEL[top] || top) + '</b> (' + fmt(a.levers[top]) + ' products)' : '—') + '.';
}
function scopeSetReply() {
  const a = analyze();
  return 'Scoped to <b>' + esc(scope.name) + '</b> — <b>' + fmt(a.total) + '</b> products, <b>' + fmt(a.nmTotal + a.dqU) + '</b> reachable star gains. Everything below now reflects this scope.';
}
function productReply(r) {
  const m = mvOf(r); const st = rStars(r);
  if (m.max) return '<b>' + esc(rName(r)) + '</b> already earns the maximum ⭐⭐⭐.';
  if (m.dq && m.unlock) return '<b>' + esc(rName(r)) + '</b> is disqualified, but its score already clears the bar — resolving the disqualifier alone earns <b>' + '⭐'.repeat(Math.max(1, st + 1)) + '</b>. The calculator on the right shows the exact change.';
  return '<b>' + esc(rName(r)) + '</b> currently earns ' + (rDq(r) ? '0★ (DQ)' : st + '★') + ' and is <b>+' + m.gap + ' point' + (m.gap > 1 ? 's' : '') + '</b> from the next star. I\'ve opened its reformulation calculator — the fastest path and live star projection are on the right.';
}

/* ═══════════ Welcome chips + boot ═══════════ */
const WS_PORTFOLIO = [
  chip('donut_large', 'Portfolio overview', "runIntent('overview')"),
  chip('trending_up', 'Where are the quickest star gains?', "runIntent('movers')"),
  chip('block', "What's blocking 0-star products", "runIntent('blockers')"),
  chip('auto_graph', 'Reformulation impact projection', "runIntent('reform_projection')"),
  chip('bolt', 'Highest-leverage levers', "runIntent('top_levers')"),
  chip('storefront', 'Brands & owners', "runIntent('brands')"),
  chip('category', 'Category mix', "runIntent('categories')"),
  chip('assignment', 'Build an action plan', "runIntent('action_plan')"),
];
const WS_PRODUCT = [
  chip('search', 'Reformulate a near-miss product', "runIntent('pick_product','nmany')"),
  chip('star_half', '0★ → ⭐ candidates', "runIntent('pick_product','nm0')"),
  chip('workspace_premium', '⭐⭐ → ⭐⭐⭐ candidates', "runIntent('pick_product','nm2')"),
  chip('lock_open', 'Fix a disqualified product', "runIntent('pick_product','dqunlock')"),
];
function renderWelcomeChips() {
  document.getElementById('ws-chips-portfolio').innerHTML = WS_PORTFOLIO.map(c => '<button type="button" class="chip" onclick="' + c.onclick + '"><span class="material-icons">' + c.icon + '</span>' + esc(c.label) + '</button>').join('');
  document.getElementById('ws-chips-product').innerHTML = WS_PRODUCT.map(c => '<button type="button" class="chip" onclick="' + c.onclick + '"><span class="material-icons">' + c.icon + '</span>' + esc(c.label) + '</button>').join('');
}
window.rfReExplore = function () {
  document.getElementById('chat-messages').innerHTML = '';
  const ws = document.getElementById('welcome-screen');
  ws.style.display = ''; ws.classList.remove('sc-hidden');
  // Explicit "start over" also clears the ⭐ transcript feed and reseeds a fresh
  // portfolio overview so the panel isn't left showing a stale history.
  document.getElementById('rf-view').innerHTML = '';
  _blockSeq = 0;
  Object.keys(_wiRegistry).forEach(k => delete _wiRegistry[k]);
  setScope('portfolio', null);
  viewOverview();
};
window.rfToggleWidth = function () {
  const row = document.getElementById('modules-row');
  const on = row.classList.toggle('wide-panel');
  const btn = document.querySelector('.rf-panel .panel-width-toggle-btn');
  if (btn) { btn.classList.toggle('is-on', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
};

// chips-only input: nudge to pick an option
function inputNudge() {
  const inp = document.getElementById('chat-input');
  const txt = (inp.value || '').trim(); if (!txt) return;
  inp.value = '';
  hideWelcome();
  addUser(txt);
  const typing = showTyping('WISEai is here to help');
  setTimeout(() => { typing.remove(); addWISEai('I work from the buttons for now — tap one of the options below and I\'ll drive the analysis and the ⭐ panel for you.', false); offerChips(_lastChips.length ? _lastChips : WS_PORTFOLIO.slice(0, 4)); }, 380);
}
document.getElementById('rf-send').addEventListener('click', inputNudge);
document.getElementById('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') inputNudge(); });

/* ── Deep-linking from the left nav ──
   Reformulation sub-items link to reformulation.html#<view>. Route each hash to
   the matching intent so a nav click drives the chat + ⭐ panel just like a chip. */
const HASH_INTENT = {
  overview: ['overview'], movers: ['movers'], blockers: ['blockers'],
  brands: ['brands'], categories: ['categories'], projection: ['reform_projection'],
  levers: ['top_levers'], plan: ['action_plan'], product: ['pick_product', 'nmany'],
};
function routeHash() {
  const key = (location.hash || '').replace('#', '');
  const route = HASH_INTENT[key];
  if (!route) return false;
  window.runIntent(route[0], route[1]);
  return true;
}
window.addEventListener('hashchange', routeHash);

/* Boot */
document.getElementById('rf-total-count').textContent = fmt(S.total || ROWS.length);
renderScopeBar();
renderWelcomeChips();
if (!routeHash()) viewOverview();  // honor a deep link, else seed the overview panel

})();
