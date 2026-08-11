import { workspaceRoutes, savedViewItems, accountRoutes, defaultRouteId } from './routes.js';
import { getRouteFromHash, pushRoute, subscribeRoute } from './router.js';
import { mountApplicationNavigation } from './navigation.js';
import { createAiChatDrawer } from './ai-chat-drawer.js';
import { buildAppearanceBody, wireAppearancePopover, buildUserMenuBody } from './appearance-menu.js';
import {
  applyMinimalUi, isMinimalUiOn, restoreMinimalUi,
  applyHeaderFloat, isHeaderFloatOn, restoreHeaderFloat,
  applyFullBleed, isFullBleedOn, restoreFullBleed,
  applyColorblind, isColorblindOn, restoreColorblind,
  positionPopoverForTopbar,
} from './topbar.js';
import { applyJamStrip, isJamStripOn } from './jam-strip.js';
import { setTextSize } from './text-size.js';

    /** Chart.js UMD attaches here; ES modules do not get implicit globals. */
    const Chart = globalThis.Chart;

    // ========== STATE ==========
    const STATE = {
      theme: localStorage.getItem('wise-theme') || 'light',
      activeTop: 'dashboard',
      activeRail: 'portfolio',
      sidebarOpen: true,
      sidebarCollapsed: true,
      aiOpen: true,
      charts: {},
    };

    const $ = (sel, root=document) => root.querySelector(sel);
    const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

    /** Populated after `showToast` + `createAiChatDrawer` (see below). */
    let setAI = () => {};
    let sendMessage = () => {};

    // ========== THEME ==========
    function colorVar(name){
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }
    function applyTheme(theme){
      STATE.theme = theme;
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem('wise-theme', theme);
      $('#themeIcon').textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
      requestAnimationFrame(rerenderCharts);
    }
    function rerenderCharts(){
      Object.values(STATE.charts).forEach(c => { if (c) { applyThemeColors(c); c.update(); } });
    }

    // ========== DATA ==========
    const RAILS = [
      { id:'portfolio', icon:'inventory_2', title:'Portfolio Overview', desc:'1,248 UPCs · 6 categories', metric:'12.4%', delta:'+1.8%', deltaDir:'up', status:'Live', statusClass:'status-info', spark:'down', color:'primary' },
      { id:'ingredient', icon:'science', title:'Ingredient Review', desc:'9,420 ingredients tracked', metric:'214', delta:'+18', deltaDir:'up', status:'Review', statusClass:'status-warn', spark:'wave', color:'amber' },
      { id:'processing', icon:'precision_manufacturing', title:'Processing Flags', desc:'Severity by UPC group', metric:'92', delta:'+6', deltaDir:'up', status:'Risk', statusClass:'status-risk', spark:'up', color:'red' },
      { id:'verification', icon:'verified', title:'Verification Queue', desc:'Ready for review cycle', metric:'38', delta:'+12', deltaDir:'up', status:'Queue', statusClass:'status-info', spark:'wave', color:'cyan' },
      { id:'claims', icon:'gavel', title:'Claims Review', desc:'Pending compliance pass', metric:'24', delta:'-4', deltaDir:'down', status:'Open', statusClass:'status-warn', spark:'down', color:'amber' },
      { id:'supplier', icon:'factory', title:'Supplier Data', desc:'54 suppliers · 12 stale docs', metric:'88%', delta:'+2%', deltaDir:'up', status:'OK', statusClass:'status-ok', spark:'up', color:'green' },
      { id:'competitive', icon:'leaderboard', title:'Competitive Set', desc:'Tracked peer movement', metric:'+4.6%', delta:'+0.9%', deltaDir:'up', status:'AI', statusClass:'status-ai', spark:'up', color:'violet' },
      { id:'report', icon:'summarize', title:'Report Builder', desc:'Drafts ready for review', metric:'7', delta:'+3', deltaDir:'up', status:'Draft', statusClass:'status-info', spark:'wave', color:'primary' },
    ];

    const PRODUCTS = [
      { name:'Citrus Sparkle Soda', icon:'local_drink', brand:'Atlas Foods', cat:'Beverage', proc:'High', risk:'risk', verif:'review', updated:'2h ago' },
      { name:'Crisp Multigrain', icon:'breakfast_dining', brand:'Northgate', cat:'Snack', proc:'Medium', risk:'warn', verif:'ready', updated:'4h ago' },
      { name:'Garden Veggie Crackers', icon:'cookie', brand:'Atlas Foods', cat:'Snack', proc:'Medium', risk:'warn', verif:'review', updated:'5h ago' },
      { name:'Wholewheat Pasta', icon:'restaurant', brand:'Verdant Mills', cat:'Pasta', proc:'Low', risk:'ok', verif:'verified', updated:'Yesterday' },
      { name:'Cold-Pressed Juice', icon:'water_full', brand:'Bright Co.', cat:'Beverage', proc:'Low', risk:'ok', verif:'verified', updated:'Yesterday' },
      { name:'Berry Granola Mix', icon:'grain', brand:'Atlas Foods', cat:'Cereal', proc:'High', risk:'risk', verif:'missing', updated:'2d ago' },
      { name:'Almond Butter Spread', icon:'kitchen', brand:'Helios Co.', cat:'Spreads', proc:'Medium', risk:'warn', verif:'ready', updated:'2d ago' },
    ];

    const INGREDIENTS = [
      { name:'Carrageenan', tag:'Emulsifier', value:142, pct:84, cls:'risk' },
      { name:'Polysorbate-80', tag:'Emulsifier', value:118, pct:72, cls:'risk' },
      { name:'High-Fructose Corn Syrup', tag:'Sweetener', value:96, pct:64, cls:'warn' },
      { name:'Sodium Benzoate', tag:'Preservative', value:74, pct:48, cls:'warn' },
      { name:'Mono- & Diglycerides', tag:'Emulsifier', value:62, pct:42, cls:'warn' },
      { name:'Natural Flavors', tag:'Flavor', value:48, pct:34, cls:'info' },
      { name:'Red 40', tag:'Color', value:32, pct:24, cls:'risk' },
    ];

    const VERIFICATION = [
      { title:'Citrus Sparkle Soda — Variant Pack', meta:'Atlas Foods · 18 UPCs · ready for review', state:'ready' },
      { title:'Cold-Pressed Juice Family', meta:'Bright Co. · 8 UPCs · review needed', state:'review' },
      { title:'Berry Granola Mix Line', meta:'Atlas Foods · 6 UPCs · missing supplier docs', state:'missing' },
      { title:'Crisp Multigrain Bundle', meta:'Northgate · 12 UPCs · ready for review', state:'ready' },
      { title:'Garden Veggie Crackers', meta:'Atlas Foods · 5 UPCs · high-risk claims', state:'risk' },
    ];

    const SUPPLIERS = [
      { name:'Nordmark', sub:'Beverages · 32 UPCs', pct:92, color:'primary' },
      { name:'Helios Co.', sub:'Spreads · 14 UPCs', pct:78, color:'amber' },
      { name:'Verdant Mills', sub:'Pasta · 9 UPCs', pct:96, color:'green' },
      { name:'Bright Co.', sub:'Juice · 12 UPCs', pct:84, color:'cyan' },
    ];


    // ========== RAILS ==========
    function renderRails(){
      const root = $('#rails');
      root.innerHTML = RAILS.map(r => `
        <div class="rail ${r.id===STATE.activeRail?'active':''}" data-rail="${r.id}">
          <span class="rail-status ${r.statusClass}">${r.status}</span>
          <div class="rail-top">
            <div class="rail-icon"><span class="material-symbols-rounded">${r.icon}</span></div>
          </div>
          <div class="rail-title-row">
            <div class="rail-title">${r.title}</div>
            <div class="rail-desc">${r.desc}</div>
          </div>
          <div class="rail-metric-row">
            <div class="rail-metric">${r.metric}</div>
            <span class="rail-delta ${r.deltaDir}">${r.delta}</span>
          </div>
          <div class="rail-spark"><canvas data-spark="${r.id}"></canvas></div>
        </div>
      `).join('');

      RAILS.forEach(r => {
        const canvas = root.querySelector(`canvas[data-spark="${r.id}"]`);
        if (canvas) buildSparkline(canvas, r.spark, r.color);
      });

      $$('.rail', root).forEach(el => {
        el.addEventListener('click', () => setRail(el.dataset.rail));
      });
    }

    const RAIL_CONTEXT = {
      portfolio:   { title:'Portfolio Overview',  sub:'1,248 UPCs across 6 categories · last refresh 2 minutes ago' },
      ingredient:  { title:'Ingredient Review',   sub:'9,420 ingredients · 214 flagged this cycle' },
      processing:  { title:'Processing Flags',    sub:'92 UPCs cross medium-to-high threshold · severity rising' },
      verification:{ title:'Verification Queue',  sub:'38 in queue · 847 UPCs ready for review cycle' },
      claims:      { title:'Claims Review',       sub:'24 open · 6 require document refresh' },
      supplier:    { title:'Supplier Data',       sub:'54 suppliers · 12 stale documents · 88% completeness' },
      competitive: { title:'Competitive Set',     sub:'Tracked peer movement · +4.6% vs category avg' },
      report:      { title:'Report Builder',      sub:'7 drafts · 142 published this quarter' },
    };

    function setRail(id){
      STATE.activeRail = id;
      $$('.rail').forEach(el => el.classList.toggle('active', el.dataset.rail === id));
      const ctx = RAIL_CONTEXT[id];
      if (ctx) {
        $('#pageTitle').textContent = ctx.title;
        $('#pageSub').textContent = ctx.sub;
      }
    }

    // ========== CHARTS ==========
    function applyThemeColors(chart){
      const text = colorVar('--text-muted');
      const grid = colorVar('--grid');
      const opts = chart.options;
      if (opts.scales) {
        Object.values(opts.scales).forEach(scale => {
          if (scale.ticks) scale.ticks.color = text;
          if (scale.grid) {
            scale.grid.color = grid;
            scale.grid.drawBorder = false;
          }
          if (scale.angleLines) scale.angleLines.color = grid;
          if (scale.pointLabels) scale.pointLabels.color = text;
        });
      }
      if (opts.plugins && opts.plugins.legend && opts.plugins.legend.labels) {
        opts.plugins.legend.labels.color = text;
      }
    }

    function colorWithAlpha(hex, alpha){
      const h = hex.replace('#','');
      const r = parseInt(h.substring(0,2),16);
      const g = parseInt(h.substring(2,4),16);
      const b = parseInt(h.substring(4,6),16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function buildSparkline(canvas, kind, color){
      const ctx = canvas.getContext('2d');
      const map = {
        primary: colorVar('--primary') || '#25507C',
        amber: colorVar('--ter-amber'),
        red: colorVar('--sec-red'),
        cyan: colorVar('--ter-cyan'),
        green: colorVar('--sec-green'),
        violet: colorVar('--ter-violet'),
      };
      const c = map[color] || map.primary;
      let data;
      if (kind === 'up') data = [10,14,11,18,16,22,20,28,30];
      else if (kind === 'down') data = [28,22,24,20,18,14,16,12,8];
      else data = [14,18,12,20,16,22,18,24,20];

      const grad = ctx.createLinearGradient(0,0,0,40);
      grad.addColorStop(0, colorWithAlpha(c, 0.35));
      grad.addColorStop(1, colorWithAlpha(c, 0));

      return new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map((_,i)=>i),
          datasets: [{
            data,
            borderColor: c,
            backgroundColor: grad,
            tension: 0.4,
            fill: true,
            borderWidth: 1.5,
            pointRadius: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 700 },
          plugins: { legend: { display:false }, tooltip: { enabled:false } },
          scales: { x: { display:false }, y: { display:false } }
        }
      });
    }

    function makePortfolioTrend(){
      const ctx = $('#chart-portfolio-trend').getContext('2d');
      const primary = colorVar('--primary');
      const violet = colorVar('--ter-violet');
      const grad1 = ctx.createLinearGradient(0,0,0,260);
      grad1.addColorStop(0, colorWithAlpha(primary, 0.28));
      grad1.addColorStop(1, colorWithAlpha(primary, 0));
      const grad2 = ctx.createLinearGradient(0,0,0,260);
      grad2.addColorStop(0, colorWithAlpha(violet, 0.18));
      grad2.addColorStop(1, colorWithAlpha(violet, 0));

      STATE.charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
          datasets: [
            { label:'Portfolio risk %', data:[8.2,8.8,9.4,9.1,9.8,10.4,11.0,10.6,11.4,11.9,12.1,12.4], borderColor: primary, backgroundColor: grad1, tension:.4, fill:true, borderWidth:2.4, pointRadius:0, pointHoverRadius:5, pointBackgroundColor: primary },
            { label:'Category average', data:[10.0,10.2,10.4,10.6,10.8,11.0,11.2,11.4,11.6,11.8,12.0,12.2], borderColor: violet, backgroundColor: grad2, tension:.4, fill:true, borderWidth:2, pointRadius:0, borderDash:[6,4] },
          ]
        },
        options: chartBase()
      });
      applyThemeColors(STATE.charts.trend);
    }

    function makeCategory(){
      const ctx = $('#chart-category').getContext('2d');
      STATE.charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Low risk','Medium','High','Critical'],
          datasets: [{
            data: [620, 410, 168, 50],
            backgroundColor: [
              colorVar('--sec-green'),
              colorVar('--ter-amber'),
              colorVar('--sec-red'),
              colorVar('--ter-violet'),
            ],
            borderColor: colorVar('--surface'),
            borderWidth: 4,
            hoverOffset: 8,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '64%',
          plugins: {
            legend: { position:'bottom', labels:{ usePointStyle:true, padding:14, boxWidth:8, font:{ size:12 } } },
            tooltip: tooltipStyle(),
          }
        }
      });
      applyThemeColors(STATE.charts.category);
    }

    function makeVerification(){
      const ctx = $('#chart-verification').getContext('2d');
      const primary = colorVar('--primary');
      STATE.charts.verification = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Wk 1','Wk 2','Wk 3','Wk 4','Wk 5','Wk 6','Wk 7','Wk 8'],
          datasets: [
            { label:'Ready', data:[42,48,52,58,62,68,72,78], backgroundColor: colorVar('--sec-green'), borderRadius:6, stack:'s' },
            { label:'Review', data:[18,22,18,24,22,20,24,28], backgroundColor: colorVar('--ter-amber'), borderRadius:6, stack:'s' },
            { label:'Missing', data:[8,6,10,8,12,9,7,6], backgroundColor: colorVar('--sec-red'), borderRadius:6, stack:'s' },
          ]
        },
        options: {
          ...chartBase(),
          scales: {
            x: { stacked:true, grid:{ display:false }, ticks:{ font:{ size:11 } } },
            y: { stacked:true, grid:{ color: colorVar('--grid') }, ticks:{ font:{ size:11 } } },
          },
          plugins: {
            legend: { position:'bottom', labels:{ usePointStyle:true, padding:12, boxWidth:8, font:{ size:11 } } },
            tooltip: tooltipStyle(),
          }
        }
      });
      applyThemeColors(STATE.charts.verification);
    }

    function makeClaims(){
      const ctx = $('#chart-claims').getContext('2d');
      const amber = colorVar('--ter-amber');
      const grad = ctx.createLinearGradient(0,0,0,200);
      grad.addColorStop(0, colorWithAlpha(amber, 0.4));
      grad.addColorStop(1, colorWithAlpha(amber, 0));
      STATE.charts.claims = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['W1','W2','W3','W4','W5','W6','W7','W8'],
          datasets: [{
            label:'Resolved', data:[12,16,14,22,18,26,24,30],
            borderColor: amber, backgroundColor: grad, tension:.4, fill:true, borderWidth:2.4, pointRadius:0
          }]
        },
        options: chartBase()
      });
      applyThemeColors(STATE.charts.claims);
    }

    function makeCompetitive(){
      const ctx = $('#chart-competitive').getContext('2d');
      STATE.charts.competitive = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: ['Risk','Verif.','Claims','Docs','Innov.','Speed'],
          datasets: [
            { label:'Atlas Foods', data:[78,82,74,88,70,80], borderColor: colorVar('--primary'), backgroundColor: colorWithAlpha(colorVar('--primary'),0.18), borderWidth:2, pointRadius:3, pointBackgroundColor: colorVar('--primary') },
            { label:'Category avg', data:[65,68,60,72,62,68], borderColor: colorVar('--ter-violet'), backgroundColor: colorWithAlpha(colorVar('--ter-violet'),0.10), borderWidth:2, pointRadius:0, borderDash:[5,3] },
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position:'bottom', labels:{ usePointStyle:true, padding:12, boxWidth:8, font:{ size:11 } } },
            tooltip: tooltipStyle(),
          },
          scales: {
            r: {
              grid: { color: colorVar('--grid') },
              angleLines: { color: colorVar('--grid') },
              pointLabels: { color: colorVar('--text-muted'), font:{ size:11 } },
              ticks: { display:false, stepSize:20 },
              suggestedMin: 0, suggestedMax: 100,
            }
          }
        }
      });
      applyThemeColors(STATE.charts.competitive);
    }

    function makeKpiSparks(){
      STATE.charts.kpi1 = buildSparkline($('#kpi-spark-1'), 'up', 'red');
      STATE.charts.kpi2 = buildSparkline($('#kpi-spark-2'), 'up', 'green');
      STATE.charts.kpi3 = buildSparkline($('#kpi-spark-3'), 'wave', 'amber');
      STATE.charts.kpi4 = buildSparkline($('#kpi-spark-4'), 'down', 'cyan');
    }

    function tooltipStyle(){
      return {
        backgroundColor: colorVar('--surface'),
        titleColor: colorVar('--text'),
        bodyColor: colorVar('--text-muted'),
        borderColor: colorVar('--border-strong'),
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        displayColors: true,
        usePointStyle: true,
      };
    }

    function chartBase(){
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutCubic' },
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: { position:'bottom', labels:{ usePointStyle:true, boxWidth:8, padding:14, font:{ size:11.5 } } },
          tooltip: tooltipStyle(),
        },
        scales: {
          x: { grid:{ display:false }, ticks:{ color: colorVar('--text-muted'), font:{ size:11 } } },
          y: { grid:{ color: colorVar('--grid') }, ticks:{ color: colorVar('--text-muted'), font:{ size:11 } } },
        }
      };
    }

    // ========== TABLES / PANELS ==========
    const STATUS_MAP = {
      risk:    { cls:'status-risk', dot:'var(--sec-red)',  label:'High' },
      warn:    { cls:'status-warn', dot:'var(--ter-amber)', label:'Medium' },
      ok:      { cls:'status-ok',   dot:'var(--sec-green)', label:'Low' },
      info:    { cls:'status-info', dot:'var(--ter-cyan)',  label:'Info' },
    };
    const VERIF_MAP = {
      verified: { cls:'status-ok',   icon:'verified', label:'Verified' },
      ready:    { cls:'status-info', icon:'check', label:'Ready' },
      review:   { cls:'status-warn', icon:'hourglass_top', label:'Review' },
      missing:  { cls:'status-risk', icon:'error', label:'Missing' },
    };
    const PROC_MAP = {
      Low:    { cls:'status-ok' },
      Medium: { cls:'status-warn' },
      High:   { cls:'status-risk' },
    };

    function renderTable(){
      const tbody = $('#productTbody');
      tbody.innerHTML = PRODUCTS.map((p, idx) => {
        const r = STATUS_MAP[p.risk];
        const v = VERIF_MAP[p.verif];
        const pc = PROC_MAP[p.proc];
        const upc = 'WS-' + (1000 + idx * 137 % 9000);
        return `
        <tr data-product-idx="${idx}" data-upc="${upc}">
          <td>
            <div class="table-product">
              <div class="table-thumb"><span class="material-symbols-rounded ms-fill" style="font-size:18px;">${p.icon}</span></div>
              <div>
                <div style="font-weight:600;">${p.name}</div>
                <div style="font-size:11px;color:var(--text-muted);">UPC · ${upc}</div>
              </div>
            </div>
          </td>
          <td style="color:var(--text-muted);">${p.brand}</td>
          <td>${p.cat}</td>
          <td><span class="pill ${pc.cls}"><span class="dot" style="background:currentColor;opacity:.7;"></span>${p.proc}</span></td>
          <td><span class="pill ${r.cls}"><span class="dot" style="background:${r.dot};"></span>${r.label}</span></td>
          <td><span class="pill ${v.cls}"><span class="material-symbols-rounded" style="font-size:13px;">${v.icon}</span>${v.label}</span></td>
          <td style="color:var(--text-muted);font-size:12px;">${p.updated}</td>
        </tr>`;
      }).join('');
      $$('tr[data-product-idx]', tbody).forEach(tr => {
        tr.addEventListener('click', () => openProductDetail(PRODUCTS[+tr.dataset.productIdx], tr.dataset.upc));
      });
    }

    function renderIngredients(){
      const root = $('#ingredientBars');
      root.innerHTML = INGREDIENTS.map(i => `
        <div class="bar-row">
          <div class="bar-row-top">
            <div class="bar-name">
              <span class="dot" style="background:${
                i.cls==='risk' ? 'var(--sec-red)' :
                i.cls==='warn' ? 'var(--ter-amber)' :
                i.cls==='info' ? 'var(--ter-cyan)' : 'var(--sec-green)'
              };"></span>
              ${i.name}
              <span style="font-size:11px;color:var(--text-muted);font-weight:400;">· ${i.tag}</span>
            </div>
            <div class="bar-value">${i.value} flags</div>
          </div>
          <div class="bar-track"><div class="bar-fill ${i.cls}" data-target="${i.pct}"></div></div>
        </div>
      `).join('');
      requestAnimationFrame(() => {
        $$('.bar-fill', root).forEach(el => { el.style.width = el.dataset.target + '%'; });
      });
    }

    function renderVerification(){
      const root = $('#verificationQueue');
      const stateMap = {
        ready:   { color:'var(--sec-green)',  bg:'var(--sec-green-10)',  icon:'check',   label:'Ready' },
        review:  { color:'var(--ter-amber)',  bg:'var(--ter-amber-10)',  icon:'hourglass_top',  label:'Review' },
        missing: { color:'var(--ter-cyan)',   bg:'var(--ter-cyan-10)',   icon:'help',           label:'Missing' },
        risk:    { color:'var(--sec-red)',    bg:'var(--sec-red-10)',    icon:'priority_high',  label:'High Risk' },
      };
      root.innerHTML = VERIFICATION.map((v, idx) => {
        const m = stateMap[v.state];
        return `
          <div class="queue-row" data-verif-idx="${idx}">
            <div class="queue-thumb" style="background:${m.bg};color:${m.color};">
              <span class="material-symbols-rounded ms-fill" style="font-size:20px;">${m.icon}</span>
            </div>
            <div class="queue-body">
              <div class="queue-title">${v.title}</div>
              <div class="queue-meta">${v.meta}</div>
            </div>
            <span class="pill" style="color:${m.color};background:${m.bg};">${m.label}</span>
          </div>
        `;
      }).join('');
      $$('.queue-row', root).forEach(el => {
        el.addEventListener('click', () => openVerificationDetail(VERIFICATION[+el.dataset.verifIdx], stateMap));
      });
    }

    function renderSuppliers(){
      const root = $('#supplierRings');
      root.innerHTML = SUPPLIERS.map(s => {
        const c = {
          primary:'var(--primary)', amber:'var(--ter-amber)',
          green:'var(--sec-green)', cyan:'var(--ter-cyan)',
        }[s.color];
        const r = 26, cir = 2 * Math.PI * r;
        const off = cir - (cir * s.pct/100);
        return `
          <div class="ring-card">
            <div class="ring-wrap">
              <svg viewBox="0 0 60 60" width="60" height="60">
                <circle cx="30" cy="30" r="${r}" stroke="var(--border)" stroke-width="6" fill="none"/>
                <circle cx="30" cy="30" r="${r}" stroke="${c}" stroke-width="6" fill="none"
                  stroke-dasharray="${cir}" stroke-dashoffset="${off}" stroke-linecap="round"
                  transform="rotate(-90 30 30)" style="transition: stroke-dashoffset 1s ease;" />
              </svg>
              <div class="ring-pct" style="color:${c};">${s.pct}%</div>
            </div>
            <div style="min-width:0;">
              <div class="ring-label">${s.name}</div>
              <div class="ring-sub">${s.sub}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    // ========== TOP NAV ==========
    function destroyAllCharts(){
      Object.values(STATE.charts).forEach(c => { try { if (c && c.destroy) c.destroy(); } catch(e){} });
      STATE.charts = {};
    }

    function applyTopModule(id){
      STATE.activeTop = id;
      $$('[data-top]').forEach(el => el.classList.toggle('active', el.dataset.top === id));
      $$('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === id));
      const m = MODULES[id];
      if (!m) return;
      $('#pageTitle').textContent = m.title;
      $('#pageSub').textContent = m.sub;
      destroyAllCharts();
      $('#moduleContent').innerHTML = '';
      m.render();
      setTimeout(rerenderCharts, 50);
    }

    function setTopModule(id){
      const next = routeIsValid(id) ? id : defaultRouteId;
      if (getRouteFromHash() !== next) pushRoute(next);
      applyTopModule(next);
    }

    // ========== MODULE HELPERS ==========
    function kpiCardHtml(opts){
      // {label, value, delta, deltaDir, icon, color, sparkId, sparkKind}
      return `
      <div class="surface kpi card-hover fade-up" style="animation-delay:${opts.delay||0}s;">
        <div class="kpi-label"><span class="material-symbols-rounded ms-fill" style="font-size:16px;color:${opts.color};">${opts.icon}</span>${opts.label}</div>
        <div class="kpi-row">
          <div class="kpi-value">${opts.value}</div>
          <span class="rail-delta ${opts.deltaDir}">${opts.delta}</span>
        </div>
        <div class="kpi-spark"><canvas id="${opts.sparkId}"></canvas></div>
      </div>`;
    }
    function panelHtml(opts){
      // {icon, color, title, sub, headerRight, body, padded=true}
      return `
      <div class="surface panel">
        <div class="panel-header">
          <div>
            <div class="panel-title"><span class="material-symbols-rounded ms-fill" style="color:${opts.color||'var(--primary)'};">${opts.icon}</span>${opts.title}</div>
            ${opts.sub?`<div class="panel-sub">${opts.sub}</div>`:''}
          </div>
          ${opts.headerRight||''}
        </div>
        ${opts.body||''}
      </div>`;
    }
    function insightCardHtml(opts){
      // {eyebrow, headline, text, chips:[{icon,text,cls,action}]}
      const chips = (opts.chips||[]).map(c =>
        `<span class="chip ${c.cls||''}" ${c.action?`data-action="${c.action}" style="cursor:pointer;"`:''}><span class="material-symbols-rounded" style="font-size:14px;">${c.icon}</span>${c.text}</span>`
      ).join('');
      return `
      <div class="insight-card fade-up" style="animation-delay:.2s;">
        <div class="insight-icon"><span class="material-symbols-rounded">auto_awesome</span></div>
        <div class="insight-body">
          <div class="insight-eyebrow">${opts.eyebrow||'AI Intelligence'}</div>
          <div class="insight-headline">${opts.headline||''}</div>
          <div class="insight-text">${opts.text||''}</div>
          ${chips?`<div class="insight-chips">${chips}</div>`:''}
        </div>
      </div>`;
    }

    // ========== MODULE REGISTRY ==========
    function renderStubModule(title, paragraph){
      return function renderStub(){
        $('#moduleContent').innerHTML = `
        <div class="surface panel fade-up" style="padding:28px 32px;max-width:720px;margin:0 auto;">
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);letter-spacing:.12em;text-transform:uppercase;">Template page</div>
          <h2 style="font-size:22px;font-weight:700;margin:8px 0 12px;letter-spacing:-.02em;">${title}</h2>
          <p style="color:var(--text-muted);line-height:1.65;font-size:14px;">${paragraph}</p>
          <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap;">
            <span class="pill status-info"><span class="dot" style="background:var(--ter-cyan);"></span>Placeholder</span>
            <span class="chip chip-ai"><span class="material-symbols-rounded" style="font-size:13px;">auto_awesome</span>Connect APIs and permissions here</span>
          </div>
        </div>`;
      };
    }

    const MODULES = {
      wiseowl: {
        title: 'WISEowl',
        sub: 'Opening the AI verification workspace…',
        render() {
          window.location.assign(new URL('pages/ai-chat.html', window.location.href).href);
        },
      },
      dashboard:   { title:'Dashboard',             sub:'', render: renderBlankDashboardModule },
      products:    { title:'Product Intelligence',  sub:'1,248 active products · 6 categories · 54 brands', render: renderProductsModule },
      ingredients: { title:'Ingredient Intelligence', sub:'9,420 ingredients tracked · 214 flagged this cycle', render: renderIngredientsModule },
      processing:  { title:'Processing Analysis',   sub:'Severity, additive load, and processing markers', render: renderProcessingModule },
      verification:{ title:'Verification Workflows', sub:'38 items in queue · 847 ready for review cycle', render: renderVerificationModule },
      compliance:  { title:'Compliance Review',     sub:'24 open claims · 12 jurisdictional notes', render: renderComplianceModule },
      insights:    { title:'Insights',              sub:'42 AI-generated insights · 18 acted on this quarter', render: renderInsightsModule },
      reports:     { title:'Reports',               sub:'7 drafts · 142 published this quarter', render: renderReportsModule },
      settings:    { title:'Settings',              sub:'Workspace preferences, security, and integrations (template)', render: renderStubModule('Settings', 'This is a placeholder for enterprise settings: SSO, API keys, notifications, and regional defaults. Replace this panel with your settings experience.') },
      team:        { title:'Team',                  sub:'Members, roles, and invitations (template)', render: renderStubModule('Team', 'This is a placeholder for directory, roles, seat management, and audit access. Replace this panel with your team admin experience.') },
    };

    function routeIsValid(id){ return !!(id && MODULES[id]); }

    // ========== DASHBOARD MODULE ==========
    function renderBlankDashboardModule(){
      $('#moduleContent').innerHTML = '';
    }

    function renderDashboardModule(){
      $('#moduleContent').innerHTML = `
        <div class="kpi-grid">
          ${kpiCardHtml({label:'Portfolio Risk',     value:'12.4%', delta:'▲ 1.8%', deltaDir:'down', icon:'warning',  color:'var(--sec-red)',   sparkId:'kpi-spark-1', delay:.05})}
          ${kpiCardHtml({label:'Verification Ready', value:'847',   delta:'▲ 64',   deltaDir:'up',   icon:'verified', color:'var(--sec-green)', sparkId:'kpi-spark-2', delay:.1})}
          ${kpiCardHtml({label:'Open Claims',        value:'38',    delta:'▲ 6',    deltaDir:'down', icon:'gavel',    color:'var(--ter-amber)', sparkId:'kpi-spark-3', delay:.15})}
          ${kpiCardHtml({label:'Supplier Gaps',      value:'14',    delta:'▼ 3',    deltaDir:'up',   icon:'factory',  color:'var(--ter-cyan)',  sparkId:'kpi-spark-4', delay:.2})}
        </div>

        ${insightCardHtml({
          eyebrow:'AI Intelligence · 96% confidence',
          headline:'38% of high-risk UPCs share three common emulsifier clusters.',
          text:`Atlas Foods' beverage and snack lines show a recurring co-occurrence of carrageenan, polysorbate-80, and mono- &amp; diglycerides — accounting for the majority of recent risk flags. Reviewing supplier substitutions in these clusters could reduce portfolio risk by an estimated 4.2%.`,
          chips:[
            {icon:'auto_awesome',text:'Generated by WISE Enterprise',cls:'chip-ai'},
            {icon:'inventory_2',text:'147 UPCs',action:'view-upcs'},
            {icon:'science',text:'3 ingredient clusters',action:'view-clusters'},
            {icon:'arrow_forward',text:'Review supplier substitutes',cls:'chip-primary',action:'review-substitutes'},
          ]
        })}

        <div class="grid-2 fade-up" style="animation-delay:.3s;">
          ${panelHtml({
            icon:'show_chart', color:'var(--primary)', title:'Portfolio Risk Trend', sub:'12-month rolling, all categories',
            headerRight:`<div class="seg" id="trendRange">
              <button class="seg-btn" data-range="12M">12M</button>
              <button class="seg-btn" data-range="6M">6M</button>
              <button class="seg-btn active" data-range="3M">3M</button>
            </div>`,
            body:`<div class="chart-wrap lg"><canvas id="chart-portfolio-trend"></canvas></div>`
          })}
          ${panelHtml({
            icon:'donut_small', color:'var(--ter-violet)', title:'Category Distribution', sub:'By processing risk band',
            body:`<div class="chart-wrap lg"><canvas id="chart-category"></canvas></div>`
          })}
        </div>

        <div class="grid-2 fade-up" style="animation-delay:.35s;">
          ${panelHtml({
            icon:'inventory_2', color:'var(--primary)', title:'Product Portfolio', sub:'Top movement in the last 14 days',
            headerRight:`<button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" data-action="view-all-products">View all <span class="material-symbols-rounded" style="font-size:16px;">arrow_forward</span></button>`,
            body:`<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Processing</th><th>Risk</th><th>Verification</th><th>Updated</th></tr></thead><tbody id="productTbody"></tbody></table></div>`
          })}
          ${panelHtml({
            icon:'science', color:'var(--ter-amber)', title:'Ingredient Intelligence', sub:'Flag frequency, last 30 days',
            headerRight:`<button class="icon-btn" title="More" data-action="ingredient-more" id="ingredientMoreBtn"><span class="material-symbols-rounded">more_vert</span></button>`,
            body:`<div id="ingredientBars"></div>`
          })}
        </div>

        <div class="grid-2 fade-up" style="animation-delay:.4s;">
          ${panelHtml({
            icon:'bar_chart', color:'var(--ter-cyan)', title:'Verification Queue Status', sub:'Weekly throughput',
            body:`<div class="chart-wrap"><canvas id="chart-verification"></canvas></div>`
          })}
          ${panelHtml({
            icon:'checklist', color:'var(--sec-green)', title:'Verification Queue', sub:'Next up for review',
            headerRight:`<button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" data-action="view-verification">38 total</button>`,
            body:`<div id="verificationQueue"></div>`
          })}
        </div>

        <div class="grid-3 fade-up" style="animation-delay:.45s;">
          ${panelHtml({
            icon:'factory', color:'var(--ter-violet)', title:'Supplier Documentation', sub:'Completeness',
            body:`<div class="ring-grid" id="supplierRings"></div>`
          })}
          ${panelHtml({
            icon:'gavel', color:'var(--ter-amber)', title:'Claims Review Outcomes', sub:'Last 8 weeks',
            body:`<div class="chart-wrap"><canvas id="chart-claims"></canvas></div>`
          })}
          ${panelHtml({
            icon:'leaderboard', color:'var(--primary)', title:'Competitive Benchmark', sub:'vs. category peers',
            body:`<div class="chart-wrap"><canvas id="chart-competitive"></canvas></div>`
          })}
        </div>
      `;

      renderTable();
      renderIngredients();
      renderVerification();
      renderSuppliers();
      makeKpiSparks();
      makePortfolioTrend();
      makeCategory();
      makeVerification();
      makeClaims();
      makeCompetitive();

      $$('#trendRange .seg-btn').forEach(b => b.addEventListener('click', () => setTrendRange(b.dataset.range)));
    }

    // ========== PRODUCTS MODULE ==========
    const BRANDS = [
      { name:'Atlas Foods', upc:412, risk:14.2, color:'var(--primary)' },
      { name:'Northgate',   upc:218, risk:9.6,  color:'var(--ter-amber)' },
      { name:'Verdant Mills', upc:184, risk:6.1, color:'var(--sec-green)' },
      { name:'Bright Co.',  upc:142, risk:11.4, color:'var(--ter-cyan)' },
      { name:'Helios Co.',  upc:128, risk:13.0, color:'var(--ter-violet)' },
      { name:'Sunrise Foods',upc:96, risk:8.4,  color:'var(--sec-red)' },
    ];

    function renderProductsModule(){
      $('#moduleContent').innerHTML = `
        <div class="kpi-grid">
          ${kpiCardHtml({label:'Total Products',    value:'1,248', delta:'▲ 42', deltaDir:'up', icon:'inventory_2',  color:'var(--primary)',    sparkId:'p-sp-1', delay:.05})}
          ${kpiCardHtml({label:'New This Quarter',  value:'68',    delta:'▲ 18', deltaDir:'up', icon:'auto_awesome', color:'var(--ter-violet)', sparkId:'p-sp-2', delay:.1})}
          ${kpiCardHtml({label:'Active Categories', value:'6',     delta:'—',     deltaDir:'up', icon:'category',     color:'var(--ter-cyan)',   sparkId:'p-sp-3', delay:.15})}
          ${kpiCardHtml({label:'Avg Risk Score',    value:'10.8',  delta:'▼ 0.4', deltaDir:'up', icon:'warning',      color:'var(--sec-red)',    sparkId:'p-sp-4', delay:.2})}
        </div>

        <div class="grid-2 fade-up" style="animation-delay:.3s;">
          ${panelHtml({icon:'bar_chart', color:'var(--primary)', title:'Risk Distribution by Category', sub:'High / Medium / Low',
            body:`<div class="chart-wrap lg"><canvas id="chart-product-risk"></canvas></div>`})}
          ${panelHtml({icon:'verified', color:'var(--sec-green)', title:'Verification Status', sub:'Across active portfolio',
            body:`<div class="chart-wrap lg"><canvas id="chart-product-verif"></canvas></div>`})}
        </div>

        ${panelHtml({icon:'inventory_2', color:'var(--primary)', title:'Product Catalog', sub:`${PRODUCTS.length*40} products · filtered view`,
          headerRight:`<div style="display:flex;gap:6px;">
            <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" data-action="filter"><span class="material-symbols-rounded" style="font-size:16px;">tune</span>Filter</button>
            <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" data-action="export"><span class="material-symbols-rounded" style="font-size:16px;">download</span>Export</button>
          </div>`,
          body:`<div class="product-grid" id="productGrid"></div>`})}

        <div class="grid-2 fade-up" style="animation-delay:.4s;">
          ${panelHtml({icon:'storefront', color:'var(--ter-violet)', title:'Top Brands', sub:'By portfolio share',
            body:`<div id="brandsList"></div>`})}
          ${panelHtml({icon:'auto_awesome', color:'var(--ter-violet)', title:'AI Recommendations', sub:'Product portfolio actions',
            body:`<div class="timeline">
              <div class="timeline-item violet"><div class="timeline-time">Today · 2h ago</div><div class="timeline-title">Reformulate Crisp Multigrain to reduce processing severity by 12%</div><div class="timeline-sub">Estimated impact: 28 UPCs · medium effort</div></div>
              <div class="timeline-item green"><div class="timeline-time">Today · 4h ago</div><div class="timeline-title">Discontinue 6 underperforming beverage UPCs</div><div class="timeline-sub">Combined risk score: 18.4 · low margin</div></div>
              <div class="timeline-item amber"><div class="timeline-time">Yesterday</div><div class="timeline-title">Bundle Garden Veggie Crackers with verified jam line</div><div class="timeline-sub">Cross-sell opportunity · positive sentiment</div></div>
              <div class="timeline-item"><div class="timeline-time">2 days ago</div><div class="timeline-title">Expand pasta line into low-sodium variants</div><div class="timeline-sub">Category demand up 14% YoY</div></div>
            </div>`})}
        </div>
      `;

      // Sparklines
      buildSparkline($('#p-sp-1'), 'up', 'primary');
      buildSparkline($('#p-sp-2'), 'up', 'violet');
      buildSparkline($('#p-sp-3'), 'wave', 'cyan');
      buildSparkline($('#p-sp-4'), 'down', 'red');

      // Charts
      const ctx1 = $('#chart-product-risk').getContext('2d');
      STATE.charts.pRisk = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: ['Beverage','Snack','Pasta','Spreads','Cereal','Dairy'],
          datasets: [
            { label:'Low',    data:[120, 86, 138, 64, 42, 78], backgroundColor: colorVar('--sec-green'), borderRadius:6, stack:'s' },
            { label:'Medium', data:[42, 58, 32, 28, 22, 26],  backgroundColor: colorVar('--ter-amber'), borderRadius:6, stack:'s' },
            { label:'High',   data:[22, 18,  4,  8, 14, 12],  backgroundColor: colorVar('--sec-red'),   borderRadius:6, stack:'s' },
          ]
        },
        options: { ...chartBase(),
          scales: { x:{ stacked:true, grid:{display:false}, ticks:{font:{size:11}} }, y:{ stacked:true, grid:{color:colorVar('--grid')}, ticks:{font:{size:11}} } },
          plugins: { legend:{ position:'bottom', labels:{ usePointStyle:true, padding:12, boxWidth:8, font:{size:11} } }, tooltip: tooltipStyle() } }
      });
      applyThemeColors(STATE.charts.pRisk);

      const ctx2 = $('#chart-product-verif').getContext('2d');
      STATE.charts.pVerif = new Chart(ctx2, {
        type: 'doughnut',
        data: { labels:['Verified','Ready','Review','Missing'], datasets:[{
          data:[612, 380, 196, 60],
          backgroundColor:[colorVar('--sec-green'), colorVar('--primary'), colorVar('--ter-amber'), colorVar('--sec-red')],
          borderColor: colorVar('--surface'), borderWidth: 4, hoverOffset: 8 }]
        },
        options: { responsive:true, maintainAspectRatio:false, cutout:'64%',
          plugins: { legend:{ position:'bottom', labels:{ usePointStyle:true, padding:14, boxWidth:8, font:{size:12} } }, tooltip: tooltipStyle() } }
      });
      applyThemeColors(STATE.charts.pVerif);

      // Product grid
      const grid = $('#productGrid');
      // Render PRODUCTS twice to look denser
      const productList = [...PRODUCTS, ...PRODUCTS];
      grid.innerHTML = productList.map((p, idx) => {
        const r = STATUS_MAP[p.risk];
        const v = VERIF_MAP[p.verif];
        return `
        <div class="surface product-card card-hover" data-product-idx="${idx % PRODUCTS.length}" data-upc="WS-${1100+idx*51%9000}">
          <div class="product-card-top">
            <div class="product-thumb"><span class="material-symbols-rounded">${p.icon}</span></div>
            <div style="min-width:0;flex:1;">
              <div class="product-card-title">${p.name}</div>
              <div class="product-card-brand">${p.brand} · ${p.cat}</div>
            </div>
            <button class="icon-btn" style="width:30px;height:30px;" title="More"><span class="material-symbols-rounded" style="font-size:18px;">more_horiz</span></button>
          </div>
          <div class="product-card-meta">
            <div class="product-card-pills">
              <span class="pill ${r.cls}"><span class="dot" style="background:${r.dot};"></span>${r.label}</span>
              <span class="pill ${v.cls}"><span class="material-symbols-rounded" style="font-size:13px;">${v.icon}</span>${v.label}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);">${p.updated}</div>
          </div>
        </div>`;
      }).join('');
      $$('.product-card', grid).forEach(card => {
        card.addEventListener('click', () => openProductDetail(PRODUCTS[+card.dataset.productIdx], card.dataset.upc));
      });

      // Brands list
      $('#brandsList').innerHTML = BRANDS.map(b => `
        <div class="list-row">
          <div class="list-thumb" style="background:color-mix(in srgb, ${b.color} 14%, transparent);color:${b.color};">
            <span class="material-symbols-rounded">storefront</span>
          </div>
          <div class="list-body">
            <div class="list-title">${b.name}</div>
            <div class="list-sub">${b.upc} UPCs · avg risk ${b.risk}%</div>
          </div>
          <div class="list-value" style="color:${b.color};">${Math.round(b.upc/1248*100)}%</div>
        </div>
      `).join('');
    }

    // ========== INGREDIENTS MODULE ==========
    const INGREDIENT_FULL = [
      { name:'Carrageenan',                cat:'Emulsifier', risk:'risk', upcs:142, suppliers:4, last:'2h ago' },
      { name:'Polysorbate-80',             cat:'Emulsifier', risk:'risk', upcs:118, suppliers:3, last:'3h ago' },
      { name:'High-Fructose Corn Syrup',   cat:'Sweetener',  risk:'warn', upcs:96,  suppliers:6, last:'5h ago' },
      { name:'Sodium Benzoate',            cat:'Preservative', risk:'warn', upcs:74, suppliers:4, last:'Yesterday' },
      { name:'Mono- & Diglycerides',       cat:'Emulsifier', risk:'warn', upcs:62, suppliers:5, last:'Yesterday' },
      { name:'Natural Flavors',            cat:'Flavor',     risk:'info', upcs:48, suppliers:8, last:'2d ago' },
      { name:'Red 40',                     cat:'Color',      risk:'risk', upcs:32, suppliers:2, last:'3d ago' },
      { name:'Soy Lecithin',               cat:'Emulsifier', risk:'ok',   upcs:84, suppliers:5, last:'4d ago' },
      { name:'Citric Acid (E330)',         cat:'Acidifier',  risk:'ok',   upcs:312, suppliers:9, last:'1w ago' },
      { name:'Maltodextrin',               cat:'Bulking',    risk:'warn', upcs:88, suppliers:4, last:'1w ago' },
    ];

    function renderIngredientsModule(){
      $('#moduleContent').innerHTML = `
        <div class="kpi-grid">
          ${kpiCardHtml({label:'Tracked Ingredients', value:'9,420', delta:'▲ 142', deltaDir:'up', icon:'science',   color:'var(--ter-amber)', sparkId:'i-sp-1', delay:.05})}
          ${kpiCardHtml({label:'Flagged This Month',   value:'214',   delta:'▲ 18',  deltaDir:'down', icon:'warning', color:'var(--sec-red)',   sparkId:'i-sp-2', delay:.1})}
          ${kpiCardHtml({label:'High Risk',            value:'48',    delta:'▲ 6',   deltaDir:'down', icon:'priority_high', color:'var(--ter-violet)', sparkId:'i-sp-3', delay:.15})}
          ${kpiCardHtml({label:'New Discoveries',      value:'12',    delta:'▲ 4',   deltaDir:'up', icon:'auto_awesome', color:'var(--ter-cyan)', sparkId:'i-sp-4', delay:.2})}
        </div>

        ${insightCardHtml({
          eyebrow:'AI Intelligence · 92% confidence',
          headline:'Three emulsifier ingredients drive 64% of high-risk flags.',
          text:'Carrageenan, polysorbate-80, and mono- &amp; diglycerides repeatedly co-occur in flagged UPCs across beverages and snacks. Consider sourcing verified equivalents from your approved suppliers.',
          chips:[
            {icon:'science',text:'3 ingredients',cls:'chip-ai'},
            {icon:'inventory_2',text:'322 UPCs affected',action:'view-upcs'},
            {icon:'arrow_forward',text:'View substitution plan',cls:'chip-primary',action:'review-substitutes'},
          ]
        })}

        <div class="grid-2 fade-up" style="animation-delay:.3s;">
          ${panelHtml({icon:'bar_chart', color:'var(--ter-amber)', title:'Top Flagged Ingredients', sub:'By UPC count',
            body:`<div class="chart-wrap lg"><canvas id="chart-ing-flags"></canvas></div>`})}
          ${panelHtml({icon:'donut_small', color:'var(--ter-violet)', title:'Ingredient Categories', sub:'Flag distribution',
            body:`<div class="chart-wrap lg"><canvas id="chart-ing-cats"></canvas></div>`})}
        </div>

        ${panelHtml({icon:'list_alt', color:'var(--ter-amber)', title:'Ingredient Catalog', sub:`${INGREDIENT_FULL.length} ingredients · sorted by UPC impact`,
          headerRight:`<button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" data-action="filter"><span class="material-symbols-rounded" style="font-size:16px;">tune</span>Filter</button>`,
          body:`<div class="data-table-wrap"><table class="data-table">
            <thead><tr><th>Ingredient</th><th>Category</th><th>Risk</th><th>UPCs Affected</th><th>Suppliers</th><th>Last Flagged</th></tr></thead>
            <tbody id="ingredientTbody"></tbody>
          </table></div>`})}
      `;

      buildSparkline($('#i-sp-1'), 'up', 'amber');
      buildSparkline($('#i-sp-2'), 'up', 'red');
      buildSparkline($('#i-sp-3'), 'wave', 'violet');
      buildSparkline($('#i-sp-4'), 'up', 'cyan');

      const ctx1 = $('#chart-ing-flags').getContext('2d');
      const labels = INGREDIENT_FULL.slice(0,7).map(i => i.name);
      const values = INGREDIENT_FULL.slice(0,7).map(i => i.upcs);
      STATE.charts.iFlags = new Chart(ctx1, {
        type: 'bar',
        data: { labels, datasets: [{ label:'UPCs', data: values, backgroundColor: colorVar('--ter-amber'), borderRadius:6 }] },
        options: { ...chartBase(), indexAxis:'y',
          plugins: { legend:{display:false}, tooltip: tooltipStyle() },
          scales: { x:{ grid:{color:colorVar('--grid')}, ticks:{font:{size:11}} }, y:{ grid:{display:false}, ticks:{font:{size:11}} } } }
      });
      applyThemeColors(STATE.charts.iFlags);

      const ctx2 = $('#chart-ing-cats').getContext('2d');
      STATE.charts.iCats = new Chart(ctx2, {
        type: 'doughnut',
        data: { labels:['Emulsifiers','Sweeteners','Preservatives','Colors','Flavors','Other'], datasets:[{
          data:[68, 42, 38, 24, 18, 24],
          backgroundColor:[colorVar('--primary'), colorVar('--ter-amber'), colorVar('--ter-violet'), colorVar('--sec-red'), colorVar('--ter-cyan'), colorVar('--sec-green')],
          borderColor: colorVar('--surface'), borderWidth:4, hoverOffset:8 }]
        },
        options: { responsive:true, maintainAspectRatio:false, cutout:'64%',
          plugins:{ legend:{ position:'bottom', labels:{ usePointStyle:true, padding:12, boxWidth:8, font:{size:11.5} } }, tooltip: tooltipStyle() } }
      });
      applyThemeColors(STATE.charts.iCats);

      const RISK_LABELS = { risk:{label:'High',color:'var(--sec-red)',cls:'status-risk'}, warn:{label:'Medium',color:'var(--ter-amber)',cls:'status-warn'}, ok:{label:'Low',color:'var(--sec-green)',cls:'status-ok'}, info:{label:'Info',color:'var(--ter-cyan)',cls:'status-info'} };
      $('#ingredientTbody').innerHTML = INGREDIENT_FULL.map((i, idx) => {
        const r = RISK_LABELS[i.risk];
        return `<tr data-ing-idx="${idx}">
          <td><div style="display:flex;align-items:center;gap:10px;"><div class="table-thumb"><span class="material-symbols-rounded ms-fill" style="font-size:18px;color:${r.color};">science</span></div><div style="font-weight:600;">${i.name}</div></div></td>
          <td style="color:var(--text-muted);">${i.cat}</td>
          <td><span class="pill ${r.cls}"><span class="dot" style="background:${r.color};"></span>${r.label}</span></td>
          <td style="font-variant-numeric:tabular-nums;">${i.upcs}</td>
          <td style="color:var(--text-muted);">${i.suppliers}</td>
          <td style="color:var(--text-muted);font-size:12px;">${i.last}</td>
        </tr>`;
      }).join('');
      $$('#ingredientTbody tr').forEach(tr => {
        tr.addEventListener('click', () => {
          const i = INGREDIENT_FULL[+tr.dataset.ingIdx];
          const r = RISK_LABELS[i.risk];
          openDetail({
            eyebrow:`Ingredient · ${i.cat}`,
            title:i.name,
            sub:`${i.upcs} UPCs affected · ${i.suppliers} suppliers`,
            icon:'science', accent:r.color,
            body:`
              <div class="detail-section">
                <div class="detail-section-title">Overview</div>
                <div class="detail-meta-grid">
                  <div class="detail-meta"><div class="detail-meta-label">Risk</div><div class="detail-meta-value"><span class="pill ${r.cls}"><span class="dot" style="background:${r.color};"></span>${r.label}</span></div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Category</div><div class="detail-meta-value">${i.cat}</div></div>
                  <div class="detail-meta"><div class="detail-meta-label">UPCs Affected</div><div class="detail-meta-value">${i.upcs}</div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Suppliers</div><div class="detail-meta-value">${i.suppliers}</div></div>
                </div>
              </div>
              <div class="detail-section">
                <div class="detail-section-title">AI Recommendation</div>
                <div class="insight-card" style="margin:0;">
                  <div class="insight-icon"><span class="material-symbols-rounded">auto_awesome</span></div>
                  <div class="insight-body">
                    <div class="insight-eyebrow">87% confidence</div>
                    <div class="insight-headline">Substitute candidates identified.</div>
                    <div class="insight-text">Two verified suppliers stock approved alternatives. Estimated portfolio risk reduction: ~3 points across affected UPCs.</div>
                  </div>
                </div>
              </div>`
          });
        });
      });
    }

    // ========== PROCESSING MODULE ==========
    function renderProcessingModule(){
      $('#moduleContent').innerHTML = `
        <div class="kpi-grid">
          ${kpiCardHtml({label:'Avg Processing Score', value:'68',   delta:'▲ 4',  deltaDir:'down', icon:'precision_manufacturing', color:'var(--sec-red)', sparkId:'pr-sp-1', delay:.05})}
          ${kpiCardHtml({label:'High Severity UPCs',   value:'92',   delta:'▲ 12', deltaDir:'down', icon:'warning',                 color:'var(--ter-amber)', sparkId:'pr-sp-2', delay:.1})}
          ${kpiCardHtml({label:'Avg Additive Load',    value:'7.2',  delta:'▲ 0.6', deltaDir:'down', icon:'colorize',                color:'var(--ter-violet)', sparkId:'pr-sp-3', delay:.15})}
          ${kpiCardHtml({label:'Markers Flagged',      value:'214',  delta:'▲ 18',  deltaDir:'down', icon:'flag',                    color:'var(--ter-cyan)', sparkId:'pr-sp-4', delay:.2})}
        </div>

        ${insightCardHtml({
          eyebrow:'AI Intelligence · 89% confidence',
          headline:'Processing severity rising in snacks (+12% MoM).',
          text:'92 UPCs now cross the medium-to-high threshold, driven mainly by 4 additive groups. Recipe-level alternatives exist for 71 of these.',
          chips:[
            {icon:'precision_manufacturing',text:'92 flags',cls:'chip-ai'},
            {icon:'arrow_forward',text:'Show alternatives',cls:'chip-primary',action:'review-substitutes'},
          ]
        })}

        <div class="grid-2 fade-up" style="animation-delay:.3s;">
          ${panelHtml({icon:'bar_chart', color:'var(--sec-red)', title:'Severity Distribution', sub:'By category',
            body:`<div class="chart-wrap lg"><canvas id="chart-proc-severity"></canvas></div>`})}
          ${panelHtml({icon:'radar', color:'var(--ter-violet)', title:'Processing Markers', sub:'Atlas Foods vs. category',
            body:`<div class="chart-wrap lg"><canvas id="chart-proc-markers"></canvas></div>`})}
        </div>

        ${panelHtml({icon:'science', color:'var(--ter-violet)', title:'Additive Groups', sub:'Recurrence across portfolio',
          body:`<div id="additiveGroups"></div>`})}

        ${panelHtml({icon:'restaurant_menu', color:'var(--sec-green)', title:'Recipe Alternatives', sub:'AI-recommended substitutions',
          body:`<div id="recipeAlternatives"></div>`})}
      `;

      buildSparkline($('#pr-sp-1'), 'up', 'red');
      buildSparkline($('#pr-sp-2'), 'up', 'amber');
      buildSparkline($('#pr-sp-3'), 'up', 'violet');
      buildSparkline($('#pr-sp-4'), 'up', 'cyan');

      const ctx1 = $('#chart-proc-severity').getContext('2d');
      STATE.charts.procSev = new Chart(ctx1, {
        type:'bar',
        data:{ labels:['Beverage','Snack','Pasta','Spreads','Cereal','Dairy'], datasets:[
          { label:'Low',    data:[88, 74, 142, 58, 38, 72], backgroundColor: colorVar('--sec-green'), borderRadius:6, stack:'s' },
          { label:'Medium', data:[58, 62, 28,  32, 28, 30], backgroundColor: colorVar('--ter-amber'), borderRadius:6, stack:'s' },
          { label:'High',   data:[38, 26,  4,  10, 12,  8], backgroundColor: colorVar('--sec-red'),   borderRadius:6, stack:'s' },
        ]},
        options:{ ...chartBase(),
          scales:{ x:{ stacked:true, grid:{display:false}, ticks:{font:{size:11}} }, y:{ stacked:true, grid:{color:colorVar('--grid')}, ticks:{font:{size:11}} } },
          plugins:{ legend:{position:'bottom', labels:{usePointStyle:true,padding:12,boxWidth:8,font:{size:11}}}, tooltip:tooltipStyle() } }
      });
      applyThemeColors(STATE.charts.procSev);

      const ctx2 = $('#chart-proc-markers').getContext('2d');
      STATE.charts.procMark = new Chart(ctx2, {
        type:'radar',
        data:{ labels:['Additives','Emulsifiers','Sweeteners','Preservatives','Colors','Markers'], datasets:[
          { label:'Atlas Foods', data:[74, 82, 68, 60, 48, 72], borderColor: colorVar('--sec-red'), backgroundColor: colorWithAlpha(colorVar('--sec-red'),0.18), borderWidth:2, pointRadius:3, pointBackgroundColor: colorVar('--sec-red') },
          { label:'Category avg', data:[62, 68, 58, 56, 42, 60], borderColor: colorVar('--ter-violet'), backgroundColor: colorWithAlpha(colorVar('--ter-violet'),0.10), borderWidth:2, pointRadius:0, borderDash:[5,3] },
        ]},
        options:{ responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{position:'bottom', labels:{usePointStyle:true,padding:12,boxWidth:8,font:{size:11}}}, tooltip:tooltipStyle() },
          scales:{ r:{ grid:{color:colorVar('--grid')}, angleLines:{color:colorVar('--grid')}, pointLabels:{color:colorVar('--text-muted'),font:{size:11}}, ticks:{display:false,stepSize:20}, suggestedMin:0, suggestedMax:100 } } }
      });
      applyThemeColors(STATE.charts.procMark);

      const ADDITIVES = [
        { name:'Emulsifier group A', desc:'Carrageenan, polysorbate-80', pct:84, cls:'risk' },
        { name:'Sweetener group B',  desc:'HFCS, aspartame, sucralose',  pct:62, cls:'warn' },
        { name:'Preservative group C', desc:'Sodium benzoate, BHA, BHT', pct:48, cls:'warn' },
        { name:'Color group D', desc:'Red 40, Yellow 5, Blue 1', pct:32, cls:'risk' },
        { name:'Acidifier group E', desc:'Citric acid, phosphoric acid', pct:24, cls:'ok' },
      ];
      $('#additiveGroups').innerHTML = ADDITIVES.map(a => `
        <div class="bar-row">
          <div class="bar-row-top">
            <div class="bar-name"><span class="dot" style="background:${a.cls==='risk'?'var(--sec-red)':a.cls==='warn'?'var(--ter-amber)':'var(--sec-green)'};"></span>${a.name}<span style="font-size:11px;color:var(--text-muted);font-weight:400;">· ${a.desc}</span></div>
            <div class="bar-value">${a.pct}% portfolio</div>
          </div>
          <div class="bar-track"><div class="bar-fill ${a.cls}" data-target="${a.pct}"></div></div>
        </div>
      `).join('');
      requestAnimationFrame(() => { $$('#additiveGroups .bar-fill').forEach(el => { el.style.width = el.dataset.target + '%'; }); });

      const ALTS = [
        { from:'Carrageenan', to:'Gellan gum', impact:'-14 pts risk', conf:94 },
        { from:'Polysorbate-80', to:'Sunflower lecithin', impact:'-11 pts risk', conf:88 },
        { from:'HFCS', to:'Cane sugar (verified)', impact:'-8 pts risk', conf:82 },
        { from:'Red 40', to:'Beet juice extract', impact:'-9 pts risk', conf:76 },
      ];
      $('#recipeAlternatives').innerHTML = ALTS.map(a => `
        <div class="list-row">
          <div class="list-thumb" style="background:var(--sec-green-10);color:var(--sec-green);"><span class="material-symbols-rounded">swap_horiz</span></div>
          <div class="list-body">
            <div class="list-title">${a.from} → ${a.to}</div>
            <div class="list-sub">${a.impact} · ${a.conf}% confidence</div>
          </div>
          <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" data-action="review-substitutes"><span class="material-symbols-rounded" style="font-size:16px;">arrow_forward</span></button>
        </div>
      `).join('');
    }

    // ========== VERIFICATION MODULE ==========
    const VERIF_FULL = {
      ready: [
        { title:'Citrus Sparkle Soda', meta:'Atlas Foods · 18 UPCs', due:'May 15' },
        { title:'Crisp Multigrain Bundle', meta:'Northgate · 12 UPCs', due:'May 16' },
        { title:'Wholewheat Pasta line', meta:'Verdant Mills · 9 UPCs', due:'May 18' },
        { title:'Cold-Pressed Juice', meta:'Bright Co. · 8 UPCs', due:'May 20' },
      ],
      review: [
        { title:'Berry Granola Mix', meta:'Atlas Foods · 6 UPCs', due:'May 13' },
        { title:'Almond Butter Spread', meta:'Helios Co. · 4 UPCs', due:'May 14' },
        { title:'Cereal Variety Pack', meta:'Northgate · 3 UPCs', due:'May 14' },
      ],
      missing: [
        { title:'Cold-Pressed Juice (extended)', meta:'Bright Co. · supplier docs', due:'Overdue 2d' },
        { title:'Veggie Crackers Bundle', meta:'Atlas Foods · COA missing', due:'Overdue 1d' },
      ],
      risk: [
        { title:'Citrus Sparkle high-risk claim', meta:'Atlas Foods · counsel review', due:'May 13' },
        { title:'Granola health claims', meta:'Atlas Foods · counsel review', due:'May 15' },
      ],
    };

    function renderVerificationModule(){
      $('#moduleContent').innerHTML = `
        <div class="kpi-grid">
          ${kpiCardHtml({label:'Queue Total',     value:'38',  delta:'▲ 12', deltaDir:'up', icon:'checklist', color:'var(--primary)',   sparkId:'v-sp-1', delay:.05})}
          ${kpiCardHtml({label:'Ready',           value:'847', delta:'▲ 64', deltaDir:'up', icon:'check', color:'var(--sec-green)', sparkId:'v-sp-2', delay:.1})}
          ${kpiCardHtml({label:'Review Needed',   value:'24',  delta:'▲ 4',  deltaDir:'down', icon:'hourglass_top', color:'var(--ter-amber)', sparkId:'v-sp-3', delay:.15})}
          ${kpiCardHtml({label:'Missing Docs',    value:'12',  delta:'▼ 3',  deltaDir:'up', icon:'error',     color:'var(--sec-red)',   sparkId:'v-sp-4', delay:.2})}
        </div>

        <div class="grid-2 fade-up" style="animation-delay:.25s;">
          ${panelHtml({icon:'bar_chart', color:'var(--primary)', title:'Weekly Throughput', sub:'8-week trend',
            body:`<div class="chart-wrap"><canvas id="chart-verif-throughput"></canvas></div>`})}
          ${panelHtml({icon:'event', color:'var(--ter-violet)', title:'Cycle Activity', sub:'Recent verification events',
            body:`<div class="timeline">
              <div class="timeline-item green"><div class="timeline-time">2h ago</div><div class="timeline-title">Citrus Sparkle Soda · approved</div><div class="timeline-sub">Reviewed by Maya Chen</div></div>
              <div class="timeline-item amber"><div class="timeline-time">4h ago</div><div class="timeline-title">Berry Granola · review requested</div><div class="timeline-sub">Awaiting supplier response</div></div>
              <div class="timeline-item red"><div class="timeline-time">Yesterday</div><div class="timeline-title">Veggie Crackers Bundle · COA missing</div><div class="timeline-sub">Escalated to compliance</div></div>
              <div class="timeline-item violet"><div class="timeline-time">2d ago</div><div class="timeline-title">12 UPCs auto-queued by WISE</div><div class="timeline-sub">High-confidence candidates identified</div></div>
              <div class="timeline-item"><div class="timeline-time">3d ago</div><div class="timeline-title">Q2 cycle opened</div><div class="timeline-sub">847 UPCs in scope</div></div>
            </div>`})}
        </div>

        ${panelHtml({icon:'view_kanban', color:'var(--primary)', title:'Verification Board', sub:'Drag to advance (demo)',
          headerRight:`<button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" data-action="filter"><span class="material-symbols-rounded" style="font-size:16px;">tune</span>Filter</button>`,
          body:`<div class="kanban-grid">
            ${renderKanbanCol('ready','Ready','check','var(--sec-green)',VERIF_FULL.ready)}
            ${renderKanbanCol('review','Review','hourglass_top','var(--ter-amber)',VERIF_FULL.review)}
            ${renderKanbanCol('missing','Missing','error','var(--sec-red)',VERIF_FULL.missing)}
            ${renderKanbanCol('risk','High Risk','priority_high','var(--ter-violet)',VERIF_FULL.risk)}
          </div>`})}
      `;

      wireKanbanClicks();

      buildSparkline($('#v-sp-1'), 'up', 'primary');
      buildSparkline($('#v-sp-2'), 'up', 'green');
      buildSparkline($('#v-sp-3'), 'wave', 'amber');
      buildSparkline($('#v-sp-4'), 'down', 'red');

      const ctx = $('#chart-verif-throughput').getContext('2d');
      STATE.charts.vThrough = new Chart(ctx, {
        type:'bar',
        data:{ labels:['W1','W2','W3','W4','W5','W6','W7','W8'], datasets:[
          { label:'Approved', data:[42,48,52,58,62,68,72,78], backgroundColor: colorVar('--sec-green'), borderRadius:6, stack:'s' },
          { label:'Review',   data:[18,22,18,24,22,20,24,28], backgroundColor: colorVar('--ter-amber'), borderRadius:6, stack:'s' },
          { label:'Rejected', data:[ 4, 3, 5, 4, 6, 5, 4, 3], backgroundColor: colorVar('--sec-red'),   borderRadius:6, stack:'s' },
        ]},
        options:{ ...chartBase(),
          scales:{ x:{stacked:true,grid:{display:false}}, y:{stacked:true,grid:{color:colorVar('--grid')}} },
          plugins:{ legend:{position:'bottom',labels:{usePointStyle:true,padding:12,boxWidth:8,font:{size:11}}}, tooltip:tooltipStyle() } }
      });
      applyThemeColors(STATE.charts.vThrough);
    }

    function renderKanbanCol(id, label, icon, color, items){
      return `<div class="surface kanban-col">
        <div class="kanban-col-header">
          <div class="kanban-col-title"><span class="material-symbols-rounded ms-fill" style="font-size:16px;color:${color};">${icon}</span>${label}</div>
          <span class="kanban-col-count">${items.length}</span>
        </div>
        ${items.map((it, idx) => `
          <div class="kanban-card" data-kanban-col="${id}" data-kanban-idx="${idx}">
            <div class="kanban-card-title">${it.title}</div>
            <div class="kanban-card-meta">${it.meta}</div>
            <div class="kanban-card-footer">
              <span class="pill" style="color:${color};background:color-mix(in srgb, ${color} 14%, transparent);"><span class="material-symbols-rounded" style="font-size:13px;">schedule</span>${it.due}</span>
              <span class="material-symbols-rounded" style="font-size:18px;color:var(--text-muted);">drag_indicator</span>
            </div>
          </div>
        `).join('')}
        <div class="kanban-add" data-action="add-kanban" data-col="${id}"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">add</span> Add item</div>
      </div>`;
    }
    function wireKanbanClicks(){
      const COL_META = {
        ready:   { color:'var(--sec-green)', icon:'check',   label:'Ready' },
        review:  { color:'var(--ter-amber)', icon:'hourglass_top',  label:'Review' },
        missing: { color:'var(--sec-red)',   icon:'error',          label:'Missing' },
        risk:    { color:'var(--ter-violet)', icon:'priority_high', label:'High Risk' },
      };
      $$('.kanban-card').forEach(card => {
        card.addEventListener('click', () => {
          const col = card.dataset.kanbanCol;
          const idx = +card.dataset.kanbanIdx;
          const item = VERIF_FULL[col][idx];
          const meta = COL_META[col];
          openDetail({
            eyebrow:`Verification · ${meta.label}`,
            title: item.title,
            sub: item.meta,
            icon: meta.icon,
            accent: meta.color,
            body: `
              <div class="detail-section">
                <div class="detail-section-title">Status</div>
                <div class="detail-meta-grid">
                  <div class="detail-meta"><div class="detail-meta-label">State</div><div class="detail-meta-value"><span class="pill" style="color:${meta.color};background:color-mix(in srgb, ${meta.color} 14%, transparent);"><span class="material-symbols-rounded" style="font-size:14px;">${meta.icon}</span>${meta.label}</span></div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Due</div><div class="detail-meta-value" style="font-size:14px;">${item.due}</div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Reviewer</div><div class="detail-meta-value" style="font-size:14px;">Maya Chen</div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Cycle</div><div class="detail-meta-value" style="font-size:14px;">Q2 · 2026</div></div>
                </div>
              </div>
              <div class="detail-section">
                <div class="detail-section-title">Checklist</div>
                ${['Ingredient documentation verified','Supplier certifications uploaded','Processing claim substantiated','Labeling reviewed by counsel'].map((c, i) => `
                  <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
                    <span class="material-symbols-rounded ms-fill" style="font-size:18px;color:${i<2?'var(--sec-green)':'var(--text-subtle)'};">${i<2?'check':'radio_button_unchecked'}</span>
                    <span style="${i>=2?'color:var(--text-muted);':''}">${c}</span>
                  </div>
                `).join('')}
              </div>`
          });
        });
      });
    }

    // ========== COMPLIANCE MODULE ==========
    const CLAIMS = [
      { name:'Citrus Sparkle Soda · "low calorie" claim', type:'Nutritional', jur:'US-FDA', status:'review', counsel:'A. Park', due:'May 15' },
      { name:'Berry Granola · "high in fiber" claim', type:'Nutritional', jur:'EU', status:'review', counsel:'M. Singh', due:'May 17' },
      { name:'Cold-Pressed Juice · organic certification', type:'Certification', jur:'USDA', status:'docs', counsel:'A. Park', due:'May 14' },
      { name:'Wholewheat Pasta · "no artificial" claim', type:'Marketing', jur:'US-FTC', status:'cleared', counsel:'L. Rivera', due:'—' },
      { name:'Almond Butter · "natural" claim review', type:'Marketing', jur:'CA-CFIA', status:'review', counsel:'M. Singh', due:'May 19' },
      { name:'Veggie Crackers · allergen labeling', type:'Allergen', jur:'EU', status:'cleared', counsel:'L. Rivera', due:'—' },
      { name:'Granola health claim · escalated', type:'Health', jur:'US-FDA', status:'escalated', counsel:'A. Park', due:'May 13' },
    ];
    const CLAIM_STATUS = {
      review:    { label:'In Review',  color:'var(--ter-amber)', cls:'status-warn' },
      docs:      { label:'Docs Needed', color:'var(--ter-cyan)',  cls:'status-info' },
      cleared:   { label:'Cleared',    color:'var(--sec-green)', cls:'status-ok' },
      escalated: { label:'Escalated',  color:'var(--sec-red)',   cls:'status-risk' },
    };

    function renderComplianceModule(){
      $('#moduleContent').innerHTML = `
        <div class="kpi-grid">
          ${kpiCardHtml({label:'Open Claims',         value:'24',  delta:'▲ 6',  deltaDir:'down', icon:'gavel',     color:'var(--ter-amber)', sparkId:'c-sp-1', delay:.05})}
          ${kpiCardHtml({label:'In Review',           value:'14',  delta:'▲ 2',  deltaDir:'down', icon:'hourglass_top', color:'var(--ter-violet)', sparkId:'c-sp-2', delay:.1})}
          ${kpiCardHtml({label:'Resolved (30d)',      value:'58',  delta:'▲ 12', deltaDir:'up', icon:'check', color:'var(--sec-green)', sparkId:'c-sp-3', delay:.15})}
          ${kpiCardHtml({label:'Avg Resolution',      value:'4.2d', delta:'▼ 0.6d', deltaDir:'up', icon:'schedule',   color:'var(--ter-cyan)',  sparkId:'c-sp-4', delay:.2})}
        </div>

        <div class="grid-2 fade-up" style="animation-delay:.25s;">
          ${panelHtml({icon:'show_chart', color:'var(--ter-amber)', title:'Claims Resolution Trend', sub:'Last 8 weeks',
            body:`<div class="chart-wrap"><canvas id="chart-claims-trend"></canvas></div>`})}
          ${panelHtml({icon:'public', color:'var(--ter-cyan)', title:'Jurisdictions', sub:'Open claims by region',
            body:`<div class="chart-wrap"><canvas id="chart-jurisdictions"></canvas></div>`})}
        </div>

        ${panelHtml({icon:'gavel', color:'var(--ter-amber)', title:'Open Claims', sub:`${CLAIMS.length} total · sorted by due date`,
          headerRight:`<button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" data-action="filter"><span class="material-symbols-rounded" style="font-size:16px;">tune</span>Filter</button>`,
          body:`<div class="data-table-wrap"><table class="data-table">
            <thead><tr><th>Claim</th><th>Type</th><th>Jurisdiction</th><th>Status</th><th>Counsel</th><th>Due</th></tr></thead>
            <tbody id="claimsTbody">${CLAIMS.map((c, idx) => {
              const s = CLAIM_STATUS[c.status];
              return `<tr data-claim-idx="${idx}">
                <td><div style="display:flex;align-items:center;gap:10px;"><div class="table-thumb"><span class="material-symbols-rounded ms-fill" style="font-size:18px;color:${s.color};">gavel</span></div><div style="font-weight:600;">${c.name}</div></div></td>
                <td style="color:var(--text-muted);">${c.type}</td>
                <td style="color:var(--text-muted);">${c.jur}</td>
                <td><span class="pill ${s.cls}"><span class="dot" style="background:${s.color};"></span>${s.label}</span></td>
                <td style="color:var(--text-muted);">${c.counsel}</td>
                <td style="color:var(--text-muted);font-size:12px;">${c.due}</td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>`})}
      `;

      $$('#claimsTbody tr').forEach(tr => {
        tr.addEventListener('click', () => {
          const c = CLAIMS[+tr.dataset.claimIdx];
          const s = CLAIM_STATUS[c.status];
          openDetail({
            eyebrow:`Compliance · ${c.type}`,
            title:c.name, sub:`${c.jur} · counsel: ${c.counsel}`,
            icon:'gavel', accent:s.color,
            body:`
              <div class="detail-section">
                <div class="detail-section-title">Claim Details</div>
                <div class="detail-meta-grid">
                  <div class="detail-meta"><div class="detail-meta-label">Status</div><div class="detail-meta-value"><span class="pill ${s.cls}"><span class="dot" style="background:${s.color};"></span>${s.label}</span></div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Type</div><div class="detail-meta-value" style="font-size:14px;">${c.type}</div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Jurisdiction</div><div class="detail-meta-value" style="font-size:14px;">${c.jur}</div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Due</div><div class="detail-meta-value" style="font-size:14px;">${c.due}</div></div>
                </div>
              </div>
              <div class="detail-section">
                <div class="detail-section-title">Activity</div>
                <div class="timeline">
                  <div class="timeline-item violet"><div class="timeline-time">Today</div><div class="timeline-title">${c.counsel} added comments</div><div class="timeline-sub">Awaiting supplier response on substantiation</div></div>
                  <div class="timeline-item amber"><div class="timeline-time">Yesterday</div><div class="timeline-title">Documentation request sent</div><div class="timeline-sub">Auto-generated by WISE</div></div>
                  <div class="timeline-item green"><div class="timeline-time">3 days ago</div><div class="timeline-title">Claim opened</div><div class="timeline-sub">Triaged into ${c.jur} workstream</div></div>
                </div>
              </div>`
          });
        });
      });

      buildSparkline($('#c-sp-1'), 'up', 'amber');
      buildSparkline($('#c-sp-2'), 'wave', 'violet');
      buildSparkline($('#c-sp-3'), 'up', 'green');
      buildSparkline($('#c-sp-4'), 'down', 'cyan');

      const ctx1 = $('#chart-claims-trend').getContext('2d');
      const amber = colorVar('--ter-amber');
      const grad = ctx1.createLinearGradient(0,0,0,200);
      grad.addColorStop(0, colorWithAlpha(amber, 0.4));
      grad.addColorStop(1, colorWithAlpha(amber, 0));
      STATE.charts.cTrend = new Chart(ctx1, {
        type:'line',
        data:{ labels:['W1','W2','W3','W4','W5','W6','W7','W8'], datasets:[{ label:'Resolved', data:[12,16,14,22,18,26,24,30], borderColor: amber, backgroundColor: grad, tension:.4, fill:true, borderWidth:2.4, pointRadius:0 }] },
        options: chartBase()
      });
      applyThemeColors(STATE.charts.cTrend);

      const ctx2 = $('#chart-jurisdictions').getContext('2d');
      STATE.charts.cJur = new Chart(ctx2, {
        type:'doughnut',
        data:{ labels:['US-FDA','EU','USDA','US-FTC','CA-CFIA','Other'], datasets:[{
          data:[10, 6, 3, 2, 2, 1],
          backgroundColor:[colorVar('--primary'), colorVar('--ter-violet'), colorVar('--sec-green'), colorVar('--ter-cyan'), colorVar('--ter-amber'), colorVar('--sec-red')],
          borderColor: colorVar('--surface'), borderWidth:4, hoverOffset:8 }]
        },
        options:{ responsive:true, maintainAspectRatio:false, cutout:'64%',
          plugins:{ legend:{position:'bottom', labels:{usePointStyle:true,padding:12,boxWidth:8,font:{size:11}}}, tooltip:tooltipStyle() } }
      });
      applyThemeColors(STATE.charts.cJur);
    }

    // ========== INSIGHTS MODULE ==========
    const INSIGHTS = [
      { icon:'science', conf:96, headline:'Emulsifier cluster drives 38% of high-risk UPCs', text:'Three ingredients co-occur in flagged UPCs. Substitute supplier batch identified.', tag:'Ingredient', action:'review-substitutes' },
      { icon:'factory', conf:91, headline:'Nordmark documentation lag impacts 32 UPCs', text:'Stale certifications block downstream verification for beverages. Recommend follow-up batch.', tag:'Supplier', action:'view-clusters' },
      { icon:'precision_manufacturing', conf:89, headline:'Snack processing severity rising 12% MoM', text:'Recipe-level alternatives exist for 71 UPCs. Estimated risk reduction: 8 points.', tag:'Processing', action:'review-substitutes' },
      { icon:'leaderboard', conf:88, headline:'Atlas leads category on verification readiness', text:'+18 points vs. category average. Strong position for retailer partnerships.', tag:'Competitive', action:'view-upcs' },
      { icon:'gavel', conf:84, headline:'EU jurisdiction claims slowing resolution time', text:'6 open claims clustering in EU labeling. Counsel engagement recommended.', tag:'Compliance', action:'view-verification' },
      { icon:'storefront', conf:82, headline:'Wholewheat Pasta drives growth in low-risk band', text:'14% YoY · highest verification rate across portfolio (96%).', tag:'Brand', action:'view-upcs' },
    ];

    function renderInsightsModule(){
      const featured = INSIGHTS[0];
      $('#moduleContent').innerHTML = `
        <div class="kpi-grid">
          ${kpiCardHtml({label:'Insights Generated', value:'142', delta:'▲ 18', deltaDir:'up', icon:'auto_awesome', color:'var(--ter-violet)', sparkId:'in-sp-1', delay:.05})}
          ${kpiCardHtml({label:'Acted On',           value:'58',  delta:'▲ 12', deltaDir:'up', icon:'task_alt',     color:'var(--sec-green)',  sparkId:'in-sp-2', delay:.1})}
          ${kpiCardHtml({label:'Avg Confidence',     value:'89%', delta:'▲ 2%', deltaDir:'up', icon:'verified',     color:'var(--primary)',    sparkId:'in-sp-3', delay:.15})}
          ${kpiCardHtml({label:'Trending Topics',    value:'8',   delta:'▲ 2',  deltaDir:'up', icon:'trending_up',  color:'var(--ter-cyan)',   sparkId:'in-sp-4', delay:.2})}
        </div>

        <div class="insight-card fade-up" style="animation-delay:.2s;">
          <div class="insight-icon"><span class="material-symbols-rounded">auto_awesome</span></div>
          <div class="insight-body">
            <div class="insight-eyebrow">Featured Insight · ${featured.conf}% confidence</div>
            <div class="insight-headline" style="font-size:18px;">${featured.headline}</div>
            <div class="insight-text">${featured.text}</div>
            <div class="insight-chips">
              <span class="chip chip-ai"><span class="material-symbols-rounded" style="font-size:14px;">auto_awesome</span>${featured.tag}</span>
              <span class="chip chip-primary" data-action="${featured.action}" style="cursor:pointer;"><span class="material-symbols-rounded" style="font-size:14px;">arrow_forward</span>Take action</span>
              <span class="chip" data-action="export" style="cursor:pointer;"><span class="material-symbols-rounded" style="font-size:14px;">download</span>Export</span>
            </div>
          </div>
        </div>

        <div class="insight-grid">
          ${INSIGHTS.slice(1).map(i => `
            <div class="surface panel card-hover" style="cursor:pointer;" data-action="${i.action}">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <div style="width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--ter-violet-10);color:var(--ter-violet);">
                  <span class="material-symbols-rounded ms-fill" style="font-size:20px;">${i.icon}</span>
                </div>
                <span class="pill chip-ai"><span class="material-symbols-rounded" style="font-size:13px;">verified</span>${i.conf}%</span>
                <span class="pill" style="margin-left:auto;background:var(--surface-2);color:var(--text-muted);">${i.tag}</span>
              </div>
              <div style="font-size:14px;font-weight:600;letter-spacing:-.01em;margin-bottom:6px;">${i.headline}</div>
              <div style="font-size:12.5px;color:var(--text-muted);line-height:1.55;">${i.text}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:14px;font-size:12px;color:var(--primary);font-weight:600;">
                <span class="material-symbols-rounded" style="font-size:14px;">arrow_forward</span>Take action
              </div>
            </div>
          `).join('')}
        </div>

        ${panelHtml({icon:'trending_up', color:'var(--ter-cyan)', title:'Trending Topics', sub:'AI-detected this week',
          body:`<div id="trendingTopics"></div>`})}
      `;

      buildSparkline($('#in-sp-1'), 'up', 'violet');
      buildSparkline($('#in-sp-2'), 'up', 'green');
      buildSparkline($('#in-sp-3'), 'wave', 'primary');
      buildSparkline($('#in-sp-4'), 'up', 'cyan');

      const TOPICS = [
        { name:'Emulsifier substitution', delta:'+24%', conf:96, color:'var(--primary)' },
        { name:'Supplier documentation', delta:'+18%', conf:91, color:'var(--ter-violet)' },
        { name:'EU labeling compliance', delta:'+12%', conf:84, color:'var(--ter-amber)' },
        { name:'Low-sodium reformulation', delta:'+9%',  conf:78, color:'var(--ter-cyan)' },
        { name:'Plant-based alternatives', delta:'+6%',  conf:82, color:'var(--sec-green)' },
      ];
      $('#trendingTopics').innerHTML = TOPICS.map(t => `
        <div class="list-row">
          <div class="list-thumb" style="background:color-mix(in srgb, ${t.color} 14%, transparent);color:${t.color};"><span class="material-symbols-rounded">trending_up</span></div>
          <div class="list-body">
            <div class="list-title">${t.name}</div>
            <div class="list-sub">Confidence ${t.conf}% · mentioned across portfolio context</div>
          </div>
          <div class="list-value" style="color:${t.color};">${t.delta}</div>
        </div>
      `).join('');
    }

    // ========== REPORTS MODULE ==========
    const REPORTS = [
      { title:'Q2 Portfolio Risk Brief',      author:'Maya Chen',  edited:'2h ago',  status:'draft',     tags:['risk','executive'] },
      { title:'Supplier Documentation Gap Analysis', author:'A. Park', edited:'Yesterday', status:'review', tags:['supplier','operations'] },
      { title:'Beverage Reformulation Roadmap', author:'L. Rivera', edited:'2d ago', status:'published', tags:['products','strategy'] },
      { title:'EU Labeling Compliance Summary', author:'M. Singh', edited:'3d ago', status:'published', tags:['compliance'] },
      { title:'Competitive Benchmark Q1',     author:'Maya Chen', edited:'1w ago', status:'published', tags:['competitive'] },
      { title:'Verification Cycle Retrospective', author:'A. Park', edited:'1w ago', status:'archived', tags:['verification'] },
      { title:'Ingredient Cluster Investigation', author:'WISE AI', edited:'2w ago', status:'published', tags:['ingredient','ai-generated'] },
      { title:'Annual Compliance Outlook',    author:'L. Rivera', edited:'1mo ago', status:'archived', tags:['compliance','annual'] },
    ];
    const REPORT_STATUS = {
      draft:     { label:'Draft',     color:'var(--ter-amber)' },
      review:    { label:'In Review', color:'var(--ter-violet)' },
      published: { label:'Published', color:'var(--sec-green)' },
      archived:  { label:'Archived',  color:'var(--text-subtle)' },
    };

    function renderReportsModule(){
      $('#moduleContent').innerHTML = `
        <div class="kpi-grid">
          ${kpiCardHtml({label:'Active Drafts',  value:'7',   delta:'▲ 2', deltaDir:'up', icon:'edit_note',    color:'var(--ter-amber)', sparkId:'r-sp-1', delay:.05})}
          ${kpiCardHtml({label:'Published (Q)', value:'142', delta:'▲ 18', deltaDir:'up', icon:'summarize',    color:'var(--sec-green)', sparkId:'r-sp-2', delay:.1})}
          ${kpiCardHtml({label:'Scheduled',     value:'4',   delta:'▲ 1', deltaDir:'up', icon:'schedule',     color:'var(--ter-cyan)',  sparkId:'r-sp-3', delay:.15})}
          ${kpiCardHtml({label:'Templates',     value:'18',  delta:'▲ 2', deltaDir:'up', icon:'description',  color:'var(--ter-violet)', sparkId:'r-sp-4', delay:.2})}
        </div>

        ${insightCardHtml({
          eyebrow:'AI Suggestion · 94% confidence',
          headline:'WISE drafted 3 report previews for your Friday review.',
          text:'Portfolio Risk Brief, Supplier Gap Analysis, and Verification Cycle Retrospective have been auto-drafted based on this week\'s data movement.',
          chips:[
            {icon:'auto_awesome',text:'AI drafted',cls:'chip-ai'},
            {icon:'arrow_forward',text:'Review drafts',cls:'chip-primary',action:'view-upcs'},
          ]
        })}

        <div class="grid-2 fade-up" style="animation-delay:.3s;">
          ${panelHtml({icon:'show_chart', color:'var(--primary)', title:'Report Activity', sub:'Drafts &amp; publishes per week',
            body:`<div class="chart-wrap"><canvas id="chart-report-activity"></canvas></div>`})}
          ${panelHtml({icon:'description', color:'var(--ter-violet)', title:'Templates', sub:'Most-used this quarter',
            body:`<div id="reportTemplates"></div>`})}
        </div>

        ${panelHtml({icon:'summarize', color:'var(--primary)', title:'All Reports', sub:`${REPORTS.length} total · filtered to recent`,
          headerRight:`<div style="display:flex;gap:6px;">
            <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" data-action="filter"><span class="material-symbols-rounded" style="font-size:16px;">tune</span>Filter</button>
            <button class="btn btn-primary" style="padding:6px 12px;font-size:12px;" data-action="new-report"><span class="material-symbols-rounded ms-fill" style="font-size:16px;">add</span>New Report</button>
          </div>`,
          body:`<div class="product-grid" id="reportsList">${REPORTS.map((r, idx) => {
            const s = REPORT_STATUS[r.status];
            return `<div class="surface report-card card-hover" data-report-idx="${idx}">
              <div class="report-thumb" style="background:color-mix(in srgb, ${s.color} 14%, transparent);color:${s.color};"><span class="material-symbols-rounded">summarize</span></div>
              <div class="report-meta">
                <div>
                  <div class="report-title">${r.title}</div>
                  <div class="report-sub">${r.author} · edited ${r.edited}</div>
                </div>
                <div class="report-tags">
                  <span class="pill" style="color:${s.color};background:color-mix(in srgb, ${s.color} 14%, transparent);"><span class="dot" style="background:${s.color};"></span>${s.label}</span>
                  ${r.tags.map(t => `<span class="chip" style="font-size:10px;padding:2px 7px;">${t}</span>`).join('')}
                </div>
              </div>
            </div>`;
          }).join('')}</div>`})}
      `;

      $$('#reportsList .report-card').forEach(card => {
        card.addEventListener('click', () => {
          const r = REPORTS[+card.dataset.reportIdx];
          const s = REPORT_STATUS[r.status];
          openDetail({
            eyebrow:`Report · ${s.label}`,
            title:r.title, sub:`${r.author} · last edited ${r.edited}`,
            icon:'summarize', accent:s.color,
            body:`
              <div class="detail-section">
                <div class="detail-section-title">Report Details</div>
                <div class="detail-meta-grid">
                  <div class="detail-meta"><div class="detail-meta-label">Status</div><div class="detail-meta-value"><span class="pill" style="color:${s.color};background:color-mix(in srgb, ${s.color} 14%, transparent);"><span class="dot" style="background:${s.color};"></span>${s.label}</span></div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Author</div><div class="detail-meta-value" style="font-size:14px;">${r.author}</div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Last Edited</div><div class="detail-meta-value" style="font-size:14px;">${r.edited}</div></div>
                  <div class="detail-meta"><div class="detail-meta-label">Tags</div><div class="detail-meta-value" style="font-size:13px;">${r.tags.join(', ')}</div></div>
                </div>
              </div>
              <div class="detail-section">
                <div class="detail-section-title">Preview</div>
                <div style="padding:14px;background:var(--surface-2);border-radius:12px;font-size:13px;line-height:1.7;color:var(--text-muted);">
                  <b style="color:var(--text);">Executive summary.</b> This report covers ${r.tags.join(', ')} signals across the active portfolio for the most recent reporting period. Key findings include risk concentration in select UPCs, supplier documentation gaps, and recommended action items.
                </div>
              </div>`
          });
        });
      });

      buildSparkline($('#r-sp-1'), 'wave', 'amber');
      buildSparkline($('#r-sp-2'), 'up', 'green');
      buildSparkline($('#r-sp-3'), 'up', 'cyan');
      buildSparkline($('#r-sp-4'), 'up', 'violet');

      const ctx = $('#chart-report-activity').getContext('2d');
      const primary = colorVar('--primary');
      const grad = ctx.createLinearGradient(0,0,0,200);
      grad.addColorStop(0, colorWithAlpha(primary, 0.35));
      grad.addColorStop(1, colorWithAlpha(primary, 0));
      STATE.charts.rAct = new Chart(ctx, {
        type:'line',
        data:{ labels:['W1','W2','W3','W4','W5','W6','W7','W8'], datasets:[
          { label:'Drafts',     data:[4,6,3,8,7,9,6,7], borderColor: colorVar('--ter-amber'), tension:.4, borderWidth:2, pointRadius:0 },
          { label:'Publishes',  data:[2,3,4,3,5,4,6,8], borderColor: primary, backgroundColor: grad, tension:.4, fill:true, borderWidth:2.4, pointRadius:0 }
        ]},
        options: chartBase()
      });
      applyThemeColors(STATE.charts.rAct);

      const TEMPLATES = [
        { name:'Executive Risk Brief', usage:38, color:'var(--primary)' },
        { name:'Supplier Documentation Audit', usage:24, color:'var(--ter-violet)' },
        { name:'Verification Cycle Summary', usage:22, color:'var(--sec-green)' },
        { name:'Compliance Outlook', usage:18, color:'var(--ter-amber)' },
        { name:'Competitive Benchmark', usage:14, color:'var(--ter-cyan)' },
      ];
      $('#reportTemplates').innerHTML = TEMPLATES.map(t => `
        <div class="list-row">
          <div class="list-thumb" style="background:color-mix(in srgb, ${t.color} 14%, transparent);color:${t.color};"><span class="material-symbols-rounded">description</span></div>
          <div class="list-body">
            <div class="list-title">${t.name}</div>
            <div class="list-sub">${t.usage} reports this quarter</div>
          </div>
          <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" data-action="new-report"><span class="material-symbols-rounded" style="font-size:16px;">add</span></button>
        </div>
      `).join('');
    }

    // ========== SIDEBAR ==========
    function widthForSidebar(){
      if (!STATE.sidebarOpen) return '0px';
      const isOverlay = window.matchMedia('(max-width:900px)').matches;
      if (isOverlay) return '0px';
      return STATE.sidebarCollapsed ? '76px' : '268px';
    }
    function applySidebar(){
      const sb = $('#sidebar');
      sb.classList.toggle('collapsed', STATE.sidebarCollapsed && STATE.sidebarOpen);
      sb.classList.toggle('hidden', !STATE.sidebarOpen);
      document.documentElement.style.setProperty('--sidebar-w', widthForSidebar());
      const toggleIcon = $('#sidebarToggleIcon');
      if (toggleIcon) toggleIcon.textContent = STATE.sidebarOpen ? 'menu_open' : 'menu';
      const collapseIcon = $('#sidebarCollapseIcon');
      if (collapseIcon) collapseIcon.textContent = STATE.sidebarCollapsed ? 'left_panel_open' : 'left_panel_close';
      const toggleBtn = $('#sidebarToggle');
      if (toggleBtn) toggleBtn.style.color = STATE.sidebarOpen ? 'var(--primary)' : 'var(--text-muted)';
      setTimeout(rerenderCharts, 450);
    }
    function setSidebarOpen(open){ STATE.sidebarOpen = open; applySidebar(); }
    function setSidebarCollapsed(collapsed){ STATE.sidebarCollapsed = collapsed; applySidebar(); }

    // ========== COMMAND PALETTE ==========
    function escapeHtml(s){
      return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    const CMD_ITEMS = [
      { icon:'dashboard', title:'Open Dashboard', sub:'Module', action:()=>setTopModule('dashboard') },
      { icon:'inventory_2', title:'Search Products', sub:'1,248 UPCs', action:()=>setTopModule('products') },
      { icon:'science', title:'Search Ingredients', sub:'9,420 ingredients', action:()=>setTopModule('ingredients') },
      { icon:'verified', title:'Open Verification Queue', sub:'38 in queue', action:()=>setTopModule('verification') },
      { icon:'gavel', title:'Open Compliance', sub:'24 open claims', action:()=>setTopModule('compliance') },
      { icon:'factory', title:'Supplier Documentation', sub:'12 stale docs', action:()=>setTopModule('insights') },
      { icon:'auto_awesome', title:'Generate Executive Summary', sub:'AI · brief', action:()=>{ setAI(true); sendMessage('Generate executive summary'); } },
      { icon:'dark_mode', title:'Toggle Theme', sub:'Light / dark', action:()=>applyTheme(STATE.theme==='light'?'dark':'light') },
      { icon:'menu', title:'Toggle Sidebar', sub:'Show / hide', action:()=>setSidebarOpen(!STATE.sidebarOpen) },
      { icon:'left_panel_close', title:'Compact Sidebar', sub:'Icon rail / full', action:()=>setSidebarCollapsed(!STATE.sidebarCollapsed) },
      { icon:'auto_awesome', title:'Toggle AI Assistant', sub:'Open / close drawer', action:()=>setAI(!STATE.aiOpen) },
    ];

    let CMD_FILTERED = CMD_ITEMS.slice();
    let CMD_INDEX = 0;

    function openCmd(){
      $('#cmdOverlay').classList.add('open');
      renderCmd('');
      setTimeout(() => $('#cmdInput').focus(), 50);
    }
    function closeCmd(){ $('#cmdOverlay').classList.remove('open'); $('#cmdInput').value = ''; }
    function renderCmd(q){
      const lower = q.toLowerCase().trim();
      CMD_FILTERED = CMD_ITEMS.filter(i => !lower || i.title.toLowerCase().includes(lower) || i.sub.toLowerCase().includes(lower));
      CMD_INDEX = 0;
      const list = $('#cmdList');
      if (!CMD_FILTERED.length) {
        list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">No matches for "${escapeHtml(q)}"</div>`;
        return;
      }
      list.innerHTML = CMD_FILTERED.map((i,idx) => `
        <div class="cmd-item ${idx===0?'active-cmd':''}" data-idx="${idx}">
          <div class="cmd-item-icon"><span class="material-symbols-rounded ms-fill" style="font-size:18px;">${i.icon}</span></div>
          <div class="cmd-item-body">
            <div class="cmd-item-title">${i.title}</div>
            <div class="cmd-item-sub">${i.sub}</div>
          </div>
          <span class="material-symbols-rounded" style="color:var(--text-subtle);font-size:18px;">arrow_forward</span>
        </div>
      `).join('');
    }
    function runCmdAt(idx){
      const item = CMD_FILTERED[idx];
      if (item) { item.action(); closeCmd(); }
    }
    function moveCmd(delta){
      if (!CMD_FILTERED.length) return;
      CMD_INDEX = (CMD_INDEX + delta + CMD_FILTERED.length) % CMD_FILTERED.length;
      $$('.cmd-item').forEach((el,i) => el.classList.toggle('active-cmd', i === CMD_INDEX));
      const active = $$('.cmd-item')[CMD_INDEX];
      if (active) active.scrollIntoView({ block:'nearest' });
    }

    // ========== TOASTS ==========
    function showToast({ title, sub, icon='check', kind='' } = {}){
      const root = $('#toastContainer');
      const t = document.createElement('div');
      t.className = 'toast ' + kind;
      t.innerHTML = `
        <div class="toast-icon"><span class="material-symbols-rounded">${icon}</span></div>
        <div class="toast-body">
          <div class="t-title">${title || ''}</div>
          ${sub ? `<div class="t-sub">${sub}</div>` : ''}
        </div>`;
      root.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 350);
      }, 3200);
    }

    const ai = createAiChatDrawer({ $, STATE, rerenderCharts, navigate: setTopModule, showToast });
    setAI = ai.setAI;
    sendMessage = ai.sendMessage;

    // ========== POPOVERS ==========
    let activePopover = null;
    let activePopoverAnchor = null;
    function closePopover(){
      if (activePopover) {
        activePopover.classList.remove('open');
        const p = activePopover;
        setTimeout(() => p.remove(), 220);
        activePopover = null;
        activePopoverAnchor = null;
      }
    }
    function openPopover(anchor, html, opts = {}){
      if (activePopoverAnchor === anchor) { closePopover(); return; }
      closePopover();
      const pop = document.createElement('div');
      pop.className = 'popover';
      pop.innerHTML = html;
      document.body.appendChild(pop);
      const rect = anchor.getBoundingClientRect();
      const popRect = pop.getBoundingClientRect();
      let left = opts.align === 'right' ? rect.right - popRect.width : rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
      const top = rect.bottom + 8;
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
      requestAnimationFrame(() => pop.classList.add('open'));
      activePopover = pop;
      activePopoverAnchor = anchor;
      pop.addEventListener('click', (e) => {
        const item = e.target.closest('.popover-item');
        if (item && item.dataset.popAction) {
          if (opts.onAction) opts.onAction(item.dataset.popAction, item);
          closePopover();
        }
      });
    }

    /* ===== Appearance popover =====
       The same Appearance menu the agent / portfolio / chat shells show, built
       from the shared js/appearance-menu.js so this dashboard's nav stays in step
       (Full bleed, Header, Minimal UI, Jam strip, Text size, Theme). This shell
       has no module layouts, nav pivot, or WISEai dock, so those are omitted. The
       toggles write the same persisted state, so flipping one here carries over
       to every other page. */
    let activeAppearancePop = null;
    let activeAppearanceAnchor = null;
    function closeAppearancePop(){
      if (!activeAppearancePop) return;
      activeAppearanceAnchor?.classList.remove('is-open');
      activeAppearanceAnchor?.setAttribute('aria-expanded', 'false');
      activeAppearancePop.classList.remove('open');
      const p = activeAppearancePop;
      setTimeout(() => p.remove(), 220);
      activeAppearancePop = null;
      activeAppearanceAnchor = null;
    }
    function renderAppearancePop(pop){
      pop.innerHTML = buildAppearanceBody({
        isDark: document.documentElement.classList.contains('dark'),
        showWISEaiDock: false,
      });
    }
    function openAppearancePop(anchor){
      if (activeAppearanceAnchor === anchor) { closeAppearancePop(); return; }
      closeAppearancePop();
      closePopover();
      const pop = document.createElement('div');
      pop.className = 'wise-popover';
      document.body.appendChild(pop);
      renderAppearancePop(pop);
      positionPopoverForTopbar(pop, anchor);
      requestAnimationFrame(() => pop.classList.add('open'));
      activeAppearancePop = pop;
      activeAppearanceAnchor = anchor;
      anchor.classList.add('is-open');
      anchor.setAttribute('aria-expanded', 'true');
      wireAppearancePopover(pop, {
        render: () => renderAppearancePop(pop),
        onClose: closeAppearancePop,
        toggleTheme: () => applyTheme(STATE.theme === 'light' ? 'dark' : 'light'),
      });
    }

    /* ===== Avatar / user popover =====
       Mirrors the product-portfolio shell: an Alerts | Agents quick-action row
       above My profile / Preferences / API keys / Help / Docs and Sign out, using
       the shared .wise-popover markup this dashboard already styles. */
    let activeUserPop = null;
    let activeUserAnchor = null;
    function closeUserPop(){
      if (!activeUserPop) return;
      activeUserAnchor?.classList.remove('is-open');
      activeUserAnchor?.setAttribute('aria-expanded', 'false');
      activeUserPop.classList.remove('open');
      const p = activeUserPop;
      setTimeout(() => p.remove(), 220);
      activeUserPop = null;
      activeUserAnchor = null;
    }
    function openUserPopover(anchor){
      if (activeUserAnchor === anchor) { closeUserPop(); return; }
      closeUserPop();
      closeAppearancePop();
      closePopover();
      let rawName = null;
      try { rawName = (window.WiseAuth && WiseAuth.getUser && WiseAuth.getUser()?.name) || null; } catch (_) { rawName = null; }
      const who = (rawName && rawName !== 'Demo User') ? rawName : 'Arthur Krupsky';
      const pop = document.createElement('div');
      pop.className = 'wise-popover';
      pop.innerHTML = buildUserMenuBody({ name: who });
      document.body.appendChild(pop);
      positionPopoverForTopbar(pop, anchor);
      requestAnimationFrame(() => pop.classList.add('open'));
      activeUserPop = pop;
      activeUserAnchor = anchor;
      anchor.classList.add('is-open');
      anchor.setAttribute('aria-expanded', 'true');
      pop.addEventListener('click', (ev) => {
        const notif = ev.target.closest('[data-pop-action="notifications"]');
        if (notif && pop.contains(notif)) { ev.stopPropagation(); closeUserPop(); handleAction('notifications', anchor); return; }
        const agents = ev.target.closest('[data-pop-action="agents"]');
        if (agents && pop.contains(agents)) { ev.stopPropagation(); closeUserPop(); showToast({ title:'Agent settings', sub:'Demo action', icon:'tune' }); return; }
        const signout = ev.target.closest('[data-pop-action="signout"]');
        if (signout && pop.contains(signout)) {
          ev.stopPropagation();
          closeUserPop();
          try { localStorage.removeItem('wise-auth'); } catch (e) {}
          showToast({ title:'Signed out', sub:'Redirecting to sign in…', icon:'logout', kind:'warn' });
          setTimeout(() => { window.location.href = 'pages/login.html'; }, 350);
          return;
        }
        const item = ev.target.closest('.wise-popover-item[data-pop-action]');
        if (item && pop.contains(item)) {
          ev.stopPropagation();
          /* Each menu row now opens its own module page (under pages/). */
          const dest = { profile:'pages/profile.html', invoices:'pages/invoices.html', prefs:'pages/preferences.html', apikeys:'pages/api-keys.html', help:'pages/help.html', docs:'pages/docs.html' };
          const a = item.dataset.popAction;
          closeUserPop();
          if (dest[a]) { window.location.href = dest[a]; return; }
          showToast({ title:'Opened', sub:'Demo action', icon:'settings', kind:'' });
          return;
        }
        if (ev.target.closest('.wise-popover-header, .wise-popover-divider, .wise-popover-actions, .wise-pop-vline')) { ev.stopPropagation(); return; }
        closeUserPop();
      });
    }

    // ========== DETAIL DRAWER ==========
    function openDetail({ eyebrow, title, sub, icon, accent, body }){
      $('#detailEyebrow').textContent = eyebrow || '';
      $('#detailTitle').textContent = title || '';
      $('#detailSub').textContent = sub || '';
      const thumb = $('#detailThumb');
      thumb.querySelector('.material-symbols-rounded').textContent = icon || 'inventory_2';
      if (accent) thumb.style.background = `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 50%, #000))`;
      else thumb.style.background = '';
      $('#detailBody').innerHTML = body || '';
      $('#detailDrawer').classList.add('open');
      $('#detailOverlay').classList.add('open');
      $('#detailDrawer').setAttribute('aria-hidden', 'false');
    }
    function closeDetail(){
      $('#detailDrawer').classList.remove('open');
      $('#detailOverlay').classList.remove('open');
      $('#detailDrawer').setAttribute('aria-hidden', 'true');
    }

    function openProductDetail(p, upc){
      const r = STATUS_MAP[p.risk];
      const v = VERIF_MAP[p.verif];
      const pc = PROC_MAP[p.proc];
      const accent = p.risk === 'risk' ? colorVar('--sec-red') : p.risk === 'warn' ? colorVar('--ter-amber') : colorVar('--sec-green');
      const body = `
        <div class="detail-section">
          <div class="detail-section-title">Overview</div>
          <div class="detail-meta-grid">
            <div class="detail-meta"><div class="detail-meta-label">Brand</div><div class="detail-meta-value">${p.brand}</div></div>
            <div class="detail-meta"><div class="detail-meta-label">Category</div><div class="detail-meta-value">${p.cat}</div></div>
            <div class="detail-meta"><div class="detail-meta-label">Processing</div><div class="detail-meta-value"><span class="pill ${pc.cls}"><span class="dot" style="background:currentColor;opacity:.7;"></span>${p.proc}</span></div></div>
            <div class="detail-meta"><div class="detail-meta-label">Risk</div><div class="detail-meta-value"><span class="pill ${r.cls}"><span class="dot" style="background:${r.dot};"></span>${r.label}</span></div></div>
            <div class="detail-meta"><div class="detail-meta-label">Verification</div><div class="detail-meta-value"><span class="pill ${v.cls}"><span class="material-symbols-rounded" style="font-size:14px;">${v.icon}</span>${v.label}</span></div></div>
            <div class="detail-meta"><div class="detail-meta-label">Updated</div><div class="detail-meta-value" style="font-size:14px;">${p.updated}</div></div>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Top Flagged Ingredients</div>
          ${INGREDIENTS.slice(0,4).map(i => `
            <div class="bar-row">
              <div class="bar-row-top">
                <div class="bar-name"><span class="dot" style="background:${i.cls==='risk'?'var(--sec-red)':i.cls==='warn'?'var(--ter-amber)':i.cls==='info'?'var(--ter-cyan)':'var(--sec-green)'};"></span>${i.name}<span style="font-size:11px;color:var(--text-muted);font-weight:400;">· ${i.tag}</span></div>
                <div class="bar-value">${i.value} flags</div>
              </div>
              <div class="bar-track"><div class="bar-fill ${i.cls}" style="width:${i.pct}%;"></div></div>
            </div>
          `).join('')}
        </div>
        <div class="detail-section">
          <div class="detail-section-title">AI Insight</div>
          <div class="insight-card" style="margin:0;">
            <div class="insight-icon"><span class="material-symbols-rounded">auto_awesome</span></div>
            <div class="insight-body">
              <div class="insight-eyebrow">AI · 92% confidence</div>
              <div class="insight-headline">Two supplier substitutions could shift this UPC to medium risk.</div>
              <div class="insight-text">Replacing the current emulsifier source with a verified equivalent from your approved list would reduce risk score by ~14 points within one cycle.</div>
            </div>
          </div>
        </div>`;
      openDetail({ eyebrow:`Product · ${upc}`, title:p.name, sub:`${p.brand} · ${p.cat}`, icon:p.icon, accent, body });
    }

    function openVerificationDetail(v, stateMap){
      const m = stateMap[v.state];
      const body = `
        <div class="detail-section">
          <div class="detail-section-title">Status</div>
          <div class="detail-meta-grid">
            <div class="detail-meta"><div class="detail-meta-label">State</div><div class="detail-meta-value"><span class="pill" style="color:${m.color};background:${m.bg};"><span class="material-symbols-rounded" style="font-size:14px;">${m.icon}</span>${m.label}</span></div></div>
            <div class="detail-meta"><div class="detail-meta-label">Reviewer</div><div class="detail-meta-value" style="font-size:14px;">Maya Chen</div></div>
            <div class="detail-meta"><div class="detail-meta-label">Due</div><div class="detail-meta-value" style="font-size:14px;">Friday, May 15</div></div>
            <div class="detail-meta"><div class="detail-meta-label">Cycle</div><div class="detail-meta-value" style="font-size:14px;">Q2 · 2026</div></div>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Checklist</div>
          ${['Ingredient documentation verified','Supplier certifications uploaded','Processing claim substantiated','Labeling reviewed by counsel'].map((item, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
              <span class="material-symbols-rounded ms-fill" style="font-size:18px;color:${i<2?'var(--sec-green)':'var(--text-subtle)'};">${i<2?'check':'radio_button_unchecked'}</span>
              <span style="${i>=2?'color:var(--text-muted);':''}">${item}</span>
            </div>
          `).join('')}
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Activity</div>
          <div style="font-size:12.5px;color:var(--text-muted);line-height:1.6;">
            <div>· Maya assigned to review · 2h ago</div>
            <div>· Documentation refreshed by Nordmark · Yesterday</div>
            <div>· Added to Q2 verification cycle · 3d ago</div>
          </div>
        </div>`;
      openDetail({ eyebrow:'Verification Item', title:v.title, sub:v.meta, icon:m.icon, accent:m.color, body });
    }

    // ========== CHART TIMEFRAME ==========
    const TREND_DATA = {
      '12M': { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
               a: [8.2,8.8,9.4,9.1,9.8,10.4,11.0,10.6,11.4,11.9,12.1,12.4], b:[10,10.2,10.4,10.6,10.8,11,11.2,11.4,11.6,11.8,12,12.2] },
      '6M':  { labels: ['Jul','Aug','Sep','Oct','Nov','Dec'],
               a: [11.0,10.6,11.4,11.9,12.1,12.4], b: [11.2,11.4,11.6,11.8,12,12.2] },
      '3M':  { labels: ['Wk1','Wk2','Wk3','Wk4','Wk5','Wk6','Wk7','Wk8','Wk9','Wk10','Wk11','Wk12'],
               a: [11.7,11.8,11.9,12.0,11.9,12.1,12.2,12.3,12.2,12.3,12.4,12.4], b:[12.0,12.0,12.1,12.1,12.1,12.2,12.2,12.2,12.2,12.2,12.2,12.2] },
    };
    function setTrendRange(range){
      const c = STATE.charts.trend;
      const d = TREND_DATA[range];
      if (!c || !d) return;
      c.data.labels = d.labels;
      c.data.datasets[0].data = d.a;
      c.data.datasets[1].data = d.b;
      c.update();
      $$('#trendRange .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.range === range));
    }

    // ========== ACTION DISPATCHER ==========
    function handleAction(action, el){
      switch(action){
        case 'workspace-switcher':
          openPopover(el, `
            <div class="popover-header">Switch workspace</div>
            <div class="popover-item" data-pop-action="ws-atlas">
              <div class="ws-avatar" style="width:24px;height:24px;border-radius:7px;font-size:10px;">AF</div>
              <div class="popover-item-body"><div>Atlas Foods</div><div class="popover-item-sub">Enterprise · v4.2</div></div>
              <span class="material-symbols-rounded ms-fill" style="font-size:16px;color:var(--primary);">check</span>
            </div>
            <div class="popover-item" data-pop-action="ws-northgate">
              <div class="ws-avatar" style="width:24px;height:24px;border-radius:7px;font-size:10px;background:linear-gradient(135deg,var(--ter-amber),#A16908);">NG</div>
              <div class="popover-item-body"><div>Northgate</div><div class="popover-item-sub">Enterprise · v4.0</div></div>
            </div>
            <div class="popover-item" data-pop-action="ws-bright">
              <div class="ws-avatar" style="width:24px;height:24px;border-radius:7px;font-size:10px;background:linear-gradient(135deg,var(--ter-cyan),#1A2339);">BC</div>
              <div class="popover-item-body"><div>Bright Co.</div><div class="popover-item-sub">Trial</div></div>
            </div>
            <div class="popover-divider"></div>
            <div class="popover-item" data-pop-action="ws-create"><span class="material-symbols-rounded">add</span>Create workspace</div>
            <div class="popover-item" data-pop-action="ws-manage"><span class="material-symbols-rounded">settings</span>Manage workspaces</div>
          `, { onAction: (a) => {
            if (a.startsWith('ws-') && !['ws-create','ws-manage'].includes(a)) {
              const map = { 'ws-atlas':'Atlas Foods', 'ws-northgate':'Northgate', 'ws-bright':'Bright Co.' };
              showToast({ title:'Workspace switched', sub:map[a], icon:'switch_access', kind:'success' });
            } else if (a === 'ws-create') showToast({ title:'Create workspace', sub:'Opening wizard…', icon:'add' });
            else if (a === 'ws-manage') showToast({ title:'Manage workspaces', sub:'Opening settings…', icon:'settings' });
          }});
          break;

        case 'notifications':
          openPopover(el, `
            <div class="popover-header">Notifications</div>
            <div class="popover-item" data-pop-action="n1">
              <span class="material-symbols-rounded" style="color:var(--sec-red);">priority_high</span>
              <div class="popover-item-body"><div>6 new high-risk UPCs flagged</div><div class="popover-item-sub">Beverage portfolio · 12m ago</div></div>
            </div>
            <div class="popover-item" data-pop-action="n2">
              <span class="material-symbols-rounded" style="color:var(--ter-amber);">hourglass_top</span>
              <div class="popover-item-body"><div>Verification cycle closes Friday</div><div class="popover-item-sub">38 items pending · 1h ago</div></div>
            </div>
            <div class="popover-item" data-pop-action="n3">
              <span class="material-symbols-rounded" style="color:var(--ter-violet);">auto_awesome</span>
              <div class="popover-item-body"><div>WISE generated this week's brief</div><div class="popover-item-sub">Executive summary ready · 3h ago</div></div>
            </div>
            <div class="popover-divider"></div>
            <div class="popover-item" data-pop-action="n-all"><span class="material-symbols-rounded">inbox</span>View all notifications</div>
          `, { align:'right', onAction:(a) => {
            if (a === 'n3') { setAI(true); showToast({ title:'Brief opened', sub:'Routing to WISE Assistant…', icon:'auto_awesome', kind:'ai' }); }
            else showToast({ title:'Notification opened', sub:'Routing to source…', icon:'notifications' });
          }});
          break;

        case 'user-menu':
          openUserPopover(el);
          break;

        case 'ai-settings':
          openPopover(el, `
            <div class="popover-header">Assistant settings</div>
            <div class="popover-item" data-pop-action="ai-context"><span class="material-symbols-rounded">tune</span>Context: Portfolio · Atlas Foods</div>
            <div class="popover-item" data-pop-action="ai-model"><span class="material-symbols-rounded">memory</span>Model: WISE-XL · v4.2</div>
            <div class="popover-item" data-pop-action="ai-tone"><span class="material-symbols-rounded">style</span>Tone: Executive</div>
            <div class="popover-divider"></div>
            <div class="popover-item" data-pop-action="ai-clear"><span class="material-symbols-rounded">delete</span>Clear conversation</div>
          `, { align:'right', onAction:(a) => {
            if (a === 'ai-clear') {
              $('#aiThread').innerHTML = '';
              showToast({ title:'Conversation cleared', icon:'delete', kind:'ai' });
            } else showToast({ title:'Setting selected', sub:'Demo action', icon:'tune', kind:'ai' });
          }});
          break;

        case 'filters':
        case 'filter':
          openPopover(el, `
            <div class="popover-header">Filter portfolio</div>
            <div class="popover-item" data-pop-action="f-cat"><span class="material-symbols-rounded">category</span>By category</div>
            <div class="popover-item" data-pop-action="f-risk"><span class="material-symbols-rounded">warning</span>By risk level</div>
            <div class="popover-item" data-pop-action="f-supplier"><span class="material-symbols-rounded">factory</span>By supplier</div>
            <div class="popover-item" data-pop-action="f-verif"><span class="material-symbols-rounded">verified</span>By verification state</div>
            <div class="popover-divider"></div>
            <div class="popover-item" data-pop-action="f-clear"><span class="material-symbols-rounded">close</span>Clear filters</div>
          `, { onAction:(a) => {
            const labels = { 'f-cat':'Category filter applied', 'f-risk':'Risk level filter applied', 'f-supplier':'Supplier filter applied', 'f-verif':'Verification filter applied', 'f-clear':'Filters cleared' };
            showToast({ title:labels[a], sub:'Demo state · table refreshed', icon:'filter_alt', kind:'success' });
          }});
          break;

        case 'ingredient-more':
          openPopover(el, `
            <div class="popover-item" data-pop-action="i-sort"><span class="material-symbols-rounded">swap_vert</span>Sort by flag count</div>
            <div class="popover-item" data-pop-action="i-export"><span class="material-symbols-rounded">download</span>Export panel data</div>
            <div class="popover-item" data-pop-action="i-config"><span class="material-symbols-rounded">tune</span>Configure thresholds</div>
          `, { align:'right', onAction:(a) => showToast({ title:a==='i-export'?'Export started':'Action queued', sub:'Ingredient intelligence', icon:'science', kind:'success' }) });
          break;

        case 'export':
          showToast({ title:'Export started', sub:'PDF brief queued · ready in ~10s', icon:'download', kind:'success' });
          break;
        case 'new-report':
          showToast({ title:'New report draft', sub:'Opened in Reports module', icon:'summarize', kind:'success' });
          setTimeout(() => setTopModule('reports'), 400);
          break;
        case 'new-workspace':
          showToast({ title:'New workspace', sub:'Opening builder…', icon:'add', kind:'success' });
          break;
        case 'view-all-products':
          setTopModule('products');
          showToast({ title:'Switched to Products', icon:'inventory_2' });
          break;
        case 'view-verification':
          setTopModule('verification');
          showToast({ title:'Switched to Verification', icon:'verified' });
          break;
        case 'view-upcs':
          showToast({ title:'147 UPCs', sub:'Opening filtered product view', icon:'inventory_2' });
          setTimeout(() => setTopModule('products'), 400);
          break;
        case 'view-clusters':
          showToast({ title:'3 ingredient clusters', sub:'Opening ingredient view', icon:'science', kind:'ai' });
          setTimeout(() => setTopModule('ingredients'), 400);
          break;
        case 'review-substitutes':
          setAI(true);
          sendMessage('Review supplier substitutes for high-risk emulsifier cluster');
          break;
        case 'view-beverages':
          setTopModule('products');
          showToast({ title:'Beverage view opened', sub:'184 UPCs · filtered to beverage category', icon:'local_drink', kind:'success' });
          break;
        case 'ai-attach':
          showToast({ title:'Attach context', sub:'Drag in a UPC, supplier, or report', icon:'attach_file', kind:'ai' });
          break;
        case 'ai-voice':
          const btn = $('#aiVoiceBtn');
          btn.style.color = 'var(--sec-red)';
          showToast({ title:'Listening…', sub:'Speak now (demo)', icon:'mic', kind:'ai' });
          setTimeout(() => { btn.style.color = ''; }, 2000);
          break;
        case 'saved-view':
          showToast({ title:'Loading saved view', sub:el.dataset.view, icon:'bookmark', kind:'success' });
          break;
        case 'open-settings':
          showToast({ title:'Settings', sub:'Demo · opens enterprise settings', icon:'settings' });
          break;
        case 'open-team':
          showToast({ title:'Team', sub:'12 members in workspace', icon:'groups' });
          break;
        case 'detail-primary':
          showToast({ title:'Opening full view', sub:'Routing to module workspace', icon:'arrow_forward', kind:'success' });
          closeDetail();
          break;
        case 'detail-secondary':
          showToast({ title:'History', sub:'Loading activity log', icon:'history' });
          break;
        case 'add-kanban':
          showToast({ title:'New verification item', sub:`Added to "${el.dataset.col}" column`, icon:'add_task', kind:'success' });
          break;
      }
    }

    // ========== RESPONSIVE ==========
    function handleResize(){
      const w = window.innerWidth;
      // On narrow widths, auto-collapse the sidebar to icon rail
      if (w < 1100 && !STATE.sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
      // On very narrow widths, hide sidebar entirely (overlay mode)
      if (w < 900 && STATE.sidebarOpen) {
        // Keep state open=true, the CSS converts to overlay automatically.
        // But on first load below 900, default to hidden so content takes full width.
      }
      applySidebar();
      requestAnimationFrame(rerenderCharts);
    }

    // ========== INIT ==========
    function init(){
      applyTheme(STATE.theme);
      applySidebar();

      mountApplicationNavigation(
        { workspaceRoutes, savedViewItems, accountRoutes },
        $('#sidebarScrollMount'),
        $('#topNav')
      );

      subscribeRoute((id) => {
        if (id !== STATE.activeTop) applyTopModule(id);
      }, routeIsValid);

      renderRails();

      let initialId = getRouteFromHash();
      if (!routeIsValid(initialId)) initialId = defaultRouteId;
      if (getRouteFromHash() !== initialId) pushRoute(initialId);
      applyTopModule(initialId);

      // Theme toggle
      $('#themeToggle').addEventListener('click', () => applyTheme(STATE.theme === 'light' ? 'dark' : 'light'));

      // Appearance menu (shared with every other shell) + restore persisted
      // app-wide appearance state so Full bleed / Header / Minimal UI / Jam carry
      // over from other pages.
      restoreMinimalUi(); restoreHeaderFloat(); restoreFullBleed(); restoreColorblind();
      $('#appearanceToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openAppearancePop(e.currentTarget);
      });

      // Sidebar toggle (topnav) → open/hidden, mirrors AI drawer
      $('#sidebarToggle').addEventListener('click', (e) => { e.preventDefault(); setSidebarOpen(!STATE.sidebarOpen); });
      // Sidebar compact toggle (footer button) → icon rail
      $('#sidebarCollapseBtn').addEventListener('click', (e) => { e.preventDefault(); setSidebarCollapsed(!STATE.sidebarCollapsed); });

      ai.attach(document);

      // Command palette
      $('#searchBar').addEventListener('click', openCmd);
      $('#cmdClose').addEventListener('click', closeCmd);
      $('#cmdOverlay').addEventListener('click', (e) => { if (e.target === $('#cmdOverlay')) closeCmd(); });
      $('#cmdInput').addEventListener('input', (e) => renderCmd(e.target.value));
      $('#cmdInput').addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); moveCmd(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveCmd(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); runCmdAt(CMD_INDEX); }
      });
      $('#cmdList').addEventListener('click', (e) => {
        const item = e.target.closest('.cmd-item');
        if (item) runCmdAt(+item.dataset.idx);
      });
      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if ($('#cmdOverlay').classList.contains('open')) closeCmd(); else openCmd();
        }
        if (e.key === 'Escape') {
          closeCmd();
          closePopover();
          closeAppearancePop();
          if ($('#detailDrawer').classList.contains('open')) closeDetail();
        }
      });

      document.addEventListener('click', (e) => {
        const seg = e.target.closest('#trendRange .seg-btn');
        if (seg && seg.dataset.range) setTrendRange(seg.dataset.range);
      });

      // Detail drawer dismiss
      $('#detailClose').addEventListener('click', closeDetail);
      $('#detailOverlay').addEventListener('click', closeDetail);

      // Global action delegation (any [data-action] click)
      document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        const action = t.dataset.action;
        if (!action) return;
        // Skip actions already wired separately (theme, AI, sidebar etc.)
        const SKIP = new Set(['']);
        if (SKIP.has(action)) return;
        // Skip nav items that already do nav switching via data-nav (Dashboard etc.)
        if (t.matches('[data-top]') || t.matches('[data-nav]:not([data-action="saved-view"]):not([data-action="open-settings"]):not([data-action="open-team"])')) return;
        e.preventDefault();
        handleAction(action, t);
      });

      // Close popovers on outside click
      document.addEventListener('mousedown', (e) => {
        if (activeAppearancePop && !activeAppearancePop.contains(e.target) && !activeAppearanceAnchor?.contains(e.target)) {
          closeAppearancePop();
        }
        if (!activePopover) return;
        if (activePopover.contains(e.target)) return;
        if (e.target.closest('[data-action]')) return;
        closePopover();
      });

      window.addEventListener('resize', () => { closePopover(); closeAppearancePop(); handleResize(); });
      handleResize();
    }

    function boot(){
      try {
        if (!Chart) {
          const box = document.getElementById('moduleContent');
          if (box) {
            box.innerHTML = '<div class="surface panel" style="padding:24px;margin:24px;color:var(--sec-red);max-width:560px;">Chart.js did not load. Ensure <code>chart.js</code> runs before <code>js/app.js</code> in index.html.</div>';
          }
          return;
        }
        init();
      } catch (err) {
        console.error(err);
        const box = document.getElementById('moduleContent');
        if (box) {
          box.innerHTML = '<div class="surface panel" style="padding:24px;margin:24px;max-width:640px;"><div style="font-weight:700;margin-bottom:8px;">WISE could not start</div><pre id="wiseBootErr" style="white-space:pre-wrap;font-size:12px;color:var(--text-muted);"></pre></div>';
          const pre = document.getElementById('wiseBootErr');
          if (pre) pre.textContent = String(err && err.stack || err);
        }
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
