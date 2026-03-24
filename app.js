/* ═══════════════════════════════════════════════════════════════
   Haven — Luxury Cruise Companion
   Norwegian Luna · April 4–11, 2026 · Suite 12846
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── State ───────────────────────────────────────────────────────
const state = {
  view: 'pin',  // 'pin' | 'main'
  pin: '',
  activeTab: 'today',
  who: null,    // 'fred' | 'holly' — who logged in
};

// ─── Content ──────────────────────────────────────────────────────
let itinerary = null;
let gfGuide = null;
let ports = null;
let spa = null;
let entertainment = null;
let tips = null;
let navigation = null;
let surprises = null;
let dailyBriefing = null;
let emergency = null;
let packing = null;
let moments = null;
let butler = null;

// ─── Connectivity State ───────────────────────────────────────────
let _isOnline = navigator.onLine;

function updateConnectivityState(online) {
  const wasOnline = _isOnline;
  _isOnline = online;
  renderOfflineBanner();
  if (online && !wasOnline) {
    // Reconnected — trigger background sync
    triggerContentSync();
  }
}

function triggerContentSync() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SYNC_CONTENT' });
  }
}

function renderOfflineBanner() {
  let banner = document.getElementById('offline-banner');
  if (!_isOnline) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.innerHTML = '📵 Offline mode — all content available from cache';
      document.body.appendChild(banner);
    }
    banner.style.display = 'flex';
  } else {
    if (banner) banner.style.display = 'none';
  }
}

window.addEventListener('online',  () => updateConnectivityState(true));
window.addEventListener('offline', () => updateConnectivityState(false));

// ─── Sailing Constants ────────────────────────────────────────────
const SAIL_DATE = new Date('2026-04-04T11:00:00-05:00');  // Miami ET
const RETURN_DATE = new Date('2026-04-11T07:00:00-05:00');
const FAIT_URL = 'https://fait.dev.fortressam.ai';

// ─── Venue Locations ──────────────────────────────────────────────
const VENUE_LOCATIONS = {
  'The Haven Restaurant': 'Deck 15, Aft (Haven exclusive)',
  'Haven Restaurant': 'Deck 15, Aft (Haven exclusive)',
  'Haven Pool': 'Deck 15, Aft (Haven exclusive)',
  'Haven Sundeck': 'Deck 15–16, Aft (Haven exclusive)',
  'Haven Lounge': 'Deck 15, Aft (Haven exclusive)',
  'Haven Lounge & Bar': 'Deck 15, Aft (Haven exclusive)',
  "Bull's Eye Bar": 'Deck 15, Aft (Haven exclusive)',
  "The Bull's Eye Bar": 'Deck 15, Aft (Haven exclusive)',
  'Haven Concierge': 'Deck 15, Aft (Haven exclusive)',
  'Starbucks': 'Deck 9, Midship (Penrose Atrium)',
  'Starbucks®': 'Deck 9, Midship (Penrose Atrium)',
  "Cagney's Steakhouse": 'Deck 9, Forward',
  "Cagney's": 'Deck 9, Forward',
  'Le Bistro': 'Deck 9, Forward',
  'Hasuki': 'Deck 9, Midship-forward',
  'Nama': 'Deck 9, Forward',
  'Nama Sushi': 'Deck 9, Forward',
  'Indulge Food Hall': 'Deck 9, Midship',
  "Syd Norman's": 'Deck 9, Midship',
  "Syd Norman's Pour House": 'Deck 9, Midship',
  'Swirl Wine Bar': 'Deck 9, Midship',
  'Whiskey Bar': 'Deck 9, Midship',
  'Casino': 'Deck 9, Midship',
  'Mandara Spa': 'Deck 16, Aft',
  'Mandara Spa & Salon': 'Deck 16, Aft',
  'Thermal Suite': 'Deck 16, Aft (inside Mandara Spa)',
  'Main Pool': 'Deck 16, Midship',
  'Waves Pool Bar': 'Deck 16, Midship',
  'Surfside Café': 'Deck 16, Midship-forward',
  'Pulse Fitness Center': 'Deck 15, Forward',
  'Observation Lounge': 'Deck 15, Forward',
  'Aqua SlideCoaster': 'Deck 16–19, Aft-midship',
  'Guest Services': 'Deck 9, Midship',
  'Shore Excursions': 'Deck 9, Midship',
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Measure actual header height and set CSS variable for sticky nav-tabs offset
function updateHeaderOffset() {
  const header = document.querySelector('.app-header');
  if (header) {
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  }
}
window.addEventListener('resize', updateHeaderOffset);

function linkVenueNames(html) {
  // Sort by length desc so longer names match first ("Onda by Scarpetta" before "Onda")
  const sorted = Object.keys(VENUE_LOCATIONS).sort((a, b) => b.length - a.length);
  for (const venue of sorted) {
    const loc = VENUE_LOCATIONS[venue];
    // Match the HTML-escaped version of the venue name (since html is already escaped)
    const htmlEncodedVenue = escapeHtml(venue);
    const escaped = htmlEncodedVenue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(escaped, 'g'),
      `<span class="venue-link" data-location="${escapeHtml(loc)}">${venue} 📍</span>`);
  }
  return html;
}

// ─── Venue Lookup FAB ─────────────────────────────────────────────
function addVenueFAB() {
  if (document.getElementById('venue-fab')) return; // no duplicates
  const fab = document.createElement('button');
  fab.id = 'venue-fab';
  fab.className = 'venue-fab';
  fab.innerHTML = '📍';
  fab.title = 'Find a venue';
  fab.setAttribute('aria-label', 'Find a venue');
  fab.onclick = showVenueLookup;
  document.body.appendChild(fab);
}

function showVenueLookup() {
  document.querySelectorAll('.venue-lookup-overlay').forEach(e => e.remove());

  // Build venue list from navigation.json venues array
  const venues = navigation?.venues || [];

  const overlay = document.createElement('div');
  overlay.className = 'venue-lookup-overlay';
  overlay.innerHTML = `
    <div class="venue-lookup-backdrop" onclick="this.closest('.venue-lookup-overlay').remove()"></div>
    <div class="venue-lookup-sheet">
      <div class="venue-lookup-header">
        <span class="venue-lookup-title">📍 Find a Venue</span>
        <button class="venue-lookup-close" onclick="this.closest('.venue-lookup-overlay').remove()">✕</button>
      </div>
      <div class="venue-lookup-search-wrap">
        <input type="text" class="venue-lookup-search" placeholder="Search venues…" autocomplete="off" autocorrect="off" spellcheck="false">
      </div>
      <div class="venue-lookup-list" id="venue-lookup-list"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Populate and filter
  const listEl = overlay.querySelector('#venue-lookup-list');
  const searchEl = overlay.querySelector('.venue-lookup-search');

  function renderVenueList(filter) {
    const q = (filter || '').toLowerCase().trim();
    const filtered = venues
      .filter(v => !q || (v.name || '').toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    if (!filtered.length) {
      listEl.innerHTML = '<div class="venue-lookup-empty">No venues found</div>';
      return;
    }

    listEl.innerHTML = filtered.map(v => `
      <div class="venue-lookup-item" data-venue-id="${escapeHtml(v.id || v.name)}">
        <div class="venue-lookup-name">${escapeHtml(v.name || '')}</div>
        <div class="venue-lookup-deck">${escapeHtml(v.deck ? 'Deck ' + v.deck : (v.location || ''))}</div>
      </div>
    `).join('');

    // Tap to show directions
    listEl.querySelectorAll('.venue-lookup-item').forEach(item => {
      item.addEventListener('click', () => {
        const venueName = item.querySelector('.venue-lookup-name').textContent;
        const venue = venues.find(v => v.name === venueName);
        if (venue) showVenueDetail(venue, overlay);
      });
    });
  }

  renderVenueList('');
  searchEl.addEventListener('input', e => renderVenueList(e.target.value));

  // Auto-focus search on desktop
  setTimeout(() => searchEl.focus(), 100);
}

function showVenueDetail(venue, overlayEl) {
  const sheet = overlayEl.querySelector('.venue-lookup-sheet');
  const fromSuite = venue.directions_from_suite || '';
  const toSuite = venue.directions_to_suite || '';

  sheet.innerHTML = `
    <div class="venue-lookup-header">
      <button class="venue-lookup-back" onclick="showVenueLookup(); this.closest('.venue-lookup-overlay').remove()">← Back</button>
      <button class="venue-lookup-close" onclick="this.closest('.venue-lookup-overlay').remove()">✕</button>
    </div>
    <div class="venue-detail-content">
      <h2 class="venue-detail-name">${escapeHtml(venue.name || '')}</h2>
      <div class="venue-detail-deck">📍 ${escapeHtml(venue.deck ? 'Deck ' + venue.deck : (venue.location || ''))}</div>
      ${venue.description ? `<p class="venue-detail-desc">${escapeHtml(venue.description)}</p>` : ''}
      ${fromSuite ? `
        <div class="venue-detail-dir">
          <div class="venue-dir-label">From Suite 12846</div>
          <div class="venue-dir-text">${escapeHtml(fromSuite)}</div>
        </div>` : ''}
      ${toSuite ? `
        <div class="venue-detail-dir">
          <div class="venue-dir-label">Back to Suite</div>
          <div class="venue-dir-text">${escapeHtml(toSuite)}</div>
        </div>` : ''}
    </div>
  `;
}

// ─── PIN Auth ─────────────────────────────────────────────────────
const PINS = { '1313': 'fred', '1009': 'holly', '0405': 'holly' };

function handlePinInput(digit) {
  if (state.pin.length >= 4) return;
  state.pin += digit;
  renderPinDots();
  if (state.pin.length === 4) {
    setTimeout(checkPin, 80);
  }
}

function handlePinBack() {
  if (state.pin.length > 0) {
    state.pin = state.pin.slice(0, -1);
    renderPinDots();
  }
}

function checkPin() {
  const who = PINS[state.pin];
  if (who) {
    state.who = who;
    sessionStorage.setItem('haven_view', 'main');
    sessionStorage.setItem('haven_who', who);
    navigateTo('main');
  } else {
    shakePinDisplay();
    document.getElementById('pin-error').textContent = 'Try again';
    document.getElementById('pin-error').classList.add('visible');
    setTimeout(() => {
      state.pin = '';
      renderPinDots();
      document.getElementById('pin-error').classList.remove('visible');
    }, 500);
  }
}

function renderPinDots() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < state.pin.length);
  });
}

function shakePinDisplay() {
  const dotsEl = document.getElementById('pin-dots-row');
  dotsEl.classList.remove('shake');
  void dotsEl.offsetWidth;
  dotsEl.classList.add('shake');
}

// ─── Navigation ───────────────────────────────────────────────────
function navigateTo(view) {
  state.view = view;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  if (view === 'pin') {
    document.getElementById('pin-screen').classList.add('active');
    state.pin = '';
    renderPinDots();
    return;
  }

  if (view === 'main') {
    document.getElementById('main-screen').classList.add('active');
    renderMainView();
    renderOfflineBanner();
    return;
  }
}

// ─── Content Loading ──────────────────────────────────────────────
async function loadContent() {
  try {
    const [itin, gf, p, s, ent, t, nav, surp, brief, emerg, pack, mom, btlr] = await Promise.all([
      fetch('content/itinerary.json').then(r => r.json()),
      fetch('content/gf-guide.json').then(r => r.json()),
      fetch('content/ports.json').then(r => r.json()),
      fetch('content/spa.json').then(r => r.json()),
      fetch('content/entertainment.json').then(r => r.json()),
      fetch('content/tips.json').then(r => r.json()),
      fetch('content/navigation.json').then(r => r.json()),
      fetch('content/surprises.json').then(r => r.json()).catch(() => null),
      fetch('content/daily-briefing.json').then(r => r.json()).catch(() => null),
      fetch('content/emergency.json').then(r => r.json()).catch(() => null),
      fetch('content/packing.json').then(r => r.json()).catch(() => null),
      fetch('content/moments.json').then(r => r.json()).catch(() => null),
      fetch('content/butler.json').then(r => r.json()).catch(() => null),
    ]);
    itinerary = itin;
    gfGuide = gf;
    ports = p;
    spa = s;
    entertainment = ent;
    tips = t;
    navigation = nav;
    surprises = surp;
    dailyBriefing = brief;
    emergency = emerg;
    packing = pack;
    moments = mom;
    butler = btlr;
  } catch (err) {
    console.warn('Content load error:', err);
  }
}

// ─── Date Utilities ───────────────────────────────────────────────
function getTodayDayIndex() {
  const now = new Date();
  const diff = Math.floor((now - SAIL_DATE) / (1000 * 60 * 60 * 24));
  if (diff < 0 || diff > 7) return -1;
  return diff;
}

function formatDate(dateStr) {
  const parts = dateStr.match(/(\w+)\s+(\d+)/);
  if (!parts) return dateStr;
  const d = new Date(`${parts[1]} ${parts[2]}, 2026`);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'long' });
}

function getSailing() {
  const now = new Date();
  const msUntil = SAIL_DATE - now;
  if (msUntil <= 0) {
    const msInto = now - SAIL_DATE;
    const msRemaining = RETURN_DATE - now;
    if (msRemaining <= 0) return { status: 'complete', text: 'Cruise complete — welcome home!' };
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    return { status: 'sailing', text: `Day ${getTodayDayIndex() + 1} of cruise · ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` };
  }
  const days = Math.floor(msUntil / (1000 * 60 * 60 * 24));
  const hours = Math.floor((msUntil % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return { status: 'upcoming', text: `${days} day${days !== 1 ? 's' : ''} until we sail` };
  return { status: 'upcoming', text: `${hours} hour${hours !== 1 ? 's' : ''} until we sail!` };
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatTime(t) {
  if (!t) return '';
  if (t.includes('am') || t.includes('pm')) return t;
  return t;
}

function getGFStatus(status) {
  const map = {
    safe:    { emoji: '✅', label: 'GF Safe',     cls: 'safe' },
    caution: { emoji: '⚠️', label: 'Use Caution', cls: 'caution' },
    avoid:   { emoji: '🚫', label: 'Avoid',       cls: 'avoid' },
  };
  return map[status] || map.caution;
}

// ─── Main View ───────────────────────────────────────────────────
function renderMainView() {
  // Add Surprises tab for Fred only
  if (state.who === 'fred') {
    const mainTabs = document.getElementById('main-tabs');
    if (mainTabs && !document.querySelector('[data-tab="surprises"]')) {
      const surpriseTab = document.createElement('button');
      surpriseTab.className = 'nav-tab';
      surpriseTab.dataset.tab = 'surprises';
      surpriseTab.onclick = () => switchFredTab('surprises');
      surpriseTab.textContent = '🎁';
      mainTabs.appendChild(surpriseTab);

      const scrollContent = document.querySelector('.scroll-content');
      if (scrollContent && !document.getElementById('tab-surprises')) {
        const surprisePanel = document.createElement('div');
        surprisePanel.id = 'tab-surprises';
        surprisePanel.className = 'tab-panel';
        scrollContent.appendChild(surprisePanel);
      }
    }
  }

  // Add Pack tab (visible before April 4, 2026)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const packHiddenAfter = packing?.hiddenAfter || '2026-04-04';
  if (today < packHiddenAfter) {
    const mainTabs = document.getElementById('main-tabs');
    if (mainTabs && !document.querySelector('[data-tab="pack"]')) {
      const tipsTab = document.querySelector('[data-tab="tips"]');
      const packTab = document.createElement('button');
      packTab.className = 'nav-tab';
      packTab.dataset.tab = 'pack';
      packTab.onclick = () => switchFredTab('pack');
      packTab.textContent = '🧳';
      if (tipsTab) {
        mainTabs.insertBefore(packTab, tipsTab);
      } else {
        mainTabs.appendChild(packTab);
      }

      const scrollContent = document.querySelector('.scroll-content');
      if (scrollContent && !document.getElementById('tab-pack')) {
        const packPanel = document.createElement('div');
        packPanel.id = 'tab-pack';
        packPanel.className = 'tab-panel';
        scrollContent.appendChild(packPanel);
      }
    }
  }

  switchFredTab(state.activeTab);
  setupVoice();
  setupAskInput();
  setupEmergencyTriggers();
  addVenueFAB();

  // Check surprises for Holly after initial load
  if (state.who === 'holly') {
    setTimeout(checkAndShowSurprises, 800);
  }
}

function switchFredTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `tab-${tab}`);
  });

  const panel = document.getElementById(`tab-${tab}`);
  if (!panel) return;

  switch (tab) {
    case 'today':     renderTodayTab(panel); break;
    case 'itinerary': renderItineraryTab(panel); break;
    case 'gf':        renderGFTab(panel); break;
    case 'ports':     renderPortsTab(panel); break;
    case 'spa':       renderSpaTab(panel); break;
    case 'entertainment': renderEntertainmentTab(panel); break;
    case 'tips':      renderTipsTab(panel); break;
    case 'decks':     renderDeckTab(panel); break;
    case 'pack':      renderPackingTab(panel); break;
    case 'surprises': renderSurprisesAdmin(panel); break;
  }

  // Check for surprises on Holly's Today tab
  if (tab === 'today' && state.who === 'holly') {
    setTimeout(checkAndShowSurprises, 500);
  }
}

// ─── Surprises ────────────────────────────────────────────────────
function checkAndShowSurprises() {
  if (!surprises || state.who !== 'holly') return;

  const now = new Date();
  // Use local date (not UTC) — toISOString() would return wrong date at night in CDT (UTC-5)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTime = now.toTimeString().slice(0, 5); // 'HH:MM'

  // Get revealed IDs from localStorage
  const revealedIds = JSON.parse(localStorage.getItem('haven_revealed_surprises') || '[]');

  // Find surprises for today at or before current time that haven't been revealed
  const toShow = surprises.surprises.filter(s =>
    s.date === today &&
    s.time <= currentTime &&
    !revealedIds.includes(s.id)
  );

  if (toShow.length === 0) return;

  // Show the first unrevealed surprise as a modal
  showSurpriseModal(toShow[0]);

  // Mark as revealed in localStorage
  const updated = [...revealedIds, toShow[0].id];
  localStorage.setItem('haven_revealed_surprises', JSON.stringify(updated));
}

function showSurpriseModal(surprise) {
  // Remove any existing surprise modal
  document.querySelectorAll('.surprise-modal').forEach(m => m.remove());

  const modal = document.createElement('div');
  modal.className = 'surprise-modal';
  modal.innerHTML = `
    <div class="surprise-modal-overlay" onclick="this.closest('.surprise-modal').remove()"></div>
    <div class="surprise-modal-card">
      <div class="surprise-icon">${surprise.icon}</div>
      <h2 class="surprise-title">${surprise.title}</h2>
      <p class="surprise-message">${surprise.message}</p>
      <button class="surprise-dismiss" onclick="this.closest('.surprise-modal').remove()">
        Close ✕
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

// ─── Emergency Overlay ────────────────────────────────────────
let _emergencyPressTimer = null;

function showEmergencyOverlay() {
  document.querySelectorAll('.emergency-overlay').forEach(e => e.remove());
  
  if (!emergency) {
    // Show placeholder if content not yet loaded
    const msg = document.createElement('div');
    msg.className = 'emergency-overlay';
    msg.innerHTML = `
      <div class="emergency-backdrop" onclick="this.closest('.emergency-overlay').remove()"></div>
      <div class="emergency-card">
        <div class="emergency-header">
          <span class="emergency-title">⚠️ Emergency Info</span>
          <button class="emergency-close" onclick="this.closest('.emergency-overlay').remove()">✕</button>
        </div>
        <p style="color:#e0e0e0;padding:16px">Loading emergency info… try again in a moment.</p>
      </div>`;
    document.body.appendChild(msg);
    return;
  }
  
  const items = Object.values(emergency).map(item => `
    <div class="emergency-item">
      <div class="emergency-item-label">${escapeHtml(item.label)}</div>
      <div class="emergency-item-value">${escapeHtml(item.value)}</div>
      ${item.phone ? `<div class="emergency-item-detail">📞 ${escapeHtml(item.phone)}</div>` : ''}
      ${item.hours ? `<div class="emergency-item-detail">🕐 ${escapeHtml(item.hours)}</div>` : ''}
      ${item.note ? `<div class="emergency-item-note">${escapeHtml(item.note)}</div>` : ''}
    </div>
  `).join('');
  
  const overlay = document.createElement('div');
  overlay.className = 'emergency-overlay';
  overlay.innerHTML = `
    <div class="emergency-backdrop" onclick="this.closest('.emergency-overlay').remove()"></div>
    <div class="emergency-card">
      <div class="emergency-header">
        <span class="emergency-title">⚠️ Emergency & Practical Info</span>
        <button class="emergency-close" onclick="this.closest('.emergency-overlay').remove()">✕</button>
      </div>
      <div class="emergency-items">${items}</div>
      <div class="emergency-footer">Tap outside to dismiss</div>
    </div>`;
  document.body.appendChild(overlay);
}

function attachEmergencyTrigger(el) {
  if (!el) return;
  el.addEventListener('touchstart', () => {
    _emergencyPressTimer = setTimeout(showEmergencyOverlay, 600);
  }, { passive: true });
  el.addEventListener('touchend', () => clearTimeout(_emergencyPressTimer));
  el.addEventListener('touchmove', () => clearTimeout(_emergencyPressTimer));
  // Desktop: right-click or contextmenu
  el.addEventListener('contextmenu', e => { e.preventDefault(); showEmergencyOverlay(); });
}

function addEmergencyButton() {
  const headerActions = document.querySelector('.header-actions');
  if (!headerActions || document.querySelector('.emergency-btn')) return;
  const btn = document.createElement('button');
  btn.className = 'emergency-btn';
  btn.textContent = '⚠️';
  btn.title = 'Emergency Info (long press Haven logo)';
  btn.onclick = showEmergencyOverlay;
  headerActions.insertBefore(btn, headerActions.firstChild);
}

function setupEmergencyTriggers() {
  // Attach long-press to the Haven avatar
  const avatar = document.querySelector('.header-avatar');
  attachEmergencyTrigger(avatar);
  // Also attach to wordmark
  const wordmark = document.querySelector('.haven-wordmark-sm');
  attachEmergencyTrigger(wordmark);
  // Add the always-visible button
  addEmergencyButton();
}

function renderSurprisesAdmin(panel) {
  if (!surprises) {
    panel.innerHTML = '<p class="text-muted">Loading surprises...</p>';
    return;
  }

  const revealedIds = JSON.parse(localStorage.getItem('haven_revealed_surprises') || '[]');

  const items = surprises.surprises.map(s => {
    const status = revealedIds.includes(s.id) ? '✅ Revealed' : '⏳ Pending';
    return `<div class="surprise-admin-item">
      <div class="surprise-admin-meta">${s.date} at ${s.time} — ${status}</div>
      <div class="surprise-admin-title">${s.icon} ${s.title}</div>
      <div class="surprise-admin-msg">${s.message}</div>
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="section-header"><span class="section-title">Anniversary Surprises</span></div>
    <p class="text-muted" style="font-size:0.85rem;margin-bottom:1rem">
      Scheduled surprises for Holly. Each one reveals as a modal at the specified date/time.
    </p>
    <div class="surprise-admin-list">${items}</div>
  `;
}

// ─── Morning Briefing ─────────────────────────────────────────────
function getTodayBriefing() {
  if (!dailyBriefing || !dailyBriefing.briefings) return null;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return dailyBriefing.briefings.find(b => b.date === todayStr) || null;
}

// ─── Couples Moment Prompter ──────────────────────────────────────
function getDailyMoments() {
  if (!moments || !moments.moments) return [];
  
  const now = new Date();
  const hour = now.getHours();
  
  // Determine time of day
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  
  // Determine day type from itinerary
  const dayIdx = getTodayDayIndex();
  const dayType = dayIdx >= 0 && itinerary?.days?.[dayIdx]?.type === 'port' ? 'port' : 'sea';
  
  // Date-seeded deterministic selection — same prompts all day, changes at midnight
  const today = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const seed = parseInt(today);
  function seededRandom(s) { let x = Math.sin(s) * 10000; return x - Math.floor(x); }
  
  // Filter to relevant moments (matching timeOfDay or 'any', matching dayType or 'any')
  const eligible = moments.moments.filter(m =>
    (m.timeOfDay === timeOfDay || m.timeOfDay === 'any') &&
    (m.dayType === dayType || m.dayType === 'any')
  );
  
  if (eligible.length === 0) return moments.moments.slice(0, 2); // fallback
  
  // Pick 2 deterministically using seed
  const idx1 = Math.floor(seededRandom(seed) * eligible.length);
  const idx2 = Math.floor(seededRandom(seed + 1) * eligible.length);
  const picks = [eligible[idx1]];
  if (idx2 !== idx1) picks.push(eligible[idx2]);
  
  return picks;
}

function renderMomentCards() {
  if (state.who !== 'fred') return '';
  const picks = getDailyMoments();
  if (!picks.length) return '';
  
  const cards = picks.map(m => `
    <div class="moment-card" data-id="${escapeHtml(m.id)}">
      <div class="moment-icon">💫</div>
      <div class="moment-text">${escapeHtml(m.text)}</div>
      <button class="moment-dismiss" onclick="this.closest('.moment-card').style.display='none'">
        Dismiss
      </button>
    </div>
  `).join('');
  
  return `
    <div class="moments-section">
      <div class="moments-label">Today's moments</div>
      ${cards}
    </div>
  `;
}

function renderMorningBriefing(briefing) {
  if (!briefing) return '';
  const highlightsHtml = briefing.highlights
    .map(h => `<div class="briefing-highlight"><span class="briefing-icon">${h.icon}</span><span>${h.text}</span></div>`)
    .join('');

  return `
    <div class="briefing-card">
      <div class="briefing-header">
        <span class="briefing-gold-title">Good Morning</span>
        <span class="briefing-day-label">${briefing.dayLabel}</span>
      </div>
      <p class="briefing-greeting">${briefing.greeting}</p>
      <div class="briefing-highlights">${highlightsHtml}</div>
      ${briefing.gfTip ? `<div class="briefing-gf-tip">🌾 <strong>GF:</strong> ${briefing.gfTip}</div>` : ''}
      ${briefing.reminder ? `<div class="briefing-reminder">📌 ${briefing.reminder}</div>` : ''}
    </div>
  `;
}

function renderPortCountdown(day) {
  if (!day.arrivalTime || !day.allAboardTime) return '';
  
  const now = new Date();
  
  // Build Date objects for arrival and all-aboard (treat as local time)
  const [arrHr, arrMin] = day.arrivalTime.split(':').map(Number);
  const [aabHr, aabMin] = day.allAboardTime.split(':').map(Number);
  const arrival = new Date(now.getFullYear(), now.getMonth(), now.getDate(), arrHr, arrMin, 0);
  const allAboard = new Date(now.getFullYear(), now.getMonth(), now.getDate(), aabHr, aabMin, 0);
  
  const msUntilArrival = arrival - now;
  const msUntilAllAboard = allAboard - now;
  
  // Format countdown
  function fmtMs(ms) {
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  
  // All-aboard urgency color
  let aabClass = 'port-aab-normal';
  if (msUntilAllAboard > 0 && msUntilAllAboard < 3600000) aabClass = 'port-aab-red';
  else if (msUntilAllAboard > 0 && msUntilAllAboard < 7200000) aabClass = 'port-aab-amber';
  
  const arrivalStr = fmtMs(msUntilArrival);
  const allAboardStr = fmtMs(msUntilAllAboard);
  
  const tenderHtml = day.tender
    ? `<div class="port-tender-yes">⛵ Tender port — allow extra time back to ship</div>`
    : `<div class="port-tender-no">🚢 Docked — easy return, no tender</div>`;
  
  let html = `<div class="port-countdown-card">
    <div class="port-countdown-title">📍 ${day.port || day.location || 'Port Day'}</div>
    ${arrivalStr 
      ? `<div class="port-stat"><span class="port-stat-label">Ship arrives</span><span class="port-stat-value">${day.arrivalTime} (${arrivalStr} from now)</span></div>` 
      : `<div class="port-stat"><span class="port-stat-label">Ship arrived</span><span class="port-stat-value">${day.arrivalTime} ✅</span></div>`}
    <div class="port-stat ${aabClass}"><span class="port-stat-label">All aboard</span><span class="port-stat-value">${day.allAboardTime}${allAboardStr ? ` — ${allAboardStr} remaining` : ' — PASSED'}</span></div>
    ${tenderHtml}
  </div>`;
  
  return html;
}

function renderTodayTab(panel) {
  const dayIdx = getTodayDayIndex();
  const sailing = getSailing();
  const day = (itinerary && dayIdx >= 0) ? itinerary.days[dayIdx] : null;
  const briefing = getTodayBriefing();

  let html = `
    <div class="dashboard-grid">
      <div class="dashboard-stat">
        <div class="dashboard-stat-label">Suite</div>
        <div class="dashboard-stat-value" style="font-size:1rem">12846</div>
        <div class="dashboard-stat-sub">Haven King H5</div>
      </div>
      <div class="dashboard-stat">
        <div class="dashboard-stat-label">Status</div>
        <div class="dashboard-stat-value" style="font-size:0.85rem;color:var(--text)">${sailing.status === 'sailing' ? '⚓' : '🗓'}</div>
        <div class="dashboard-stat-sub">${sailing.text}</div>
      </div>
    </div>`;

  // Morning briefing card (if available for today)
  html += renderMorningBriefing(briefing);

  // Port day countdown (if port day with arrival/all-aboard times)
  if (day) {
    html += renderPortCountdown(day);
  }

  // Sunset golden hour widget (shows within 90 min of sunset)
  if (day) {
    html += renderSunsetWidget(day);
  }

  // Couples moment prompter (Fred only)
  html += renderMomentCards();

  if (day) {
    html += `
    <div class="section-header"><span class="section-title">Today · ${escapeHtml(day.date)}</span></div>
    <div class="card card-gold">
      <div class="card-header">
        <span class="card-title">${escapeHtml(day.port)}</span>
        <span class="gf-badge safe">Haven</span>
      </div>
      <p style="font-size:0.875rem;color:var(--text-muted);line-height:1.65">${escapeHtml(day.notes)}</p>
      ${day.reservations && day.reservations.length ? `
      <div style="margin-top:0.75rem">
        <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:0.4rem">Reservations</div>
        ${day.reservations.map(r => `<div style="font-size:0.85rem;padding:0.2rem 0;color:var(--gold)">· ${escapeHtml(r)}</div>`).join('')}
      </div>` : ''}
    </div>`;
  } else {
    html += `
    <div class="card">
      <p style="color:var(--text-muted);font-size:0.9rem">${sailing.text}</p>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">Norwegian Luna · Miami departure April 4, 2026</p>
    </div>`;
  }

  // Chat
  html += `
    <div class="section-header" style="margin-top:1.25rem"><span class="section-title">Ask Haven</span></div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="chat-messages" class="chat-messages" style="max-height:280px"></div>
      <div class="chat-input-area">
        <textarea id="chat-input" class="chat-input" placeholder="Ask about GF options, schedule, ports…" rows="1"></textarea>
        <button class="chat-send" onclick="sendChat()" aria-label="Send">➤</button>
      </div>
    </div>
`;

  panel.innerHTML = html;
  setupChatInput();
  addChatMessage('assistant', `Good ${getTimeOfDay()}, Fred. ${day ? `Today is ${day.date} — ${day.port}.` : 'Your cruise to the Norwegian Luna awaits.'} How can I help?`);
}

function renderItineraryTab(panel) {
  if (!itinerary) { panel.innerHTML = '<p class="text-muted">Loading…</p>'; return; }
  const todayIdx = getTodayDayIndex();

  let html = '';
  itinerary.days.forEach((day, i) => {
    const isToday = i === todayIdx;
    html += `
    <div class="itinerary-day${isToday ? ' today' : ''}">
      <div class="day-header" onclick="toggleDayBody(this)">
        <div>
          <div class="day-name">${escapeHtml(day.date)} · ${escapeHtml(day.day)}</div>
          <div class="day-port">${escapeHtml(day.port)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem">
          ${isToday ? '<span class="day-pill today-pill">Today</span>' : `<span class="day-pill">Day ${i + 1}</span>`}
          <span style="color:var(--text-muted);font-size:0.8rem">${isToday ? '▲' : '▼'}</span>
        </div>
      </div>
      <div class="day-body" style="${isToday ? '' : 'display:none'}">
        <p style="font-size:0.875rem;color:var(--text-muted);line-height:1.65;margin-bottom:0.75rem">${escapeHtml(day.notes)}</p>
        ${day.times ? `<div style="font-size:0.8rem;color:var(--gold);margin-bottom:0.5rem">🕐 ${escapeHtml(day.times)}</div>` : ''}
        ${day.reservations && day.reservations.length ? `
        <div style="margin-top:0.5rem">
          ${day.reservations.map(r => `<div style="font-size:0.8rem;padding:0.15rem 0;color:var(--text-muted)">· ${escapeHtml(r)}</div>`).join('')}
        </div>` : ''}
      </div>
    </div>`;
  });

  panel.innerHTML = linkVenueNames(html);
}

function toggleDayBody(header) {
  const body = header.nextElementSibling;
  const arrow = header.querySelector('span:last-child');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
}

function renderGFTab(panel) {
  if (!gfGuide) { panel.innerHTML = '<p class="text-muted">Loading…</p>'; return; }

  let html = `
    <div class="card card-gold" style="margin-bottom:1rem">
      <div class="card-title" style="margin-bottom:0.5rem">Holly's Profile</div>
      <p style="font-size:0.875rem;color:var(--text-muted);line-height:1.6">${escapeHtml(gfGuide.holly_profile)}</p>
    </div>
    <div class="section-header"><span class="section-title">Day 1 Checklist</span></div>
    <div class="card" style="margin-bottom:1rem">
      ${gfGuide.first_day_checklist.map((item, i) => `
      <div style="display:flex;gap:0.75rem;padding:0.4rem 0;${i > 0 ? 'border-top:1px solid rgba(255,255,255,0.05)' : ''}">
        <span style="color:var(--gold);font-size:0.8rem;margin-top:2px;flex-shrink:0">${i + 1}.</span>
        <span style="font-size:0.875rem;color:var(--text-muted)">${escapeHtml(item)}</span>
      </div>`).join('')}
    </div>
    <div class="section-header"><span class="section-title">Restaurants</span></div>`;

  gfGuide.restaurants.forEach(r => {
    const status = getGFStatus(r.gf_status);
    html += `
    <div class="restaurant-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.4rem">
        <div>
          <div class="restaurant-name">${escapeHtml(r.name)}</div>
          <div class="restaurant-meta">${escapeHtml(r.location)}${r.hours ? ' · ' + escapeHtml(r.hours) : ''}</div>
        </div>
        <span class="gf-badge ${status.cls}">${status.emoji} ${status.label}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-muted);line-height:1.6;margin-bottom:0.5rem">${escapeHtml(r.notes)}</p>
      ${r.safe_items && r.safe_items.length ? `
      <div style="margin-bottom:0.4rem">
        <span style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--safe)">✓ Safe: </span>
        <span style="font-size:0.8rem;color:var(--text-muted)">${r.safe_items.map(s => escapeHtml(s)).join(', ')}</span>
      </div>` : ''}
      ${r.avoid && r.avoid.length ? `
      <div style="margin-bottom:0.4rem">
        <span style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--warn)">✗ Avoid: </span>
        <span style="font-size:0.8rem;color:var(--text-muted)">${r.avoid.map(s => escapeHtml(s)).join(', ')}</span>
      </div>` : ''}
      ${r.ask_for ? `<div style="font-size:0.8rem;color:var(--gold);margin-top:0.4rem;font-style:italic">"${escapeHtml(r.ask_for)}"</div>` : ''}
      ${r.verdict ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.4rem;font-weight:600">${escapeHtml(r.verdict)}</div>` : ''}
    </div>`;
  });

  panel.innerHTML = linkVenueNames(html);
}

function renderPortsTab(panel) {
  if (!ports) { panel.innerHTML = '<p class="text-muted">Loading…</p>'; return; }

  const portList = ports.ports || ports;
  let html = '';

  (Array.isArray(portList) ? portList : Object.values(portList)).forEach(p => {
    html += `
    <div class="port-card">
      <div class="port-card-header">
        <div>
          <div class="port-name">${escapeHtml(p.name || p.port)}</div>
          <div class="port-country">${escapeHtml(p.country || p.date || '')}</div>
        </div>
      </div>
      <div class="port-card-body">
        ${(p.arrival || p.departure) ? `
        <div class="port-times">
          ${p.arrival ? `<div class="port-time-item"><div class="port-time-label">Arrive</div><div class="port-time-value">${escapeHtml(p.arrival)}</div></div>` : ''}
          ${p.departure ? `<div class="port-time-item"><div class="port-time-label">Depart</div><div class="port-time-value">${escapeHtml(p.departure)}</div></div>` : ''}
        </div>` : ''}
        ${p.notes ? `<p style="font-size:0.85rem;color:var(--text-muted);line-height:1.6;margin-bottom:0.5rem">${escapeHtml(p.notes)}</p>` : ''}
        ${p.highlights && p.highlights.length ? `
        <ul class="port-highlights">
          ${p.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
        </ul>` : ''}
        ${p.gf_tip ? `<div style="font-size:0.8rem;color:var(--gold);margin-top:0.6rem">🍽 GF: ${escapeHtml(p.gf_tip)}</div>` : ''}
      </div>
    </div>`;
  });

  panel.innerHTML = linkVenueNames(html) || '<p class="text-muted">Port information loading…</p>';
}

function renderSpaTab(panel) {
  if (!spa) { panel.innerHTML = '<p class="text-muted">Loading…</p>'; return; }

  let html = '';

  // Booked treatments highlight
  if (spa.booked) {
    html += `
    <div class="section-header"><span class="section-title">Holly's Booked</span></div>
    <div class="card card-gold" style="margin-bottom:1rem">
      ${spa.booked.map(b => `
      <div style="padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="font-weight:600;font-size:0.9rem">${escapeHtml(typeof b === 'string' ? b : (b.name || ''))}</div>
        ${b.time ? `<div style="font-size:0.8rem;color:var(--gold)">${escapeHtml(b.time)}</div>` : ''}
        ${b.notes ? `<div style="font-size:0.8rem;color:var(--text-muted)">${escapeHtml(b.notes)}</div>` : ''}
      </div>`).join('')}
    </div>`;
  }

  const sections = spa.categories || spa.sections || (spa.treatments ? [{ title: 'Treatments', items: spa.treatments }] : []);

  sections.forEach(sec => {
    html += `<div class="section-header"><span class="section-title">${escapeHtml(sec.title || sec.name)}</span></div><div class="card" style="margin-bottom:0.75rem">`;
    (sec.items || sec.treatments || []).forEach(t => {
      html += `
      <div class="spa-treatment">
        <div>
          <div class="spa-treatment-name">${escapeHtml(t.name)}</div>
          ${t.duration ? `<div class="spa-treatment-duration">${escapeHtml(t.duration)}</div>` : ''}
          ${t.notes ? `<div class="spa-treatment-duration">${escapeHtml(t.notes)}</div>` : ''}
        </div>
        ${t.price ? `<div class="spa-treatment-price">${escapeHtml(t.price)}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  });

  if (spa.thermal_suite) {
    const ts = spa.thermal_suite;
    const overview = typeof ts === 'string' ? ts : (ts.overview || '');
    const passInfo = (ts.passes && typeof ts.passes === 'object')
      ? `<div style="margin-top:0.6rem;font-size:0.8rem;color:var(--gold)">Day pass: ${escapeHtml(String(ts.passes.single_day || ''))} · Week pass: ${escapeHtml(String(ts.passes.week_pass || ''))}</div>`
      : '';
    html += `
    <div class="section-header"><span class="section-title">${escapeHtml(ts.name || 'Thermal Suite')}</span></div>
    <div class="card">
      <p style="font-size:0.875rem;color:var(--text-muted);line-height:1.6">${escapeHtml(overview)}</p>
      ${passInfo}
    </div>`;
  }

  if (spa.tips) {
    html += `
    <div class="section-header"><span class="section-title">Spa Tips</span></div>`;
    spa.tips.forEach(t => {
      html += `<div class="tip-item">${escapeHtml(t)}</div>`;
    });
  }

  panel.innerHTML = linkVenueNames(html) || '<p class="text-muted">Spa information loading…</p>';
}

function renderEntertainmentTab(panel) {
  if (!entertainment) { panel.innerHTML = '<p class="text-muted">Loading…</p>'; return; }

  let html = '';
  const shows = entertainment.shows || entertainment.events || (Array.isArray(entertainment) ? entertainment : []);

  if (shows.length) {
    html += `<div class="section-header"><span class="section-title">Shows & Events</span></div>`;
    shows.forEach(show => {
      const timeParts = (show.time || '').split(' ');
      html += `
      <div class="show-card">
        <div class="show-time-block">
          <div class="show-time">${escapeHtml(timeParts[0] || show.time || '')}</div>
          <div class="show-period">${escapeHtml(timeParts[1] || '')}</div>
        </div>
        <div class="show-info">
          <div class="show-name">${escapeHtml(show.name || show.title)}</div>
          ${show.venue ? `<div class="show-venue">${escapeHtml(show.venue)}</div>` : ''}
          ${show.description || show.desc ? `<div class="show-desc">${escapeHtml(show.description || show.desc)}</div>` : ''}
          ${show.notes ? `<div class="show-desc" style="color:var(--gold)">${escapeHtml(show.notes)}</div>` : ''}
        </div>
      </div>`;
    });
  }

  const venues = entertainment.venues || entertainment.bars || [];
  if (venues.length) {
    html += `<div class="section-header" style="margin-top:0.5rem"><span class="section-title">Venues & Bars</span></div>`;
    venues.forEach(v => {
      html += `
      <div class="card" style="margin-bottom:0.75rem">
        <div style="font-weight:600;margin-bottom:0.3rem">${escapeHtml(v.name)}</div>
        ${v.description || v.desc ? `<p style="font-size:0.85rem;color:var(--text-muted);line-height:1.5">${escapeHtml(v.description || v.desc)}</p>` : ''}
        ${v.hours ? `<div style="font-size:0.8rem;color:var(--gold);margin-top:0.3rem">${escapeHtml(v.hours)}</div>` : ''}
      </div>`;
    });
  }

  panel.innerHTML = linkVenueNames(html) || '<p class="text-muted">Entertainment information loading…</p>';
}

// ─── Butler Quick-Request Templates ────────────────────────────────
function renderButlerCard() {
  if (!butler) return '';
  
  // Load custom requests from localStorage
  const customItems = JSON.parse(localStorage.getItem(butler.customStorageKey || 'haven_butler_custom') || '[]');
  const allTemplates = [...butler.templates, ...customItems];
  
  const itemsHtml = allTemplates.map(t => `
    <div class="butler-item" data-text="${escapeHtml(t.text)}">
      <span class="butler-icon">${t.icon || '📋'}</span>
      <span class="butler-label">${escapeHtml(t.label || t.text)}</span>
      <button class="butler-copy" data-text="${escapeHtml(t.text)}" onclick="copyButlerRequest(this)">Copy</button>
    </div>
  `).join('');
  
  return `
    <div class="butler-card">
      <div class="butler-header">🛎️ Butler Requests</div>
      <div class="butler-subtitle">Tap Copy, then call or text your butler.</div>
      <div class="butler-list">${itemsHtml}</div>
      <button class="butler-add-btn" onclick="showAddButlerRequest()">+ Add Custom Request</button>
    </div>
  `;
}

function copyButlerRequest(btn) {
  const text = btn.dataset.text;
  navigator.clipboard.writeText(text).then(() => {
    showButlerToast('Copied! Now call or text your butler. 📞');
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showButlerToast('Copied! Now call or text your butler. 📞');
  });
}

function showButlerToast(message) {
  document.querySelectorAll('.butler-toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = 'butler-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('butler-toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('butler-toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// === SUNSET WIDGET (ADO#1094) ===
function renderSunsetWidget(day) {
  if (!day || !day.sunsetTime) return '';
  
  const now = new Date();
  const [ssHr, ssMn] = day.sunsetTime.split(':').map(Number);
  const sunset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ssHr, ssMn, 0);
  
  const msUntil = sunset - now;
  
  // Only show widget within 90 minutes before sunset, and not after sunset
  if (msUntil <= 0 || msUntil > 90 * 60 * 1000) return '';
  
  const minutesLeft = Math.round(msUntil / 60000);
  const urgency = minutesLeft <= 15 ? 'sunset-urgent' : minutesLeft <= 30 ? 'sunset-soon' : '';
  
  const viewingSpots = [
    '🌅 Haven Sundeck — Deck 15, Aft (Haven elevator)',
    '🚢 The Waterfront — Deck 8 Promenade (wrap-around)',
    '🔭 Observation Lounge — Deck 15, Forward (panoramic windows)'
  ];
  
  return `
    <div class="sunset-widget ${urgency}">
      <div class="sunset-header">
        <span class="sunset-emoji">🌅</span>
        <span class="sunset-countdown">Sunset in <strong>${minutesLeft} min</strong></span>
        <button class="sunset-notify-btn" id="sunset-notify-btn" onclick="requestSunsetNotification(${minutesLeft})" title="Remind me">🔔</button>
      </div>
      <div class="sunset-spots">
        ${viewingSpots.map(s => `<div class="sunset-spot">${escapeHtml(s)}</div>`).join('')}
      </div>
    </div>
  `;
}

function requestSunsetNotification(minutesLeft) {
  if (!('Notification' in window)) {
    showButlerToast('Notifications not supported on this browser.');
    return;
  }
  
  if (Notification.permission === 'granted') {
    scheduleSunsetNotification(minutesLeft);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') scheduleSunsetNotification(minutesLeft);
    });
  } else {
    showButlerToast('Notifications blocked — enable in browser settings.');
  }
}

function scheduleSunsetNotification(minutesLeft) {
  const notifyInMs = Math.max(0, (minutesLeft - 30) * 60000);
  const btn = document.getElementById('sunset-notify-btn');
  if (btn) { btn.textContent = '✅'; btn.disabled = true; }
  
  if (notifyInMs <= 0) {
    // Less than 30 min until sunset — notify immediately
    new Notification('🌅 Sunset Now!', {
      body: 'Head to the Haven Sundeck or Observation Lounge — sunset is happening now.',
      icon: '/icons/icon-192.svg'
    });
    showButlerToast('Sunset is happening now — head to the deck! 🌅');
    return;
  }
  
  setTimeout(() => {
    new Notification('🌅 Sunset in 30 minutes', {
      body: 'Best viewing: Haven Sundeck (Deck 15) or Observation Lounge. Get there now!',
      icon: '/icons/icon-192.svg'
    });
  }, notifyInMs);
  
  showButlerToast(`Sunset reminder set for ${Math.round(notifyInMs/60000)} min from now. 🌅`);
}

function showAddButlerRequest() {
  const text = prompt('Enter your custom butler request:');
  if (!text || !text.trim()) return;
  
  const key = butler?.customStorageKey || 'haven_butler_custom';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push({
    id: 'custom_' + Date.now(),
    text: text.trim(),
    icon: '📋',
    label: text.trim().slice(0, 40)
  });
  localStorage.setItem(key, JSON.stringify(existing));
  
  // Re-render the tips tab
  const panel = document.getElementById('tab-tips');
  if (panel) renderTipsTab(panel);
}

function renderTipsTab(panel) {
  if (!tips) { panel.innerHTML = '<p class="text-muted">Loading…</p>'; return; }

  const tipList = tips.tips || tips.items || (Array.isArray(tips) ? tips : []);
  
  // Butler card at the top
  let html = renderButlerCard();

  if (tips.categories) {
    tips.categories.forEach(cat => {
      html += `<div class="section-header"><span class="section-title">${escapeHtml(cat.title)}</span></div>`;
      (cat.items || cat.tips || []).forEach(t => {
        html += `<div class="tip-item">${typeof t === 'string' ? escapeHtml(t) : `<strong>${escapeHtml(t.tip || t.title)}</strong>${t.detail ? ' — ' + escapeHtml(t.detail) : ''}`}</div>`;
      });
    });
  } else {
    tipList.forEach(t => {
      html += `<div class="tip-item">${typeof t === 'string' ? escapeHtml(t) : `<strong>${escapeHtml(t.tip || t.title || '')}</strong>${t.detail ? ' — ' + escapeHtml(t.detail) : ''}`}</div>`;
    });
  }

  panel.innerHTML = linkVenueNames(html) || '<p class="text-muted">Tips loading…</p>';
}

// ─── Deck Plan Viewer ───────────────────────────────────────────────
const DECK_IMAGES = [
  { deck: 6,  file: 'Luna-Deck-06-021726.webp' },
  { deck: 7,  file: 'Luna-Deck-07-021726.webp' },
  { deck: 8,  file: 'Luna_Deck_08_12182025.webp' },
  { deck: 9,  file: 'Luna_Deck_09_01202026.webp' },
  { deck: 10, file: 'Luna_Deck_10_01202026.webp' },
  { deck: 11, file: 'Luna_Deck_11_01202026.webp' },
  { deck: 12, file: 'Luna_Deck_12_01202026.webp' },
  { deck: 13, file: 'Luna_Deck_13_01202026.webp' },
  { deck: 14, file: 'Luna_Deck_14_01202026.webp' },
  { deck: 15, file: 'Luna_Deck_15_01202026.webp' },
  { deck: 16, file: 'Luna_Deck_16_01202026.webp' },
  { deck: 17, file: 'Luna-Deck-17-022426.webp' },
  { deck: 18, file: 'Norwegian_Luna_Deck_18_012926.webp' },
  { deck: 19, file: 'Norwegian_Luna_Deck_19_012926.webp' },
  { deck: 20, file: 'Luna_Deck_20_01202026.webp' },
];

let _currentDeck = 12; // default to suite deck

function getDeckImageUrl(deck) {
  const entry = DECK_IMAGES.find(d => d.deck === deck);
  return entry ? `content/deck-plans/${entry.file}` : '';
}

function changeDeck(dir) {
  const decks = DECK_IMAGES.map(d => d.deck);
  const idx = decks.indexOf(_currentDeck);
  const newIdx = Math.max(0, Math.min(decks.length - 1, idx + dir));
  _currentDeck = decks[newIdx];

  const img = document.getElementById('deck-image');
  const label = document.getElementById('deck-label');
  const hint = document.querySelector('.deck-hint');
  const wrap = document.getElementById('deck-image-wrap');

  if (img) { img.src = getDeckImageUrl(_currentDeck); img.alt = `Deck ${_currentDeck} plan`; }
  if (label) label.textContent = `Deck ${_currentDeck}`;
  if (hint) hint.textContent = `Pinch to zoom${_currentDeck === 12 ? ' · Suite 12846 marked ⭐' : ''}`;

  // Add/remove suite pin
  const existingPin = document.getElementById('suite-pin');
  if (existingPin) existingPin.remove();
  if (_currentDeck === 12 && wrap) {
    const pin = document.createElement('div');
    pin.className = 'suite-pin';
    pin.id = 'suite-pin';
    pin.title = 'Suite 12846';
    pin.textContent = '⭐';
    wrap.appendChild(pin);
  }
}

function renderDeckTab(panel) {
  const suiteOverlay = _currentDeck === 12
    ? `<div class="suite-pin" id="suite-pin" title="Suite 12846">⭐</div>`
    : '';

  panel.innerHTML = `
    <div class="deck-viewer">
      <div class="deck-controls">
        <button class="deck-nav-btn" id="deck-prev" onclick="changeDeck(-1)">‹</button>
        <span class="deck-label" id="deck-label">Deck ${_currentDeck}</span>
        <button class="deck-nav-btn" id="deck-next" onclick="changeDeck(1)">›</button>
      </div>
      <div class="deck-image-wrap" id="deck-image-wrap" style="position:relative">
        <img class="deck-image" id="deck-image" src="${getDeckImageUrl(_currentDeck)}" alt="Deck ${_currentDeck} plan" loading="lazy">
        ${suiteOverlay}
      </div>
      <div class="deck-hint">Pinch to zoom${_currentDeck === 12 ? ' · Suite 12846 marked ⭐' : ''}</div>
    </div>
  `;
}

// ─── Packing Checklist ─────────────────────────────────────────────
function renderPackingTab(panel) {
  if (!packing) { panel.innerHTML = '<p class="text-muted">Loading…</p>'; return; }
  
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  
  if (today >= packing.hiddenAfter) {
    panel.innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:48px;margin-bottom:12px">⛵</div>
        <div style="color:var(--gold);font-size:18px;font-weight:600">Safe travels!</div>
        <div style="color:var(--text-muted);margin-top:8px">You're on your way. Have an amazing cruise.</div>
      </div>`;
    return;
  }
  
  let html = '<div class="section-header"><span class="section-title">Pre-Cruise Checklist</span></div>';
  
  packing.sections.forEach(section => {
    html += `<div class="section-header" style="margin-top:0.75rem"><span class="section-title">${escapeHtml(section.icon)} ${escapeHtml(section.title)}</span></div>`;
    html += '<div class="card" style="margin-bottom:0.75rem">';
    section.items.forEach(item => {
      const checked = localStorage.getItem(`haven_packing_${item.id}`) === 'true';
      html += `
        <label class="pack-item${checked ? ' pack-checked' : ''}" data-id="${escapeHtml(item.id)}">
          <input type="checkbox" class="pack-checkbox" data-id="${escapeHtml(item.id)}" ${checked ? 'checked' : ''}>
          <span class="pack-text">${escapeHtml(item.text)}</span>
        </label>`;
    });
    html += '</div>';
  });
  
  panel.innerHTML = html;
  
  // Attach checkbox listeners
  panel.querySelectorAll('.pack-checkbox').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = e.target.dataset.id;
      localStorage.setItem(`haven_packing_${id}`, e.target.checked ? 'true' : 'false');
      const label = e.target.closest('.pack-item');
      if (label) label.classList.toggle('pack-checked', e.target.checked);
    });
  });
}

// ─── Chat / KB Search ──────────────────────────────────────────────
function setupChatInput() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
}

function sendChat() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const query = input.value.trim();
  if (!query) return;
  input.value = '';
  input.style.height = 'auto';
  addChatMessage('user', query);
  const answer = searchKB(query);
  setTimeout(() => addChatMessage('assistant', answer), 300);
}

function addChatMessage(role, text) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;

  const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = `chat-message ${role}`;
  div.innerHTML = `
    <div class="chat-bubble">${text}</div>
    <div class="chat-time">${now}</div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function searchKB(query) {
  const q = query.toLowerCase().trim();

  // GF / gluten-free questions — NOTE: spa check runs first above to avoid false matches on "safe"
  if ((q.includes('eat') || q.includes('gluten') || q.includes('gf') || q.includes('safe') || q.includes('food')) && !(q.includes('spa') || q.includes('treatment') || q.includes('facial') || q.includes('massage') || q.includes('thermal'))) {
    if (!gfGuide) return "GF guide is loading — try again in a moment.";

    const restaurantMatches = gfGuide.restaurants.filter(r => {
      const name = r.name.toLowerCase();
      return name.split(' ').some(word => word.length > 3 && q.includes(word)) || q.includes(name);
    });

    if (restaurantMatches.length > 0) {
      return formatGFAnswer(restaurantMatches[0]);
    }
    return formatGFGeneral();
  }

  // Today / schedule / port / dock
  if (q.includes('today') || q.includes('schedule') || q.includes('dock') || q.includes('arrive') || q.includes('depart')) {
    return formatTodayAnswer();
  }

  if (q.includes('port') || q.includes('excursion') || q.includes('belize') || q.includes('roatan') || q.includes('cozumel') || q.includes('costa maya')) {
    return formatPortAnswer(q);
  }

  // Spa
  if (q.includes('spa') || q.includes('facial') || q.includes('thermal') || q.includes('mani') || q.includes('pedi') || q.includes('massage') || q.includes('treatment')) {
    return formatSpaAnswer(q);
  }

  // Entertainment
  if (q.includes('show') || q.includes('rocket') || q.includes('syd') || q.includes('entertainment') || q.includes('tonight') || q.includes('music')) {
    return formatEntertainmentAnswer(q);
  }

  // Suite / cabin
  if (q.includes('suite') || q.includes('cabin') || q.includes('room') || q.includes('butler') || q.includes('haven') || q.includes('concierge')) {
    return `You're in Suite 12846 — Haven King H5, located aft-starboard on Deck 12. Your Haven perks include priority embarkation, dedicated concierge, exclusive restaurant and pool deck, butler service, and priority show seating. Contact the Haven Concierge desk for reservations and requests.`;
  }

  // Anniversary
  if (q.includes('anniversary') || q.includes('special') || q.includes('celebrate')) {
    return `Your anniversary is April 5 (Sea Day). Planned: Holly's spa treatments in the morning, Onda at Sea balcony dinner in the evening, and Rocket Man show with Haven priority seating. Suite décor was requested at embarkation. The concierge can arrange additional surprises.`;
  }

  // PIN / reset
  if (q.includes('switch') || q.includes('logout') || q.includes('lock')) {
    return `You can lock the app from the header and re-enter your PIN to return.`;
  }

  // Navigation / directions questions
  const navKeywords = ['how do i get', 'where is', 'directions', 'navigate to', 'find the', 'how to get to', 'deck'];
  const reverseKeywords = ['back to suite', 'back to my suite', 'get back', 'return to suite', 'how do i get back', 'directions back', 'way back'];
  const isReverseQuery = reverseKeywords.some(kw => q.includes(kw));

  if (navKeywords.some(kw => q.includes(kw)) || isReverseQuery) {
    // Check if a specific venue is mentioned
    const mentionedVenue = Object.keys(VENUE_LOCATIONS).find(v => q.includes(v.toLowerCase()));

    // Handle reverse directions (back to suite from venue)
    if (isReverseQuery && !navigation) {
      return `**Getting back to Suite 12846:**\n\nFind the nearest Haven Private Elevator (aft section of the ship — keycard access). Take it to Deck 12. Suite 12846 is aft-starboard from the elevator. Content still loading — ask again in a moment for venue-specific directions.`;
    }
    if (isReverseQuery && navigation) {
      const venues = navigation.venues || [];
      if (mentionedVenue) {
        const venueData = venues.find(v => v.name?.toLowerCase().includes(mentionedVenue.toLowerCase()));
        if (venueData?.directions_to_suite) {
          return `**Back to Suite 12846 from ${mentionedVenue}:**\n\n${venueData.directions_to_suite}`;
        }
      }
      // General "back to suite" response when no venue mentioned
      return `**Getting back to Suite 12846:**\n\nFind the nearest Haven Private Elevator (aft section of the ship — they're keycard-only). Take it to Deck 12. Suite 12846 is a short walk starboard (right side) from the elevator.\n\nIf you're on Decks 15–16 (Haven complex), the elevator is right there. From lower decks (9–13), look for the aft elevator bank — the Haven elevators are always aft.`;
    }

    // Handle forward directions (from suite to venue)
    if (mentionedVenue && navigation) {
      const venues = navigation.venues || [];
      const venueData = venues.find(v => v.name?.toLowerCase().includes(mentionedVenue.toLowerCase()));
      if (venueData?.directions_from_suite) {
        const loc = VENUE_LOCATIONS[mentionedVenue];
        return `**Directions to ${mentionedVenue}:**\n\nLocation: ${loc}\n\n${venueData.directions_from_suite}`;
      }
    }

    // Fallback to static venue location
    if (mentionedVenue) {
      const loc = VENUE_LOCATIONS[mentionedVenue];
      return `**${mentionedVenue}** is located at **${loc}**.\n\nFrom suite 12846: take the Haven elevator (aft, adjacent to your suite) to ${loc.split(',')[0].toLowerCase()}, then follow signs ${loc.includes('Aft') ? 'aft (toward the stern)' : 'midship'}.`;
    }
    // General navigation answer
    return `**Getting Around Luna:**\n\nYour suite (12846) is on Deck 12, aft-starboard — directly adjacent to the **Haven Private Elevators**. Use your Haven keycard to access them.\n\n• Haven Restaurant/Lounge/Pool/Concierge → Deck 15, aft (Haven elevator)\n• Haven Sundeck → Deck 15–16, aft (Haven elevator)\n• Mandara Spa/Thermal Suite → Deck 16, aft (Haven elevator to 15, stairs to 16)\n• Casino/Cagney's/Le Bistro → Deck 9 (Haven elevator down)\n• Syd Norman's/Swirl/Whiskey Bar → Deck 9, midship (Haven elevator down)\n• Starbucks® → Deck 9, Penrose Atrium (Haven elevator down)\n• Main Pool → Deck 16, midship\n• Observation Lounge → Deck 15, forward\n\nTip: The Haven elevator is aft, right next to your suite. Your keycard activates it. Never wait for midship elevators.`;
  }

  return generalSearch(q);
}

function formatGFAnswer(restaurant) {
  const status = getGFStatus(restaurant.gf_status);
  let answer = `**${restaurant.name}** — ${status.emoji} ${status.label}\n\n${restaurant.notes}`;
  if (restaurant.safe_items && restaurant.safe_items.length) {
    answer += `\n\nSafe options: ${restaurant.safe_items.join(', ')}.`;
  }
  if (restaurant.avoid && restaurant.avoid.length) {
    answer += `\n\nAvoid: ${restaurant.avoid.join(', ')}.`;
  }
  if (restaurant.ask_for) {
    answer += `\n\nSay: "${restaurant.ask_for}"`;
  }
  return answer;
}

function formatGFGeneral() {
  if (!gfGuide) return "GF guide unavailable — try again in a moment.";
  const safe = gfGuide.restaurants.filter(r => r.gf_status === 'safe').map(r => r.name);
  return `Holly's safest options are the **Haven Restaurant** (dedicated staff, flag on day 1) and **Onda by Scarpetta** (GF pasta available). Also safe: ${safe.slice(2).join(', ')}. Always alert each restaurant to her gluten-free dietary requirement and ask about cross-contamination.`;
}

function formatTodayAnswer() {
  const dayIdx = getTodayDayIndex();
  if (!itinerary) return "Itinerary loading — try again in a moment.";
  if (dayIdx < 0) {
    const sailing = getSailing();
    return `The cruise hasn't started yet — ${sailing.text}. Norwegian Luna departs Miami on April 4, 2026.`;
  }
  const day = itinerary.days[dayIdx];
  return `Today is **${day.date}, ${day.day}** — ${day.port}. ${day.notes}${day.times ? ` Hours: ${day.times}.` : ''}`;
}

function formatPortAnswer(q) {
  if (!ports) return "Port information is in the Ports tab.";
  const portList = ports.ports || (Array.isArray(ports) ? ports : Object.values(ports));
  const keywords = ['belize', 'roatan', 'cozumel', 'costa maya', 'maya', 'honduras', 'mexico'];
  const matched = portList.find(p => {
    const name = (p.name || p.port || '').toLowerCase();
    return keywords.some(k => q.includes(k) && (name.includes(k) || k.includes(name.split(' ')[0].toLowerCase())));
  });
  if (matched) {
    return `**${matched.name || matched.port}**: ${matched.notes || matched.description || 'Check the port guide for details.'}${matched.gf_tip ? ` GF tip: ${matched.gf_tip}` : ''}`;
  }
  return "Check the Ports tab for detailed information on each stop — Belize, Roatán, Costa Maya, and Cozumel.";
}

function formatSpaAnswer(q) {
  if (!spa) return "Spa details are in the Spa tab.";
  if (q.includes('booked') || q.includes('holly') || q.includes('scheduled')) {
    if (spa.booked && spa.booked.length) {
      return `Holly's booked spa treatments: ${spa.booked.map(b => `${b.name || b}${b.time ? ' at ' + b.time : ''}`).join('; ')}.`;
    }
  }
  if (q.includes('thermal')) {
    return spa.thermal_suite ? `Thermal Suite: ${spa.thermal_suite}` : "Ask me about the Thermal Suite for details.";
  }
  return `The spa on Norwegian Luna offers treatments including facials, massages, manicures, and access to the Thermal Suite. Holly has treatments booked for April 5 (Sea Day). Ask me about a specific treatment or check the spa section.`;
}

function formatEntertainmentAnswer(q) {
  if (!entertainment) return "Entertainment details are loading — try again in a moment.";
  if (q.includes('rocket') || q.includes('rocket man')) {
    const show = (entertainment.shows || []).find(s => (s.name || '').toLowerCase().includes('rocket'));
    if (show) return `Rocket Man: ${show.description || show.desc || 'Live tribute show'}. ${show.time ? `Show time: ${show.time}.` : ''} ${show.notes || 'Request Haven priority seating via the concierge.'}`;
    return "Rocket Man is a live Elton John tribute show on board. Book Haven priority seating through the concierge.";
  }
  if (q.includes('syd')) {
    return "Syd Norman's Pour House is the signature live music bar on Norwegian Luna — rock, classic hits, nightly performances. Great for the last sea day (April 10).";
  }
  const shows = entertainment.shows || [];
  if (shows.length) {
    return `Entertainment highlights: ${shows.slice(0, 3).map(s => s.name || s.title).join(', ')}. Ask me about a specific show for more details.`;
  }
  return "Ask me about a specific show or tonight's schedule.";
}

function generalSearch(q) {
  const responses = [
    { k: ['pin', 'password'], r: "Your PINs: Fred 1313, Holly 1009. Keep these private." },
    { k: ['sail', 'depart', 'leave'], r: "Norwegian Luna departs Miami on April 4, 2026 at 11am (Haven priority boarding from 11am)." },
    { k: ['return', 'arrive home', 'back'], r: "The cruise returns to Miami on April 11, 2026. Haven guests disembark first via priority." },
    { k: ['reservation', 'booking', '#'], r: "NCL Reservation #64411979. Suite 12846 (Haven H5 King). Contact NCL at 1-866-234-7350 for booking changes." },
    { k: ['wifi', 'internet'], r: "Norwegian Luna offers onboard Wi-Fi packages purchasable through the NCL app or Guest Services. Haven guests may receive a discount — ask the concierge." },
    { k: ['casino'], r: "The casino is open at sea (closed in port per maritime law). Last sea day (April 10) is the final casino session before debarkation." },
    { k: ['drink', 'bar', 'cocktail', 'beverage'], r: "The Haven Lounge has private bar service. Syd Norman's Pour House and other bars are fleet-wide. Beverage packages can be pre-purchased through NCL." },
  ];

  for (const { k, r } of responses) {
    if (k.some(kw => q.includes(kw))) return r;
  }

  return "I didn't find a specific answer for that.";
}

// ─── Voice ───────────────────────────────────────────────────────
let recognition = null;
let isListening = false;

function setupVoice() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    const btn = document.getElementById('main-voice-btn');
    if (btn) {
      btn.querySelector('.voice-label').textContent = 'Type Below';
      btn.style.opacity = '0.6';
    }
    return;
  }

  recognition = new SpeechRec();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = e => {
    const query = e.results[0][0].transcript;
    stopListening();
    processQuery(query);
  };

  recognition.onerror = () => stopListening();
  recognition.onend = () => stopListening();
}

function toggleVoice() {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
}

function startListening() {
  if (!recognition) {
    const query = prompt('Ask a question:');
    if (query) processQuery(query);
    return;
  }
  isListening = true;
  recognition.start();

  const wrap = document.getElementById('main-voice-btn-wrap');
  const btn = document.getElementById('main-voice-btn');
  const status = document.getElementById('main-voice-status');
  if (wrap) wrap.classList.add('listening');
  if (btn) btn.classList.add('listening');
  if (status) { status.textContent = 'Listening…'; status.classList.add('active'); }
}

function stopListening() {
  isListening = false;
  if (recognition) { try { recognition.stop(); } catch (e) {} }

  const wrap = document.getElementById('main-voice-btn-wrap');
  const btn = document.getElementById('main-voice-btn');
  const status = document.getElementById('main-voice-status');
  if (wrap) wrap.classList.remove('listening');
  if (btn) btn.classList.remove('listening');
  if (status) { status.textContent = 'Tap to ask'; status.classList.remove('active'); }
}

function setupAskInput() {
  const input = document.getElementById('main-text-input');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const q = input.value.trim();
      if (q) { input.value = ''; processQuery(q); }
    }
  });
}

async function processQuery(query) {
  const status = document.getElementById('main-voice-status');
  if (status) status.textContent = `"${query}"`;

  const answer = searchKB(query);

  if (answer.startsWith("I didn't find")) {
    showMainAnswer('Searching Haven AI…');
    try {
      await fetch(FAIT_URL, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      const resp = await fetch('https://fait.dev.fortressam.ai/api/haven/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'ed9b529c93fd15a56cc060fa5de37f33d1e8fcb9248c98c37574a0c3deaa5623' },
        body: JSON.stringify({ message: query, projectId: 'ac79d2db-165a-49b2-b36f-01489e568efc' }),
        signal: AbortSignal.timeout(15000)
      });
      if (!resp.ok) throw new Error(`FAIT ${resp.status}`);
      const data = await resp.json();
      const faitAnswer = data.message ?? data.answer ?? data.content ?? 'Haven AI could not find an answer.';
      showMainAnswer(faitAnswer);
      speak(faitAnswer);
      return; // don't fall through to searchKB
    } catch {
      const fallback = 'Full AI search unavailable right now — try rephrasing your question.';
      showMainAnswer(fallback);
      speak(fallback);
    }
    return;
  }

  showMainAnswer(answer);
  speak(answer);
}

function showMainAnswer(text) {
  const el = document.getElementById('main-answer');
  if (!el) return;
  const clean = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  el.querySelector('.answer-text').textContent = clean;
  el.classList.add('visible');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // strip **bold** markers
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '') // strip emoji (supplementary plane)
    .replace(/[\u2600-\u27BF]/g, '')      // strip misc symbols & dingbats
    .replace(/\s{2,}/g, ' ')             // collapse extra spaces left behind
    .replace(/\n+/g, '. ')
    .trim();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1;

  // Prefer a natural female voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang === 'en-US' && /samantha|karen|victoria|female/i.test(v.name))
    || voices.find(v => v.lang.startsWith('en'));
  if (preferred) utterance.voice = preferred;

  utterance.onstart = () => {
    const sb = document.getElementById('main-stop-btn');
    if (sb) sb.style.display = 'inline-flex';
  };
  utterance.onend = () => {
    const sb = document.getElementById('main-stop-btn');
    if (sb) sb.style.display = 'none';
  };
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  const sb = document.getElementById('main-stop-btn');
  if (sb) sb.style.display = 'none';
}


// ─── Upcoming Events Alert ────────────────────────────────────────
function checkUpcomingEvents() {
  const dayIdx = getTodayDayIndex();
  if (!itinerary || dayIdx < 0) return;
  const today = itinerary.days[dayIdx];
  if (!today || !today.reservations) return;

  const now = new Date();
  const timeRegex = /(\d+):(\d+)(am|pm)/i;

  for (const reservation of today.reservations) {
    const match = reservation.match(timeRegex);
    if (!match) continue;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toLowerCase();
    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    const eventTime = new Date(now);
    eventTime.setHours(hours, minutes, 0, 0);

    const diffMs = eventTime - now;
    const diffMin = diffMs / 60000;

    if (diffMin > 0 && diffMin <= 60) {
      // Remove any existing alert
      const existing = document.getElementById('upcoming-alert');
      if (existing) existing.remove();

      const alert = document.createElement('div');
      alert.id = 'upcoming-alert';
      alert.innerHTML = `<span>⏰ Coming up: ${reservation}</span><button onclick="document.getElementById('upcoming-alert').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#1a2332;">✕</button>`;
      alert.style.cssText = 'background:#d4af37;color:#1a2332;padding:12px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center;';

      const navTabs = document.querySelector('.nav-tabs');
      if (navTabs) navTabs.insertAdjacentElement('beforebegin', alert);

      setTimeout(() => { const el = document.getElementById('upcoming-alert'); if (el) el.remove(); }, 30000);
      break; // show only the soonest upcoming event
    }
  }
}

// ─── Venue Tooltip Click Handler ──────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.classList.contains('venue-link')) {
    const loc = e.target.getAttribute('data-location');
    // Remove existing tooltip
    document.querySelectorAll('.venue-tooltip').forEach(t => t.remove());
    const tip = document.createElement('div');
    tip.className = 'venue-tooltip';
    tip.textContent = `📍 ${loc}`;
    tip.style.cssText = 'position:fixed;background:#d4af37;color:#1a2332;padding:6px 12px;border-radius:4px;font-weight:600;font-size:0.85rem;z-index:1000;pointer-events:none;';
    // Position near click
    tip.style.left = Math.min(e.clientX, window.innerWidth - 160) + 'px';
    tip.style.top = (e.clientY - 40) + 'px';
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 3000);
  }
});

// ─── Service Worker ───────────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });

    // Listen for background cache updates from SW
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'CONTENT_UPDATED') {
        // Content updated in background — next load will get fresh data
        console.log('[Haven] Content cache updated in background');
      }
    });

    // Trigger background content sync on every load (if online)
    if (_isOnline) {
      setTimeout(triggerContentSync, 2000); // 2s delay — let page load settle
    }
  }
}

// ─── Build DOM ────────────────────────────────────────────────────
function buildApp() {
  document.getElementById('app').innerHTML = `
    <!-- PIN Screen -->
    <div id="pin-screen" class="screen active">
      <div class="pin-container">
        <div class="pin-wordmark-wrap">
          <div class="haven-wordmark">Haven</div>
          <div class="pin-tagline">Norwegian Luna · April 4–11</div>
        </div>
        <div id="pin-dots-row" class="pin-dots" style="justify-content:center">
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
          <div class="pin-dot"></div>
        </div>
        <div id="pin-error" class="pin-error"></div>
        <div class="pin-keypad">
          ${[1,2,3,4,5,6,7,8,9].map(n => `
            <button class="pin-key" onclick="handlePinInput('${n}')">${n}</button>
          `).join('')}
          <div></div>
          <button class="pin-key pin-zero" onclick="handlePinInput('0')">0</button>
          <button class="pin-key pin-back" onclick="handlePinBack()">⌫</button>
        </div>
        <p style="font-size:0.7rem;color:var(--text-dim);text-align:center;margin-top:0.5rem">
          Enter PIN to continue
        </p>
      </div>
    </div>

    <!-- Main Screen -->
    <div id="main-screen" class="screen">
      <div class="app-header">
        <div class="header-left">
          <div class="header-avatar">H</div>
          <div>
            <div class="haven-wordmark-sm">Haven</div>
            <div class="header-title">Norwegian Luna · Suite 12846</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" onclick="navigateTo('pin')" title="Lock">🔒</button>
        </div>
      </div>

      <div class="ask-area">
        <div id="main-voice-btn-wrap" class="voice-btn-wrap main-voice-btn-wrap">
          <div class="voice-pulse-ring"></div>
          <div class="voice-pulse-ring"></div>
          <div class="voice-pulse-ring"></div>
          <button id="main-voice-btn" class="voice-btn" onclick="toggleVoice()" aria-label="Ask a question">
            <span class="mic-icon">🎤</span>
            <span class="voice-label">Ask</span>
          </button>
        </div>
        <div id="main-voice-status" class="voice-status">Tap to ask</div>
        <div class="ask-input-row">
          <input type="text" id="main-text-input" class="ask-text-input" placeholder="Ask Haven anything…" />
          <button class="ask-send-btn" onclick="const i=document.getElementById('main-text-input');const q=i.value.trim();if(q){i.value='';processQuery(q);}" aria-label="Send">➤</button>
        </div>
        <div id="main-answer" class="main-answer">
          <div class="answer-label">Haven says</div>
          <div class="answer-text"></div>
          <button id="main-stop-btn" class="stop-btn" onclick="stopSpeaking()" style="display:none">&#9646;&#9646; Stop</button>
        </div>
      </div>

      <div class="nav-tabs" id="main-tabs">
        <button class="nav-tab active" data-tab="today" onclick="switchFredTab('today')">Today</button>
        <button class="nav-tab" data-tab="itinerary" onclick="switchFredTab('itinerary')">Itinerary</button>
        <button class="nav-tab" data-tab="gf" onclick="switchFredTab('gf')">GF Guide</button>
        <button class="nav-tab" data-tab="ports" onclick="switchFredTab('ports')">Ports</button>
        <button class="nav-tab" data-tab="spa" onclick="switchFredTab('spa')">Spa</button>
        <button class="nav-tab" data-tab="entertainment" onclick="switchFredTab('entertainment')">Shows</button>
        <button class="nav-tab" data-tab="decks" onclick="switchFredTab('decks')">Decks</button>
        <button class="nav-tab" data-tab="tips" onclick="switchFredTab('tips')">Tips</button>
      </div>
      <div class="scroll-content">
        <div id="tab-today" class="tab-panel active"></div>
        <div id="tab-itinerary" class="tab-panel"></div>
        <div id="tab-gf" class="tab-panel"></div>
        <div id="tab-ports" class="tab-panel"></div>
        <div id="tab-spa" class="tab-panel"></div>
        <div id="tab-entertainment" class="tab-panel"></div>
        <div id="tab-decks" class="tab-panel"></div>
        <div id="tab-tips" class="tab-panel"></div>
      </div>
    </div>`;
}

// ─── Init ─────────────────────────────────────────────────────────
async function init() {
  buildApp();
  updateHeaderOffset(); // Set header height CSS var for sticky nav-tabs
  registerSW();

  // Restore session
  const saved = sessionStorage.getItem('haven_view');
  const savedWho = sessionStorage.getItem('haven_who');
  if (saved && saved === 'main' && savedWho) {
    state.who = savedWho;
    // Load content first, then navigate
    await loadContent();
    navigateTo(saved);
    checkUpcomingEvents();
  } else {
    // Load content in background while showing PIN
    loadContent().then(() => checkUpcomingEvents());
  }
}

document.addEventListener('DOMContentLoaded', init);
