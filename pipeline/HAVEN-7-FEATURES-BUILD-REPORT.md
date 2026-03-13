# Haven App — 7 Features Build Report

**Build Date:** 2026-03-13  
**Agent:** Tony Stark (software-engineer)  
**Commit:** `545a232`  
**Branch:** main  
**Push:** ✅ Pushed to `git@github.com:fwhite13/haven.git`

---

## Feature 1: Sticky Tabs Verification

**Result:** No changes needed.

`.nav-tabs` in `style.css` already had:
- `position: sticky; top: 57px; z-index: 99` ✅
- `background: var(--card)` ✅ (present on line 330)

The `background` property was already set — content will not bleed through during scroll. No modification required.

---

## Feature 2: Gluten-Free Language Cleanup

**"celiac" occurrences remaining:** `0`

Grep confirmation:
```
grep -ri "celiac" . --exclude-dir=.git --exclude="*.md" | grep -v "BUILD-REPORT" | wc -l
# Result: 0
```

### Files modified:

**`content/gf-guide.json`:**
- `holly_profile`: "Strictly celiac" → "Strictly gluten-free"
- `first_day_checklist[0]`: "flag celiac allergy" → "flag gluten sensitivity"
- Haven Restaurant `ask_for`: "strictly celiac" → "severe gluten sensitivity"
- Onda `notes`: "celiac" → "gluten sensitivity"
- Onda `ask_for`: "celiac disease" → "severe gluten sensitivity"
- Cagney's `ask_for`: "celiac" → "gluten sensitivity"
- Los Lobos `ask_for`: "celiac disease" → "severe gluten sensitivity"
- Hasuki `ask_for`: "celiac disease" → "severe gluten sensitivity"
- Le Bistro `ask_for`: "celiac disease" → "severe gluten sensitivity"
- Garden Café `ask_for`: "celiac" → "gluten sensitivity"
- Room Service `ask_for`: "celiac" → "gluten-free requirement"
- `emergency_phrase_spanish`: "Soy celiaca" → "Tengo sensibilidad al gluten severa"
- `emergency_phrase_english`: "I have celiac disease" → "I have severe gluten sensitivity"

**`content/ports.json`:**
- Harvest Caye `gf_notes`: "alert staff to celiac" → "alert staff to gluten sensitivity"
- Roatán `tip`: "celiac concerns" → "gluten-free dietary restriction concerns"
- Cozumel `recommended_port_restaurant`: "ask about celiac" → "ask about gluten sensitivity"

**`content/tips.json`:** Entire file replaced (see Feature 4).

**`app.js`:**
- `searchKB()` comment: `// GF / celiac questions` → `// GF / gluten-free questions`
- `searchKB()` condition: removed `q.includes('celiac')` check entirely

**`BUILD-REPORT.md`:**
- Line 99: `"eat" / "gluten" / "celiac"` → `"eat" / "gluten" / "gf"`

---

## Feature 3: FAIT API Wiring

**Status:** ✅ Live

In `processQuery()`, replaced the stub with a real POST call to the FAIT chat endpoint:

```js
const resp = await fetch('https://fait.dev.fortressam.ai/api/haven/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': '...' },
  body: JSON.stringify({ message: query, projectId: 'ac79d2db-165a-49b2-b36f-01489e568efc' }),
  signal: AbortSignal.timeout(15000)
});
```

**Response shape handled:**
```js
const faitAnswer = data.message ?? data.answer ?? data.content ?? 'Haven AI could not find an answer.';
```

The HEAD pre-check (3s timeout) remains as a reachability guard before the POST. On a successful FAIT response, the function returns immediately (`return;`) without falling through to `searchKB()`.

---

## Feature 4: Tips JSON Replacement

**Status:** ✅ Complete  
**Tips renderer update needed:** No

The existing `renderTipsTab()` already handles `tips.categories` with `(cat.items || cat.tips || []).forEach(...)`. The new schema uses `categories[].tips[]` — which is matched by the `cat.tips` branch. No renderer changes required.

New `content/tips.json` structure:
- 5 categories: Haven Perks, Formal Nights, What's Included in Haven, Extra Charges to Know, Butler Tips
- Each category has a `title` and `tips` array of plain strings

---

## Feature 5: Upcoming Events Alert

**Status:** ✅ Implemented

**Field name used for today's schedule:** `today.reservations`

Confirmed from `content/itinerary.json` — each day object has a `reservations` array of strings. Example:
```json
{ "reservations": ["Spa: Ultimate Treatment Facial", "Spa: Fire & Ice Mani/Pedi", "Onda dinner to balcony", "Rocket Man show (Haven seating)"] }
```

The `checkUpcomingEvents()` function:
- Uses `getTodayDayIndex()` + `itinerary.days[dayIdx]` to get today's data
- Iterates `today.reservations` looking for time strings matching `/(\d+):(\d+)(am|pm)/i`
- Inserts a gold alert banner above `.nav-tabs` for events within 60 minutes
- Auto-dismisses after 30 seconds; manual dismiss button also provided

Called in `init()`:
- After `await loadContent()` when restoring saved session
- Via `.then(() => checkUpcomingEvents())` after background load for new PIN sessions

---

## Feature 6: Venue Location Popups

**Status:** ✅ Implemented

`VENUE_LOCATIONS` constant added near top of `app.js` with 12 venues.

`linkVenueNames(html)` function wraps venue names in `<span class="venue-link" data-location="...">` elements, sorted longest-first to prevent partial matches.

**Render functions updated to call `linkVenueNames()`:**
- `renderItineraryTab()` → `panel.innerHTML = linkVenueNames(html)`
- `renderGFTab()` → `panel.innerHTML = linkVenueNames(html)`
- `renderPortsTab()` → `panel.innerHTML = linkVenueNames(html) || '...'`
- `renderSpaTab()` → `panel.innerHTML = linkVenueNames(html) || '...'`
- `renderEntertainmentTab()` → `panel.innerHTML = linkVenueNames(html) || '...'`

Global click handler added via `document.addEventListener('click', ...)` — event delegation detects `.venue-link` clicks and shows a positioned tooltip with 3s auto-dismiss.

CSS added to `style.css`:
```css
.venue-link {
  border-bottom: 1px dotted var(--haven-gold, #d4af37);
  cursor: pointer;
  white-space: nowrap;
}
```

---

## Feature 7: Ship Navigation KB + Handler

**Status:** ✅ Complete

**New file:** `kb-content/10-ship-navigation.md`

Contains full Norwegian Luna navigation guide including suite 12846 directions to all key venues, deck reference, and orientation guide.

**Navigation handler added to `searchKB()`** — placed before `generalSearch(q)`:
- Triggers on: `how do i get`, `where is`, `directions`, `navigate to`, `find the`, `how to get to`, `deck`
- If a specific venue is mentioned (matched against `VENUE_LOCATIONS` keys), returns deck + direction info
- Falls back to general ship navigation overview if no specific venue matched
- Uses the shared `VENUE_LOCATIONS` constant (no duplication)

---

## Build Summary

| Feature | Status | Notes |
|---------|--------|-------|
| 1. Sticky Tabs | ✅ No change needed | `background: var(--card)` already present |
| 2. Gluten-free language | ✅ Complete | 0 "celiac" occurrences remain |
| 3. FAIT API | ✅ Live | POST with 15s timeout, fallback handled |
| 4. Tips JSON | ✅ Complete | Renderer compatible, no updates needed |
| 5. Upcoming Events | ✅ Complete | Uses `today.reservations` field |
| 6. Venue Popups | ✅ Complete | 5 render functions updated |
| 7. Nav KB + Handler | ✅ Complete | `kb-content/10-ship-navigation.md` created |

**Commit:** `545a232`  
**Push:** ✅ `origin/main` — `00ec290..545a232`

---

## Self-Review Checklist

- [x] All 7 features implemented as specified
- [x] Zero "celiac" occurrences in non-.md, non-BUILD-REPORT files
- [x] No scope creep — only changed what was specified
- [x] `VENUE_LOCATIONS` shared between Feature 6 and Feature 7 navigation handler (DRY)
- [x] `linkVenueNames()` sorts by name length desc to avoid partial match issues
- [x] `checkUpcomingEvents()` reads actual field names from itinerary.json before assuming
- [x] FAIT HEAD pre-check preserved as reachability guard
- [x] Tips renderer verified compatible before overwriting tips.json
- [x] Commit message contains no "celiac" language
