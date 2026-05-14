/**
 * AI assistant drawer: open/close layout, mock replies, send + suggested prompts.
 * Depends on app-supplied DOM helpers and navigation/toast callbacks.
 */
export function createAiChatDrawer({ $, STATE, rerenderCharts, navigate, showToast }) {
  function setAI(open) {
    STATE.aiOpen = open;
    const isOverlay = window.matchMedia('(max-width:1100px)').matches;
    const drawer = $('#aiDrawer');
    if (drawer) drawer.classList.toggle('hidden', !open);
    if (isOverlay) {
      document.documentElement.style.setProperty('--ai-w', '0px');
    } else {
      document.documentElement.style.setProperty('--ai-w', open ? '400px' : '0px');
    }
    const toggle = $('#aiToggle');
    if (toggle) toggle.style.color = open ? 'var(--ter-violet)' : 'var(--text-muted)';
    setTimeout(rerenderCharts, 450);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function buildReply(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes('risk'))
      return {
        body: `Of <b>1,248 SKUs</b>, 154 sit in the high-risk band — concentrated in beverages and snacks. The dominant driver is a recurring emulsifier cluster shared across 3 suppliers. <b>4.2% portfolio risk reduction</b> is reachable with a targeted substitution plan.`,
        chips: [
          { icon: 'arrow_forward', text: 'Open risk view', cls: 'chip-primary', action: 'open:products' },
          { icon: 'verified', text: '94% confidence' },
        ],
      };
    if (p.includes('supplier'))
      return {
        body: `Across <b>54 active suppliers</b>, 12 have stale documentation (>90 days). Nordmark and Helios Co. account for 7 of the 12, and both supply your highest-risk SKUs. Generating a follow-up batch now would clear ~80% within one cycle.`,
        chips: [
          { icon: 'factory', text: '12 suppliers flagged', cls: '', action: 'toast:Suppliers · 12 flagged' },
          { icon: 'arrow_forward', text: 'Draft follow-ups', cls: 'chip-primary', action: 'toast:Draft queued · 12 follow-ups' },
        ],
      };
    if (p.includes('compare') || p.includes('group'))
      return {
        body: `Comparing your beverage and snack groups: beverage carries <b>2.1× the risk density</b> of snacks despite being a smaller line. Verification readiness for snacks is significantly stronger (78% vs 61%). Want me to draft a category recovery brief?`,
        chips: [
          { icon: 'leaderboard', text: '2 groups', cls: '', action: 'open:insights' },
          { icon: 'auto_awesome', text: 'Draft brief', cls: 'chip-ai', action: 'send:Draft category recovery brief' },
        ],
      };
    if (p.includes('verification'))
      return {
        body: `I found <b>847 SKUs</b> ready for verification this cycle. 38 of those have minor missing documentation that can be auto-requested. Should I draft the request batch and assign reviewers from your verification team?`,
        chips: [
          { icon: 'verified', text: '847 ready', cls: '', action: 'open:verification' },
          { icon: 'arrow_forward', text: 'Open queue', cls: 'chip-primary', action: 'open:verification' },
        ],
      };
    if (p.includes('compliance') || p.includes('claim'))
      return {
        body: `Compliance is in a stable state. <b>24 open claims</b>, mostly minor labeling concerns. 6 require document refresh, 2 are pending counsel review. I can draft an executive summary for Friday's review meeting.`,
        chips: [
          { icon: 'gavel', text: '24 open', cls: '', action: 'open:compliance' },
          { icon: 'auto_awesome', text: 'Generate summary', cls: 'chip-ai', action: 'send:Generate executive compliance summary' },
        ],
      };
    if (p.includes('processing'))
      return {
        body: `Processing severity is rising in snacks (+12% MoM). 92 SKUs cross the medium-to-high threshold, driven mainly by 4 additive groups. Recipe-level alternatives exist for 71 of these.`,
        chips: [
          { icon: 'precision_manufacturing', text: '92 flags', cls: '', action: 'open:processing' },
          { icon: 'arrow_forward', text: 'Show alternatives', cls: 'chip-primary', action: 'send:Show recipe-level alternatives' },
        ],
      };
    return {
      body: `Got it. Based on your current portfolio context, here's what I'm seeing — the most actionable lever this week is the emulsifier cluster in beverages. Should I open a workspace and prepare the supporting data?`,
      chips: [
        { icon: 'auto_awesome', text: 'AI suggestion', cls: 'chip-ai' },
        { icon: 'arrow_forward', text: 'Open workspace', cls: 'chip-primary', action: 'open:insights' },
      ],
    };
  }

  function sendMessage(text) {
    if (!text || !text.trim()) return;
    const thread = $('#aiThread');
    if (!thread) return;
    const userMsg = document.createElement('div');
    userMsg.className = 'msg user';
    userMsg.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
    thread.appendChild(userMsg);
    thread.scrollTop = thread.scrollHeight;

    const typing = document.createElement('div');
    typing.className = 'msg ai';
    typing.innerHTML =
      '<div class="msg-avatar"><span class="material-symbols-rounded">auto_awesome</span></div><div class="typing"><span></span><span></span><span></span></div>';
    thread.appendChild(typing);
    thread.scrollTop = thread.scrollHeight;

    setTimeout(() => {
      typing.remove();
      const reply = buildReply(text);
      const aiMsg = document.createElement('div');
      aiMsg.className = 'msg ai';
      aiMsg.innerHTML = `
          <div class="msg-avatar"><span class="material-symbols-rounded">auto_awesome</span></div>
          <div class="msg-bubble">
            ${reply.body}
            <div class="msg-source-chips">
              ${reply.chips
                .map(
                  (c) =>
                    `<span class="chip ${c.cls || ''}" ${c.action ? `data-chip-action="${c.action}"` : ''} ${c.cls ? 'style="cursor:pointer;"' : ''}><span class="material-symbols-rounded" style="font-size:12px;">${c.icon}</span>${c.text}</span>`
                )
                .join('')}
            </div>
          </div>`;
      thread.appendChild(aiMsg);
      thread.scrollTop = thread.scrollHeight;
    }, 1100);
  }

  function attach(root = document) {
    const aiToggle = root.querySelector('#aiToggle');
    const aiClose = root.querySelector('#aiClose');
    const aiSend = root.querySelector('#aiSend');
    const input = root.querySelector('#aiInput');
    const thread = root.querySelector('#aiThread');

    if (aiToggle) aiToggle.addEventListener('click', () => setAI(!STATE.aiOpen));
    if (aiClose) aiClose.addEventListener('click', () => setAI(false));

    if (input && aiSend) {
      aiSend.addEventListener('click', () => {
        sendMessage(input.value);
        input.value = '';
        input.style.height = 'auto';
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(input.value);
          input.value = '';
          input.style.height = 'auto';
        }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 80) + 'px';
      });
    }

    root.querySelectorAll('.prompt-chip').forEach((el) => {
      el.addEventListener('click', () => sendMessage(el.textContent));
    });

    if (thread) {
      thread.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-chip-action]');
        if (!chip) return;
        const a = chip.dataset.chipAction;
        if (a.startsWith('open:')) {
          navigate(a.slice(5));
          showToast({
            title: 'Switched module',
            sub: a.slice(5).replace(/\b\w/g, (c) => c.toUpperCase()),
            icon: 'arrow_forward',
            kind: 'success',
          });
        } else if (a.startsWith('send:')) {
          sendMessage(a.slice(5));
        } else if (a.startsWith('toast:')) {
          showToast({ title: a.slice(6), icon: 'check_circle', kind: 'success' });
        }
      });
    }
  }

  return { setAI, sendMessage, attach };
}
