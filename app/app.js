/* =========================================================================
   SKY FORGE — pilot-side app logic
   Demo build: no server. Demo accounts/cases come from demo-data.js;
   anything created in the browser is kept in localStorage so a pilot can
   sign back in with their generated case code on the same device.
   ========================================================================= */
(() => {
  const DEMO = window.SKYFORGE_DEMO || { partnerCodes: [], pilots: [] };

  /* ---------------- storage ---------------- */
  const KEYS = {
    accounts: 'sf_accounts_v1',   // { [accessCode]: { passphrase, createdAt } }
    extraCases: 'sf_cases_v1',    // { [accessCode]: [case, ...] }
    redeemed: 'sf_redeemed_v1',   // [partnerCode, ...]
    session: 'sf_session_v1',     // accessCode (sessionStorage)
  };
  const load = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const getSession = () => sessionStorage.getItem(KEYS.session);
  const setSession = (code) => sessionStorage.setItem(KEYS.session, code);
  const clearSession = () => sessionStorage.removeItem(KEYS.session);

  /* ---------------- accounts & cases ---------------- */
  const norm = (s) => (s || '').trim().toUpperCase();

  function findAccount(code) {
    code = norm(code);
    const demo = DEMO.pilots.find((p) => norm(p.accessCode) === code);
    if (demo) return { accessCode: norm(demo.accessCode), passphrase: demo.passphrase || '', demo };
    const local = load(KEYS.accounts, {})[code];
    if (local) return { accessCode: code, passphrase: local.passphrase || '', demo: null };
    return null;
  }

  function getCases(accessCode) {
    const account = findAccount(accessCode);
    const seeded = account?.demo ? account.demo.cases : [];
    const extra = load(KEYS.extraCases, {})[norm(accessCode)] || [];
    return [...seeded, ...extra].slice().sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  }

  function addCase(accessCode, caseObj) {
    const all = load(KEYS.extraCases, {});
    const code = norm(accessCode);
    all[code] = [...(all[code] || []), caseObj];
    save(KEYS.extraCases, all);
  }

  /* Unambiguous charset — no 0/O, 1/I/L */
  const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const block = (n) => Array.from({ length: n }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]).join('');
  const generateCode = () => `SF-${block(4)}-${block(4)}`;
  const generateCaseId = () => `SF-${block(4)}`;

  /* ---------------- partner codes ---------------- */
  function checkPartnerCode(input) {
    const code = norm(input);
    const entry = DEMO.partnerCodes.find((c) => norm(c.code) === code);
    if (!entry) return { ok: false, reason: 'That access code was not recognised. Check it and try again.' };
    if (!entry.reusable && load(KEYS.redeemed, []).includes(norm(entry.code))) {
      return { ok: false, reason: 'That access code has already been used. Each code can be redeemed once.' };
    }
    return { ok: true, entry };
  }
  function redeemPartnerCode(code) {
    const entry = DEMO.partnerCodes.find((c) => norm(c.code) === norm(code));
    if (!entry || entry.reusable) return;
    const redeemed = load(KEYS.redeemed, []);
    if (!redeemed.includes(norm(code))) save(KEYS.redeemed, [...redeemed, norm(code)]);
  }

  /* ---------------- screens ---------------- */
  const $ = (id) => document.getElementById(id);
  const screens = [...document.querySelectorAll('.screen')];

  function show(name) {
    screens.forEach((s) => { s.hidden = s.id !== `screen-${name}`; });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    updateNav();
  }

  function updateNav() {
    const code = getSession();
    $('nav-session').hidden = !code;
    if (code) $('nav-code').textContent = code;
  }

  /* ---------------- flow state ---------------- */
  const state = {
    pendingPartnerCode: null,  // partner code accepted but not yet redeemed
    pendingAccessCode: null,   // generated case credential awaiting confirmation
    newAccountFlow: false,     // true = first-time flow (access gate → credential)
    ackAt: null,               // confidentiality acknowledgement timestamp
    draft: null,               // intake draft awaiting review/submit
    urgentAcknowledged: false, // pilot passed the urgent interstitial
  };

  const STATUS_LABELS = {
    submitted: 'Submitted',
    under_review: 'Under review',
    response_available: 'Response available',
    more_info_requested: 'More info requested',
    closed: 'Closed',
  };

  const fail = (el, message) => { el.textContent = message; el.hidden = false; };
  const clearError = (el) => { el.hidden = true; };

  /* ================= WELCOME ================= */
  $('btn-start-intake').addEventListener('click', () => {
    if (getSession()) { startLoggedInReport(); return; }
    state.newAccountFlow = true;
    $('conf-step').hidden = false;
    show('access');
  });
  $('btn-goto-login').addEventListener('click', () => {
    if (getSession()) { renderInbox(); show('inbox'); return; }
    show('login');
  });

  document.querySelectorAll('[data-goto]').forEach((btn) =>
    btn.addEventListener('click', () => show(btn.dataset.goto)));

  /* ================= PARTNER ACCESS ================= */
  $('access-partner-name').textContent = DEMO.partnerName || 'our launch partner';

  $('form-access').addEventListener('submit', (e) => {
    e.preventDefault();
    const errorEl = $('error-partner-code');
    clearError(errorEl);
    const result = checkPartnerCode($('input-partner-code').value);
    if (!result.ok) { fail(errorEl, result.reason); return; }
    state.pendingPartnerCode = norm($('input-partner-code').value);
    show('confidentiality');
  });

  /* ================= CONFIDENTIALITY ================= */
  $('btn-conf-back').addEventListener('click', () => {
    show(state.newAccountFlow ? 'access' : 'inbox');
  });

  $('form-confidentiality').addEventListener('submit', (e) => {
    e.preventDefault();
    const errorEl = $('error-ack');
    clearError(errorEl);
    if (!$('check-ack').checked) {
      fail(errorEl, 'Please confirm you have read and understood before continuing.');
      return;
    }
    state.ackAt = new Date().toISOString();
    $('check-ack').checked = false;
    if (state.newAccountFlow) {
      state.pendingAccessCode = generateCode();
      $('generated-code').textContent = state.pendingAccessCode;
      show('credential');
    } else {
      openIntake();
    }
  });

  /* ================= CASE CREDENTIAL ================= */
  $('btn-copy-code').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.pendingAccessCode);
      $('btn-copy-code').textContent = 'Copied';
      setTimeout(() => { $('btn-copy-code').textContent = 'Copy'; }, 1600);
    } catch { /* clipboard unavailable — code stays visible on screen */ }
  });

  $('form-credential').addEventListener('submit', (e) => {
    e.preventDefault();
    const errorEl = $('error-saved');
    clearError(errorEl);
    if (!$('check-saved').checked) {
      fail(errorEl, 'Please save your access code first — it cannot be recovered later.');
      return;
    }
    // Create the account under the pre-generated code
    const passphrase = $('input-passphrase').value.trim();
    const accounts = load(KEYS.accounts, {});
    accounts[state.pendingAccessCode] = { passphrase, createdAt: new Date().toISOString() };
    save(KEYS.accounts, accounts);
    redeemPartnerCode(state.pendingPartnerCode);
    state.pendingPartnerCode = null;
    setSession(state.pendingAccessCode);
    $('input-passphrase').value = '';
    $('check-saved').checked = false;
    openIntake();
  });

  /* ================= LOGIN ================= */
  $('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const errorEl = $('error-login');
    clearError(errorEl);
    const account = findAccount($('input-login-code').value);
    const pass = $('input-login-pass').value;
    if (!account || (account.passphrase && account.passphrase !== pass)) {
      fail(errorEl, 'Case code or passphrase not recognised. Check both and try again.');
      return;
    }
    setSession(account.accessCode);
    $('form-login').reset();
    renderInbox();
    show('inbox');
  });

  /* ================= SIGN OUT ================= */
  $('btn-signout').addEventListener('click', () => {
    clearSession();
    state.draft = null;
    show('welcome');
  });

  /* ================= INBOX ================= */
  $('inbox-response-time').textContent = DEMO.expectedResponseText || 'soon';
  $('btn-new-report').addEventListener('click', startLoggedInReport);

  function startLoggedInReport() {
    state.newAccountFlow = false;
    $('conf-step').hidden = true;
    show('confidentiality');
  }

  function renderInbox() {
    const listEl = $('inbox-list');
    const cases = getCases(getSession());
    listEl.innerHTML = '';
    if (!cases.length) {
      listEl.innerHTML =
        '<div class="inbox__empty"><p>No reports yet. When you submit a confidential report, it will appear here along with its clinical-reviewed response.</p></div>';
      return;
    }
    for (const c of cases) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'casecard';
      const categories = (c.intake.categories || []).join(', ') || 'General wellbeing';
      const flag =
        c.riskFlag === 'urgent' ? '<span class="flag--urgent">Priority</span>' :
        c.riskFlag === 'elevated' ? '<span class="flag--elevated">Elevated</span>' : '';
      card.innerHTML = `
        <div class="casecard__main">
          <p class="casecard__id">${c.id}</p>
          <p class="casecard__sub">${c.submittedAt} · ${escapeHtml(categories)}</p>
        </div>
        <div class="casecard__side">
          ${flag}
          <span class="badge badge--${c.status}">${STATUS_LABELS[c.status] || c.status}</span>
        </div>`;
      card.addEventListener('click', () => openCase(c));
      listEl.appendChild(card);
    }
  }

  /* ================= CASE DETAIL ================= */
  $('btn-case-back').addEventListener('click', () => { renderInbox(); show('inbox'); });

  function openCase(c) {
    $('case-id').textContent = c.id;
    $('case-meta').textContent = `Submitted ${c.submittedAt}`;
    const statusEl = $('case-status');
    statusEl.textContent = STATUS_LABELS[c.status] || c.status;
    statusEl.className = `badge badge--${c.status}`;

    const hasResponse = !!c.response;
    $('case-response-block').hidden = !hasResponse;
    $('case-pending-block').hidden = hasResponse;
    if (hasResponse) {
      $('case-response-meta').textContent =
        `${c.response.type} · ${c.response.respondedAt} · Sky Forge clinical review pathway`;
      $('case-response-text').textContent = c.response.text;
      const resEl = $('case-resources');
      resEl.innerHTML = '';
      if (c.response.resources?.length) {
        const ul = document.createElement('ul');
        ul.className = 'resources';
        c.response.resources.forEach((r) => {
          const li = document.createElement('li');
          li.textContent = r;
          ul.appendChild(li);
        });
        resEl.appendChild(ul);
      }
    } else {
      $('case-pending-text').textContent =
        `Your report is in the clinical review queue. A response is usually available ${DEMO.expectedResponseText || 'soon'}. Sign back in with your case code to check.`;
    }

    renderSummary($('case-intake-summary'), c.intake);
    show('case');
  }

  /* ================= INTAKE ================= */
  const intakeForm = $('form-intake');
  $('input-severity').addEventListener('input', (e) => {
    $('severity-value').textContent = e.target.value;
  });
  $('btn-intake-cancel').addEventListener('click', () => {
    intakeForm.reset();
    $('severity-value').textContent = '5';
    if (getSession() && !state.newAccountFlow) { renderInbox(); show('inbox'); }
    else show('welcome');
  });

  function openIntake() {
    $('intake-step').hidden = !state.newAccountFlow;
    state.urgentAcknowledged = false;
    show('intake');
  }

  intakeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const errorEl = $('error-intake');
    clearError(errorEl);
    const data = new FormData(intakeForm);
    const emergency = data.get('emergency');
    if (!emergency) {
      fail(errorEl, 'Please answer the first question about immediate danger.');
      return;
    }
    if (!$('check-consent').checked) {
      fail(errorEl, 'Please tick the final confirmation before continuing.');
      return;
    }
    state.draft = {
      emergency,
      categories: data.getAll('category'),
      concernText: (data.get('concernText') || '').trim(),
      duration: data.get('duration') || '',
      severity: Number(data.get('severity')),
      impact: data.getAll('impact'),
      sleep: (data.get('sleep') || '').trim(),
      substance: data.get('substance') || '',
      physical: (data.get('physical') || '').trim(),
      preferred: data.getAll('preferred'),
    };
    if (emergency === 'Yes' && !state.urgentAcknowledged) {
      show('urgent');
      return;
    }
    openReview();
  });

  /* ================= URGENT ================= */
  $('btn-urgent-continue').addEventListener('click', () => {
    state.urgentAcknowledged = true;
    openReview();
  });
  $('btn-urgent-back').addEventListener('click', () => show('intake'));

  /* ================= REVIEW & SUBMIT ================= */
  function openReview() {
    renderSummary($('review-summary'), state.draft);
    show('review');
  }
  $('btn-edit-report').addEventListener('click', () => show('intake'));

  $('btn-submit-report').addEventListener('click', () => {
    if (!state.draft) { show('intake'); return; }
    const d = state.draft;
    const riskFlag =
      d.emergency === 'Yes' ? 'urgent' :
      (d.severity >= 7 || d.substance.startsWith('Yes')) ? 'elevated' : 'routine';
    const caseObj = {
      id: generateCaseId(),
      submittedAt: new Date().toISOString().slice(0, 10),
      status: 'submitted',
      riskFlag,
      ackAt: state.ackAt,
      intake: d,
      response: null,
    };
    addCase(getSession(), caseObj);
    state.draft = null;
    intakeForm.reset();
    $('severity-value').textContent = '5';

    $('confirm-case-id').textContent = caseObj.id;
    $('confirm-access-code').textContent = getSession();
    $('confirm-response-time').textContent = DEMO.expectedResponseText || 'soon';
    show('confirmation');
  });

  $('btn-confirm-inbox').addEventListener('click', () => { renderInbox(); show('inbox'); });

  /* ================= SUMMARY RENDERING ================= */
  const LABELS = [
    ['emergency', 'Immediate danger'],
    ['categories', 'Support with'],
    ['concernText', 'In your own words'],
    ['duration', 'Duration'],
    ['severity', 'Difficulty (0–10)'],
    ['impact', 'Affecting'],
    ['sleep', 'Sleep / fatigue'],
    ['substance', 'Alcohol / substance concern'],
    ['physical', 'Physical wellbeing'],
    ['preferred', 'Most helpful right now'],
  ];

  function renderSummary(el, intake) {
    el.innerHTML = '';
    for (const [key, label] of LABELS) {
      let value = intake[key];
      if (Array.isArray(value)) value = value.join(', ');
      if (value === undefined || value === null || value === '') continue;
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = String(value);
      row.append(dt, dd);
      el.appendChild(row);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  /* ================= BOOT ================= */
  $('year').textContent = new Date().getFullYear();
  if (getSession() && findAccount(getSession())) {
    renderInbox();
    show('inbox');
  } else {
    clearSession();
    show('welcome');
  }
})();
