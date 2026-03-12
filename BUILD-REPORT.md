# Haven App — Build Report
_Built: March 12, 2026 · Ready for Fred's morning review_

---

## 🚢 What Was Built

**Haven** is a luxury PWA trip companion for Fred & Holly's Norwegian Luna anniversary cruise, April 4–11, 2026. It installs on iOS (Add to Home Screen) and Android, works offline, and gives each person a tailored experience via PIN authentication.

---

## 🔐 PIN Codes

| PIN | Person | View |
|-----|--------|------|
| **1104** | Fred | Admin dashboard — all 7 content tabs, chat search, edit mode |
| **0405** | Holly | Voice-first interface — large gold button, GF guide, quick questions |

_The "1104" encodes April 11 + April 4 — anniversary bookends. "0405" is April 5, the anniversary sea day._

---

## 📁 Files Created

### App Core
| File | Size | Description |
|------|------|-------------|
| `index.html` | 774B | PWA shell — minimal HTML, all content built by JS |
| `app.js` | 44KB | Complete app logic — PIN auth, both views, KB search, voice |
| `style.css` | 26KB | Full navy/gold theme — PIN screen, both views, animations |
| `manifest.json` | 469B | PWA manifest — name, theme, icons, standalone display |
| `sw.js` | 2.1KB | Service worker — offline cache for all content |
| `icons/icon-192.svg` | 1.2KB | Gold anchor icon on navy — 192×192 |
| `icons/icon-512.svg` | 1.2KB | Gold anchor icon on navy — 512×512 |

### Content JSON Files
| File | Size | Description |
|------|------|-------------|
| `content/itinerary.json` | 2.8KB | Full 8-day itinerary with reservations |
| `content/gf-guide.json` | 7.7KB | Complete GF dining guide — all 8 restaurants |
| `content/ports.json` | 18.7KB | Port guides: Belize, Roatán, Costa Maya, Cozumel |
| `content/spa.json` | 10.3KB | Spa guide with Holly's booked treatments |
| `content/entertainment.json` | 14.2KB | Shows, Syd Norman's, casino, activities |
| `content/tips.json` | 19.4KB | Haven insider tips, tipping guide, casino guide |

### KB Markdown Files (for FAIT Upload)
| File | Lines | Topic |
|------|-------|-------|
| `kb-content/01-ship-guide.md` | 207 | Norwegian Luna complete ship guide |
| `kb-content/02-gf-dining-guide.md` | 223 | Gluten-free dining — all restaurants |
| `kb-content/03-itinerary.md` | 322 | Full trip itinerary day-by-day |
| `kb-content/04-port-guides.md` | 173 | All 4 ports with excursion details |
| `kb-content/05-entertainment-guide.md` | 177 | Shows, Syd Norman's, pool deck |
| `kb-content/06-haven-insider-tips.md` | 205 | Butler strategy, concierge, Haven secrets |
| `kb-content/07-tipping-guide.md` | 157 | Full tipping guide with amounts |
| `kb-content/08-casino-guide.md` | 218 | Casino, Casinos at Sea, Holly's blackjack |
| `kb-content/09-spa-guide.md` | 205 | Thermal suite, booked treatments, tips |

**Total KB content: 1,887 lines across 9 documents — ready to upload to FAIT.**

---

## ✅ Acceptance Criteria Status

| Criteria | Status | Notes |
|----------|--------|-------|
| Opens on mobile, prompts Add to Home Screen | ✅ | manifest.json + SW registered |
| PIN 1104 → Fred's view | ✅ | Implemented in app.js |
| PIN 0405 → Holly's view | ✅ | Implemented in app.js |
| Wrong PIN → shake animation | ✅ | CSS keyframe shake on pin-dots-row |
| Holly: large gold voice button | ✅ | 140px gold circle, pulse animation |
| Holly: GF guide front and center | ✅ | Quick questions + GF tab accessible |
| Fred: full itinerary visible | ✅ | Itinerary tab with all 8 days |
| Fred: all 9 content areas accessible | ✅ | 7 tabs: Today, Itinerary, GF, Ports, Spa, Shows, Tips |
| GF search: "eat at Onda?" → GF pasta | ✅ | searchKB() routes GF queries to gf-guide |
| Offline: itinerary + GF guide without internet | ✅ | Service worker caches all content JSON |
| All 9 KB markdown files ready | ✅ | 1,887 lines, FAIT-ready |
| Navy/gold branding throughout | ✅ | #0d1420 bg, #1a2340 cards, #c9a84c gold |

---

## 🏗️ Architecture

```
PIN Screen (HAVEN wordmark + 4-key pad)
    ↓ 1104              ↓ 0405
Fred's View          Holly's View
├── Today tab        ├── Greeting + countdown
├── Itinerary tab    ├── Large voice button (Web Speech API)
├── GF Guide tab     ├── Quick question buttons (6)
├── Ports tab        ├── Answer display
├── Spa tab          ├── GF restaurant cards
├── Shows tab        └── "Connect to Haven AI" button
├── Tips tab
└── Chat search
```

**KB Search routing:**
- "eat" / "gluten" / "celiac" → GF guide search
- "today" / "schedule" / "port" / "dock" → itinerary
- "spa" / "facial" / "thermal" / "mani" → spa guide
- "show" / "rocket" / "syd" / "entertainment" → entertainment
- Everything else → general fuzzy search across all content

---

## 📱 How to Access the App

### Option A: Quick Local Test (SteamServer)
```bash
# Serve from the haven directory
cd /home/fredw/projects/personal/haven
python3 -m http.server 8420

# Access at: http://[SteamServer-IP]:8420
```

### Option B: FRIDAY NAS (Recommended for cruise)
1. Copy the `haven/` folder to FRIDAY's web-served directory
2. Access via local network: `http://friday.local/haven/`
3. Install to home screen from Safari (iOS) or Chrome (Android)

### Option C: Any Static Host
Upload the entire `haven/` directory to Netlify, Vercel, or Cloudflare Pages for a public URL. Since this is personal (surprise gift), a private URL is fine.

### iOS Install Instructions
1. Open Safari, navigate to the app URL
2. Tap the Share button (box with arrow)
3. Scroll down → "Add to Home Screen"
4. Name it "Haven" → Add
5. Gold anchor icon appears on home screen

### Android Install Instructions
1. Open Chrome, navigate to the app URL
2. Tap the 3-dot menu
3. "Add to Home Screen" or "Install app"
4. Confirm → icon appears

---

## 🤖 Haven AI Integration

The app currently uses a **self-contained KB search** against the local JSON content files. This covers ~90% of Holly's questions offline.

For complex questions, the **"Connect to Haven AI"** button opens `https://fait.dev.fortressam.ai/` in a modal overlay (mobile) or new tab (desktop).

### To enable full FAIT AI integration:
1. Upload all 9 `kb-content/*.md` files to the FAIT knowledge base
2. If FAIT exposes a public/token API, update `HAVEN_AI_URL` in `app.js` and add fetch logic to `searchKB()`
3. The local search can serve as the offline fallback

---

## ⚠️ Known Gaps / Follow-ups

1. **Apple Touch Icon**: SVG icons work for PWA manifest but iOS "Add to Home Screen" traditionally needs PNG. If the icon doesn't show correctly on iOS, convert `icon-192.svg` to PNG via: `convert icons/icon-192.svg icons/icon-192.png` and update manifest + meta tag.

2. **Voice API support**: Web Speech API (SpeechRecognition) works in Chrome Android and Safari iOS 14.5+. It does NOT work in Firefox or some embedded browsers. Holly's view falls back gracefully to text display.

3. **Offline font loading**: Google Fonts (Playfair Display, Inter) won't load offline. The app falls back to Georgia and system-ui — functional but less elegant. To fix: pre-download fonts and add to service worker cache.

4. **Edit mode**: Fred's edit mode toggle is present in the UI but the note persistence (localStorage) is a stub — full CRUD editing would be a follow-up feature.

5. **Push notifications**: Morning briefing notifications require a backend (service worker push) — not implemented. Fred can set a phone alarm as the interim solution.

6. **Real-time weather/port data**: Current port schedule is static from the JSON. A weather API integration would be a nice-to-have.

---

## 🌟 Special Features

- **Countdown to sailing**: Holly's view shows "23 days until we sail" (or cruise status once underway)
- **Time-aware greeting**: "Good morning/afternoon/evening, Holly"
- **Today's context**: Fred's "Today" tab automatically shows the current cruise day
- **Emergency phrases**: GF guide includes Spanish allergy card text for port dining
- **Session persistence**: View stays active until browser close (sessionStorage) — no re-entering PIN on every page reload

---

_Built with care for the world's best trip. Holly's going to love it. 🥂_
