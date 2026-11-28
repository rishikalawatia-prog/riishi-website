/* Riishi's assistant – guided pre-call chat (rule-based, no AI service) */
(function () {
  'use strict';

  var BOOKING_URL = 'https://calendly.com/riishi14-kalawatia/30min';
  var SEND_ENDPOINT = 'https://formspree.io/f/mgakbyyb'; // Formspree endpoint goes here once available

  var TOPICS = [
    { id: 'scale', label: 'Scaling a startup or SME' },
    { id: 'cash', label: 'Cash flow & business model' },
    { id: 'fulfil', label: 'E-commerce & fulfillment' },
    { id: 'ops', label: 'Operations, costs & controls' },
    { id: 'postai', label: 'Post-AI business model (Aafina)' },
    { id: 'dbbs', label: 'Accounting, data & ERP (DBBS)' },
    { id: 'hr', label: 'FutureYou & Skilligen HDI' },
    { id: 'speak', label: 'Speaking or partnership' }
  ];

  // Topic-specific questions. type: one | many | text
  var Q = {
    scale: [
      { k: 'Team size', q: 'How many people work in the business today?', type: 'one', o: ['1–10', '11–50', '51–200', '200+'] },
      { k: 'What breaks first', q: 'As you grow, what is breaking first?', type: 'many', o: ['Orders & delivery', 'Cash', 'People & roles', 'Quality', 'Systems & data'] },
      { k: '12-month goal', q: 'Where do you want the business to be in 12 months?', type: 'text', ph: 'e.g. 3 new cities, double revenue, raise funding' }
    ],
    cash: [
      { k: 'Days to collect', q: 'Roughly how many days does it take to collect payment from customers?', type: 'one', o: ['Paid upfront', 'Under 15 days', '15–45 days', '45–90 days', '90+ days'] },
      { k: 'Stock held', q: 'How much stock do you usually hold?', type: 'one', o: ['No stock', 'Under 30 days', '30–60 days', '60+ days'] },
      { k: 'Sales channel', q: 'How do you sell today?', type: 'many', o: ['Distributors / dealers', 'Own stores', 'Online / D2C', 'B2B direct', 'Affiliates / agents'] }
    ],
    fulfil: [
      { k: 'Channels', q: 'Which channels do you ship for?', type: 'many', o: ['Own website (D2C)', 'Marketplaces', 'B2B', 'International'] },
      { k: 'Monthly orders', q: 'About how many orders a month?', type: 'one', o: ['Under 500', '500–5,000', '5,000–50,000', '50,000+'] },
      { k: 'Main pain', q: 'What hurts most today?', type: 'many', o: ['Late deliveries', 'Returns / RTO', 'Stock accuracy', 'Shipping cost', 'No warehouse yet'] }
    ],
    ops: [
      { k: 'Area', q: 'Which part of the business is affected?', type: 'many', o: ['Stores / outlets', 'Warehouse', 'Production', 'Purchasing', 'Back office'] },
      { k: 'Symptom', q: 'What are you seeing?', type: 'many', o: ['Costs rising', 'Delays', 'Errors / rework', 'Stock or cash losses', 'Unclear numbers'] },
      { k: 'How measured', q: 'How do you measure it today?', type: 'text', ph: 'e.g. monthly P&L, stock count, no measure yet' }
    ],
    postai: [
      { k: 'Current model', q: 'How does your business make money today?', type: 'one', o: ['Distribution / trading', 'Retail', 'D2C / online', 'Services', 'Manufacturing'] },
      { k: 'What to change', q: 'What do you want the new model to improve?', type: 'many', o: ['Reach / new markets', 'Margins', 'Cash flow', 'Use of AI', 'Direct / affiliate sales'] },
      { k: 'Markets', q: 'Which markets are you in, or targeting?', type: 'text', ph: 'e.g. India, UAE, Caribbean' }
    ],
    dbbs: [
      { k: 'Services', q: 'Which services do you need?', type: 'many', o: ['Accounting & bookkeeping', 'Data processing', 'ERP / CRM', 'Analytics & reports', 'Compliance documents'] },
      { k: 'Current system', q: 'What do you use today?', type: 'text', ph: 'e.g. Tally, QuickBooks, Excel, Zoho' },
      { k: 'Volume', q: 'Roughly how many transactions or documents a month?', type: 'one', o: ['Under 500', '500–5,000', '5,000+', 'Not sure'] }
    ],
    hr: [
      { k: 'You are', q: 'Which best describes you?', type: 'one', o: ['School / college', 'Training institute', 'Employer', 'Individual', 'Partner / distributor'] },
      { k: 'Interest', q: 'What are you interested in?', type: 'many', o: ['Human Readiness Assessment', 'Licensing / partnership', 'Decision governance (HDI)', 'Workshop or talk'] },
      { k: 'Group size', q: 'How many learners or people would this involve?', type: 'one', o: ['Under 50', '50–500', '500+', 'Just me'] }
    ],
    speak: [
      { k: 'Request type', q: 'What would you like Riishi to do?', type: 'one', o: ['Keynote', 'Workshop', 'Panel / fireside chat', 'Podcast / webinar', 'Partnership'] },
      { k: 'Event / audience', q: 'Tell me about the event or the partnership.', type: 'text', ph: 'Event name, audience, expected size' },
      { k: 'Date', q: 'When is it planned?', type: 'text', ph: 'e.g. February 2027, flexible' }
    ]
  };

  var COMMON = [
    { k: 'Since when', q: 'How long has this been going on?', type: 'one', o: ['Just started', 'A few months', 'Over a year', 'Planning ahead'], skip: ['speak'] },
    { k: 'Already tried', q: 'What have you already tried?', type: 'text', ph: 'A sentence is enough. Type "nothing yet" if new.', skip: ['speak', 'hr'] },
    { k: 'Impact', q: 'What is it costing you right now?', type: 'many', o: ['Money', 'Time', 'Customers', 'Team morale', 'Growth on hold'], skip: ['speak', 'hr', 'dbbs'] },
    { k: 'Data available', q: 'What data could you share on the call?', type: 'many', o: ['Sales reports', 'Stock data', 'Accounts / P&L', 'Customer data', 'Not much yet'], skip: ['speak', 'hr'] },
    { k: 'Urgency', q: 'How urgent is this?', type: 'one', o: ['This month', 'Next 3 months', 'This year', 'Exploring'] },
    { k: 'Decision maker', q: 'Who decides on this?', type: 'one', o: ['Me', 'Me with partners', 'Board / management', 'Someone else'] }
  ];

  // The Problem Solving Engine method: classify the problem, pick the framework, list the evidence to prepare
  var REFLECT = {
    scale: { type: 'Growth & process problem', fw: 'The Operations Control Loop', focus: 'which processes, roles and controls need to be in place before your next stage of growth', prep: ['Current org chart and who owns what', 'Top 3 things that went wrong last month', 'Monthly sales and order volumes'] },
    cash: { type: 'Financial / cash-flow problem', fw: 'Cash Before Cost', focus: 'your cash cycle (collection days, stock days, supplier terms) and which business model would release cash faster', prep: ['Receivables ageing or list of unpaid invoices', 'Stock value and how fast it moves', 'Supplier payment terms'] },
    fulfil: { type: 'Fulfillment & logistics problem', fw: 'Govern, Don’t Operate', focus: 'your order flow from supplier to customer, partner options and the KPIs to track (on-time delivery, returns, stock accuracy)', prep: ['Last 3 months of orders by channel', 'Return / RTO rate and main reasons', 'Current courier and warehouse set-up'] },
    ops: { type: 'Process & control problem', fw: 'The Operations Control Loop', focus: 'where the transactions break, which controls are missing, and what the data shows about the exceptions', prep: ['A sample of the transactions involved (orders, invoices, transfers)', 'Any audit or stock-count results', 'Who approves what today'] },
    postai: { type: 'Strategic / business-model problem', fw: 'Cash Before Cost', focus: 'how your current model makes and collects money, and how a post-AI distribution model could change reach, margin and cash flow', prep: ['How revenue splits by channel', 'Margins per channel', 'Markets you want to enter'] },
    dbbs: { type: 'Data & back-office problem', fw: 'The Operations Control Loop', focus: 'your back-office volumes, current systems, and what can be outsourced or automated', prep: ['Systems in use', 'Monthly transaction volume', 'Current reporting pain points'] },
    hr: { type: 'Human readiness / capability need', fw: 'FutureYou & Skilligen HDI', focus: 'your learners or teams, and which FutureYou or Skilligen HDI programme fits', prep: ['Number of learners or staff', 'Current training programmes', 'Timeline and budget cycle'] },
    speak: { type: 'Speaking or partnership request', fw: 'Speaking topics', focus: 'your audience, the topic that fits best, and the format and date', prep: ['Event agenda or partnership outline', 'Audience profile and size', 'Date, location or online'] }
  };

  var state = { step: 'intro', profile: {}, topic: null, answers: [], queue: [], started: false };

  // ---------- UI ----------
  var launcher, panel, log, area;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function scroll() { log.scrollTop = log.scrollHeight; }

  function bot(html, delay) {
    return new Promise(function (res) {
      var typing = el('div', 'rc-msg rc-bot rc-typing', '<span></span><span></span><span></span>');
      log.appendChild(typing); scroll();
      setTimeout(function () { typing.remove(); log.appendChild(el('div', 'rc-msg rc-bot', html)); scroll(); res(); }, delay == null ? 550 : delay);
    });
  }
  function me(text) { log.appendChild(el('div', 'rc-msg rc-me', esc(text))); scroll(); }
  function clearArea() { area.innerHTML = ''; }

  function chips(options, multi, onDone) {
    clearArea();
    var wrap = el('div', 'rc-chips'); var picked = [];
    options.forEach(function (o) {
      var b = el('button', 'rc-chip', esc(o)); b.type = 'button';
      b.onclick = function () {
        if (!multi) { onDone([o]); return; }
        var i = picked.indexOf(o);
        if (i > -1) { picked.splice(i, 1); b.classList.remove('on'); } else { picked.push(o); b.classList.add('on'); }
        go.disabled = !picked.length;
      };
      wrap.appendChild(b);
    });
    area.appendChild(wrap);
    if (multi) {
      var go = el('button', 'rc-send', 'Continue'); go.type = 'button'; go.disabled = true;
      go.onclick = function () { onDone(picked.slice()); };
      area.appendChild(el('div', 'rc-hint', 'Choose all that apply'));
      area.appendChild(go);
    }
  }

  function textInput(ph, onDone, optional) {
    clearArea();
    var f = el('form', 'rc-text');
    var i = el('input'); i.type = 'text'; i.placeholder = ph || 'Type your answer'; i.maxLength = 400; i.setAttribute('aria-label', 'Your answer');
    var b = el('button', 'rc-send', 'Send'); b.type = 'submit';
    f.appendChild(i); f.appendChild(b);
    f.onsubmit = function (e) { e.preventDefault(); var v = i.value.trim(); if (!v && !optional) { i.focus(); return; } onDone(v || 'Skipped'); };
    area.appendChild(f); setTimeout(function () { i.focus(); }, 50);
  }

  // ---------- Flow ----------
  function start() {
    if (state.started) return; state.started = true;
    bot('Hello, I’m <b>Riishi’s assistant</b>. I’ll ask a few short questions about your business, so Riishi can prepare before your call.', 300)
      .then(function () { return bot('<span class="rc-small">I’m an automated assistant, not Riishi himself. He reads this conversation before you speak. It takes about 3 minutes.</span>', 500); })
      .then(consent);
  }

  function consent() {
    clearArea();
    var lab = el('label', 'rc-consent');
    var c = el('input'); c.type = 'checkbox';
    lab.appendChild(c);
    lab.appendChild(document.createTextNode(' I agree that my answers are sent to Riishi to prepare for our call. '));
    var a = el('a', null, 'Privacy'); a.href = 'privacy.html'; a.target = '_blank'; lab.appendChild(a);
    var b = el('button', 'rc-send', 'Start'); b.type = 'button'; b.disabled = true;
    c.onchange = function () { b.disabled = !c.checked; };
    b.onclick = function () { me('Let’s start'); state.profile.consent = 'Yes, ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; askProfile(); };
    area.appendChild(lab); area.appendChild(b);
  }

  function askProfile() {
    bot('First, a few details about you.').then(function () {
      clearArea();
      var f = el('form', 'rc-form');
      var fields = [['name', 'Your name', 'text', true], ['email', 'Email', 'email', true], ['company', 'Company or organisation', 'text', false], ['country', 'Country', 'text', true], ['phone', 'Phone / WhatsApp (optional)', 'tel', false]];
      fields.forEach(function (x) {
        var i = el('input'); i.name = x[0]; i.type = x[2]; i.placeholder = x[1]; i.required = x[3]; i.setAttribute('aria-label', x[1]);
        f.appendChild(i);
      });
      var b = el('button', 'rc-send', 'Continue'); b.type = 'submit'; f.appendChild(b);
      f.onsubmit = function (e) {
        e.preventDefault();
        if (!f.checkValidity()) { f.reportValidity(); return; }
        ['name', 'email', 'company', 'country', 'phone'].forEach(function (k) { state.profile[k] = f.querySelector('[name="' + k + '"]').value.trim(); });
        me(state.profile.name + (state.profile.company ? ', ' + state.profile.company : '') + ' · ' + state.profile.country);
        askTopic();
      };
      area.appendChild(f);
    });
  }

  function askTopic(pre) {
    var first = state.profile.name.split(' ')[0];
    bot('Thanks, ' + esc(first) + '. What would you like to discuss with Riishi?').then(function () {
      chips(TOPICS.map(function (t) { return t.label; }), false, function (v) {
        me(v[0]);
        var t = TOPICS.filter(function (x) { return x.label === v[0]; })[0];
        state.topic = t;
        state.queue = Q[t.id].concat(COMMON.filter(function (c) { return !(c.skip || []).includes(t.id); }));
        next();
      });
    });
  }

  function next() {
    var q = state.queue.shift();
    if (!q) { reflect(); return; }
    bot(esc(q.q)).then(function () {
      var done = function (v) {
        var ans = Array.isArray(v) ? v.join(', ') : v;
        me(ans); state.answers.push({ k: q.k, q: q.q, a: ans }); next();
      };
      if (q.type === 'text') textInput(q.ph, done, false); else chips(q.o, q.type === 'many', done);
    });
  }

  function reflect() {
    var r = REFLECT[state.topic.id];
    bot('Thank you, that’s very helpful. Here is how I’d summarise it:')
      .then(function () { return bot('<div class="rc-card"><span>Problem type</span><b>' + esc(r.type) + '</b><span>Framework Riishi will likely use</span><b>' + esc(r.fw) + '</b><span>On the call</span><p>Riishi will likely look at ' + esc(r.focus) + '.</p></div>', 700); })
      .then(function () { return bot('If you have them handy, these will make the call more useful:<ul class="rc-prep">' + r.prep.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>', 600); })
      .then(function () { return bot('Anything else Riishi should know before the call?'); })
      .then(function () {
        textInput('Optional. Press Send to skip.', function (v) {
          me(v); state.answers.push({ k: 'Anything else', q: 'Anything else', a: v }); finish();
        }, true);
      });
  }

  function brief() {
    var p = state.profile, r = REFLECT[state.topic.id], L = [];
    L.push('PRE-CALL BRIEF – riishikalawatia.com assistant');
    L.push('');
    L.push('Name: ' + p.name); L.push('Email: ' + p.email);
    if (p.company) L.push('Company: ' + p.company);
    L.push('Country: ' + p.country);
    if (p.phone) L.push('Phone: ' + p.phone);
    L.push('Topic: ' + state.topic.label);
    L.push('');
    L.push('Problem type: ' + r.type);
    L.push('Suggested framework: ' + r.fw);
    L.push('');
    L.push('ANSWERS');
    state.answers.forEach(function (x) { L.push('- ' + x.k + ': ' + x.a); });
    L.push('');
    L.push('PREPARE FOR THE CALL');
    L.push('- Focus: ' + r.focus);
    r.prep.forEach(function (x) { L.push('- Ask for: ' + x); });
    var urg = (state.answers.filter(function (x) { return x.k === 'Urgency'; })[0] || {}).a;
    if (urg) L.push('- Urgency: ' + urg);
    L.push('');
    L.push('Consent: ' + p.consent);
    return L.join('\n');
  }

  function finish() {
    var text = brief();
    state.briefText = text;
    if (SEND_ENDPOINT) {
      fetch(SEND_ENDPOINT, { method: 'POST', headers: { 'Accept': 'application/json' }, body: (function () { var d = new FormData(); d.append('email', state.profile.email); d.append('name', state.profile.name); d.append('_subject', 'Pre-call brief: ' + state.profile.name + ' – ' + state.topic.label); d.append('message', text); return d; })() }).catch(function () {});
    }
    bot('All done. Riishi will read this before your call.').then(function () {
      clearArea();
      var row = el('div', 'rc-actions');
      var book = el('a', 'rc-send', 'Book a call with Riishi');
      if (BOOKING_URL) { book.href = BOOKING_URL + '?name=' + encodeURIComponent(state.profile.name) + '&email=' + encodeURIComponent(state.profile.email) + '&a1=' + encodeURIComponent('Topic: ' + state.topic.label + ' (pre-call chat completed)'); book.target = '_blank'; book.rel = 'noopener'; }
      else { book.href = '#enquiry'; book.onclick = function () { close(); }; }
      var wa = el('a', 'rc-ghost', 'Continue on WhatsApp');
      wa.href = 'https://wa.me/918951409744?text=' + encodeURIComponent('Hi Riishi, I just completed the pre-call chat on your website (' + state.topic.label + '). ' + state.profile.name);
      wa.target = '_blank'; wa.rel = 'noopener';
      var see = el('button', 'rc-link', 'See what Riishi receives'); see.type = 'button';
      see.onclick = function () { log.appendChild(el('pre', 'rc-brief', esc(text))); scroll(); see.remove(); };
      row.appendChild(book); row.appendChild(wa); row.appendChild(see);
      area.appendChild(row);
    });
  }

  // ---------- Build ----------
  function open() { panel.classList.add('open'); launcher.setAttribute('aria-expanded', 'true'); start(); }
  function close() { panel.classList.remove('open'); launcher.setAttribute('aria-expanded', 'false'); }

  function build() {
    launcher = el('button', 'rc-launch', '<span class="rc-av">R</span><span class="rc-lt"><b>Ask Riishi’s assistant</b><small>Prepare for a call</small></span>');
    launcher.type = 'button'; launcher.setAttribute('aria-expanded', 'false'); launcher.setAttribute('aria-controls', 'rc-panel');
    launcher.onclick = function () { panel.classList.contains('open') ? close() : open(); };

    panel = el('section', 'rc-panel'); panel.id = 'rc-panel'; panel.setAttribute('aria-label', 'Riishi’s assistant');
    var head = el('div', 'rc-head', '<span class="rc-av">R</span><div><b>Riishi’s assistant</b><small>Automated · Riishi reads every chat</small></div>');
    var x = el('button', 'rc-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close chat'); x.onclick = close; head.appendChild(x);
    log = el('div', 'rc-log'); log.setAttribute('aria-live', 'polite');
    area = el('div', 'rc-area');
    panel.appendChild(head); panel.appendChild(log); panel.appendChild(area);
    document.body.appendChild(panel); document.body.appendChild(launcher);

    document.querySelectorAll('[data-open-chat]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); open(); }); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  window.RiishiChat = { open: open, state: state };
})();
