# Haven App — 7 Features Review Report
**Commit:** 545a232
**Reviewer:** Hawkeye (Clint Barton)
**Review Cycle:** 1 of 2
**Date:** 2026-03-13

---

## Verdict: NEEDS-CHANGES

One important issue found (item 22 — `linkVenueNames` not called in Tips tab). All other 27 items pass. One minor concern noted on item 8 (FAIT early-return logic). Details below.

---

## Checklist Results

### Feature 2 — Language Cleanup

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Zero restricted language occurrences across all files | ✅ PASS | `grep` returns 0 lines (excluding pipeline report files) |
| 2 | `gf-guide.json` holly_profile, ask_for fields updated | ✅ PASS | All fields use "gluten sensitivity" / "gluten-free" throughout |
| 3 | Spanish emergency phrase updated (no prohibited term) | ✅ PASS | `emergency_phrase_spanish` uses "sensibilidad al gluten" — clean |

---

### Feature 3 — FAIT API

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 4 | `processQuery()` does HEAD pre-check before POST | ✅ PASS | `await fetch(FAIT_URL, { method: 'HEAD', signal: AbortSignal.timeout(3000) })` confirmed |
| 5 | POST to correct URL with correct headers | ✅ PASS | URL: `https://fait.dev.fortressam.ai/api/haven/chat` · Headers: `Content-Type: application/json` + `x-api-key: ed9b529c…` |
| 6 | Body: `{ message: query, projectId: 'ac79d2db…' }` | ✅ PASS | Exact match confirmed |
| 7 | Response fallback chain: `data.message ?? data.answer ?? data.content ?? 'Haven AI could not find an answer.'` | ✅ PASS | Exact chain confirmed |
| 8 | Returns early after FAIT answer — does NOT fall through to `searchKB()` | ✅ PASS (with note) | `return` present on success path. However: FAIT is only attempted when `searchKB()` has **already been called** and returned "I didn't find…". The `return` prevents a *second* call to `searchKB`, but the first call has already happened. This is the correct/intended design — FAIT is the escalation layer — but worth noting for clarity. |

---

### Feature 4 — Tips JSON

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 9 | `content/tips.json` has exactly 5 categories | ✅ PASS | Categories: "Haven Perks — Use Every One", "Formal Nights", "What's Included in Haven", "Extra Charges to Know", "Butler Tips" |
| 10 | Renderer uses `cat.items \|\| cat.tips` — handles new schema | ✅ PASS | `renderTipsTab` uses `(cat.items \|\| cat.tips \|\| [])` — correctly handles new `tips` array schema |

---

### Feature 5 — Upcoming Events

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 11 | `checkUpcomingEvents()` reads `today.reservations` array | ✅ PASS | Reads `itinerary.days[dayIdx]` then checks `today.reservations` — matches `itinerary.json` field name |
| 12 | Time regex `/(\d+):(\d+)(am\|pm)/i` applied to each reservation string | ✅ PASS | Exact regex confirmed in loop over `today.reservations` |
| 13 | Alert only shown if event is within 60 minutes AND in the future | ✅ PASS | `diffMin > 0 && diffMin <= 60` |
| 14 | Alert injected before `.nav-tabs` using `insertAdjacentElement('beforebegin', alert)` | ✅ PASS | `navTabs.insertAdjacentElement('beforebegin', alert)` confirmed |
| 15 | `setTimeout(..., 30000)` auto-removes alert after 30 seconds | ✅ PASS | `setTimeout(() => { const el = document.getElementById('upcoming-alert'); if (el) el.remove(); }, 30000)` |

---

### Feature 6 — Venue Popups

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 16 | `VENUE_LOCATIONS` map defined with all 12 venues | ✅ PASS | Exactly 12 keys: Haven Restaurant, Haven Pool, Haven Lounge, Haven Sundeck, Onda by Scarpetta, Onda, Los Lobos, Syd Norman's, Casino, Thermal Suite, Mandara Spa, Main Pool |
| 17 | `linkVenueNames(html)` sorts keys by length descending | ✅ PASS | `Object.keys(VENUE_LOCATIONS).sort((a, b) => b.length - a.length)` — "Onda by Scarpetta" will match before "Onda" |
| 18 | Venue spans have `class="venue-link"` and `data-location` attribute | ✅ PASS | Template literal: `<span class="venue-link" data-location="${loc}">${venue} 📍</span>` |
| 19 | Click handler on `document` — event delegation | ✅ PASS | `document.addEventListener('click', e => { if (e.target.classList.contains('venue-link')) { … } })` |
| 20 | Tooltip auto-removes after 3 seconds | ✅ PASS | `setTimeout(() => tip.remove(), 3000)` |
| 21 | `.venue-link` CSS added to `style.css` | ✅ PASS | Found at line 944: `border-bottom: 1px dotted var(--haven-gold, #d4af37); cursor: pointer; white-space: nowrap;` |
| 22 | `linkVenueNames()` called in itinerary, GF, ports, spa, entertainment render functions | ⚠️ **NEEDS-FIX** | Called in: Itinerary ✅, GF ✅, Ports ✅, Spa ✅, Entertainment ✅ — **NOT called in `renderTipsTab`** ❌. Tips tab renders venue names as plain text with no click affordance. |

---

### Feature 7 — Navigation

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 23 | `kb-content/10-ship-navigation.md` exists with deck locations and directions from suite 12846 | ✅ PASS | File confirmed. Contains full deck map, suite 12846 location, and step-by-step directions from suite to all key venues |
| 24 | Navigation keywords handler fires on "how do i get", "where is", "directions", "navigate to", "find the", "deck" | ✅ PASS | `navKeywords = ['how do i get', 'where is', 'directions', 'navigate to', 'find the', 'how to get to', 'deck']` — all checklist keywords present (plus "how to get to" as a bonus) |
| 25 | If specific venue mentioned → returns deck location + directions from 12846 | ✅ PASS | Looks up via `VENUE_LOCATIONS`, returns deck + directional cue (forward/midship) |
| 26 | Navigation handler uses same `VENUE_LOCATIONS` constant as Feature 6 | ✅ PASS | `Object.keys(VENUE_LOCATIONS).find(v => q.includes(v.toLowerCase()))` — references the module-level constant, no separate copy |
| 27 | Handler placed BEFORE `generalSearch()` so it fires first | ✅ PASS | Navigation handler at line 627, `return generalSearch(q)` at line 639, `function generalSearch` at line 718 — order is correct |

---

### Language Safety

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 28 | Zero restricted language occurrences (grep, excluding pipeline reports) | ✅ PASS | Clean — grep returns exit code 1 (no matches) |

---

## Issues

### ⚠️ IMPORTANT — Item 22: `linkVenueNames` missing from `renderTipsTab`

**File:** `app.js`
**Function:** `renderTipsTab`

`linkVenueNames()` is called in every render function **except** `renderTipsTab`. The Tips content includes venue names (e.g. "Haven Restaurant", "Onda by Scarpetta") that should be tappable, consistent with every other tab.

**Current code (line ~530):**
```js
panel.innerHTML = html || '<p class="text-muted">Tips loading…</p>';
```

**Fix:**
```js
panel.innerHTML = linkVenueNames(html) || '<p class="text-muted">Tips loading…</p>';
```

One-character change. Easy fix.

---

### 📝 NOTE — Item 8: FAIT trigger condition (design note, no code change needed)

The FAIT API is triggered only when `searchKB()` returns the literal string `"I didn't find a specific answer for that."`. This means `searchKB` always runs first — FAIT is the escalation path. This is correct by design. The `return` after the FAIT response correctly prevents the answer from being overwritten. No action required; noting for the record.

---

## Summary

| Feature | Status |
|---------|--------|
| Feature 2 — Language cleanup | ✅ PASS |
| Feature 3 — FAIT API | ✅ PASS |
| Feature 4 — Tips JSON | ✅ PASS |
| Feature 5 — Upcoming Events | ✅ PASS |
| Feature 6 — Venue Popups | ⚠️ NEEDS-FIX (item 22) |
| Feature 7 — Navigation | ✅ PASS |
| Language Safety | ✅ PASS |

**27/28 items pass. 1 fix required.**

The fix is a one-line change: wrap the `renderTipsTab` final assignment with `linkVenueNames()`. Return to BUILD, fix it, re-submit for cycle 2.

---

*— Hawkeye*
