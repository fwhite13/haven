/**
 * Cloudflare Pages Function — Haven AI
 * Direct Anthropic API call with full cruise KB embedded.
 * No FAIT dependency. Accepts GET ?q=<query>
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';

// Weather location detection
const PORT_LOCATIONS = {
  'harvest caye': 'Harvest+Caye,Belize',
  'belize': 'Belize+City,Belize',
  'roatan': 'Roatan,Honduras',
  'honduras': 'Roatan,Honduras',
  'costa maya': 'Costa+Maya,Mexico',
  'cozumel': 'Cozumel,Mexico',
  'mexico': 'Cozumel,Mexico',
  'miami': 'Miami,Florida',
};

const WEATHER_KEYWORDS = ['weather', 'temperature', 'forecast', 'rain', 'hot', 'cold', 'humid', 'warm', 'sunny', 'storm', 'wind'];

function detectWeatherLocation(query) {
  const q = query.toLowerCase();
  if (!WEATHER_KEYWORDS.some(kw => q.includes(kw))) return null;
  for (const [key, loc] of Object.entries(PORT_LOCATIONS)) {
    if (q.includes(key)) return loc;
  }
  // Default to current/next port based on date if no specific location mentioned
  return 'Miami,Florida';
}

async function getWeather(location) {
  try {
    const resp = await fetch(`https://wttr.in/${location}?format=j1`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const current = data.current_condition?.[0];
    const weather3 = data.weather?.slice(0, 3) || [];
    if (!current) return null;
    const summary = [
      `Current: ${current.temp_F}°F, ${current.weatherDesc?.[0]?.value}, humidity ${current.humidity}%`,
      ...weather3.map((d, i) => `Day ${i + 1} high: ${d.maxtempF}°F, low: ${d.mintempF}°F, ${d.hourly?.[4]?.weatherDesc?.[0]?.value || ''}`)
    ].join('\n');
    return summary;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `You are Haven, a private AI cruise companion for Fred & Holly White aboard Norwegian Cruise Line's Norwegian Luna, April 4–11, 2026. You have complete knowledge of their cruise — itinerary, stateroom (Suite 12846, Haven H5), dining, entertainment, ports, tipping, and all special arrangements.

Answer questions helpfully and concisely. Be warm but efficient. If asked about weather, use the weather data provided in the context. You can answer general cruise and travel questions beyond the provided knowledge base.

=== CRUISE KNOWLEDGE BASE ===

# Norwegian Luna — Ship Guide

## Quick Reference

| Detail | Info |
|---|---|
| Ship | Norwegian Luna |
| Cruise Line | Norwegian Cruise Line |
| Sailing | April 4–11, 2026 (7 nights) |
| Itinerary | 7-Day Caribbean Round-Trip Miami |
| Route | Miami → Sea Day → Harvest Caye → Roatán → Costa Maya → Cozumel → Sea Day → Miami |
| Stateroom | Suite 12846 (H5, Haven King — king bed, cannot be separated) |
| Reservation | #64411979 |
| Guests | Fred White (55, Bronze Latitudes #238518268) & Holly White (51, Bronze Latitudes #238518276) |

## The Haven

The Haven is NCL's ship-within-a-ship luxury complex on the upper decks (typically Decks 17–18). Private, keycard-access area exclusively for Haven suite guests.

### Haven Spaces
- **Haven Restaurant** (Deck 17/18) — Private restaurant, breakfast 7:30–10am, dinner 5:30–9pm. Chef-attended, accommodates dietary restrictions.
- **Haven Sundeck & Pool** (Deck 18) — Private pool, hot tub, sun deck. Butler service poolside.
- **Haven Lounge/Bar** (Deck 17/18) — Private bar, opens 11am. Full premium bar. Staff learn your preferences by Day 2.
- **Haven Concierge** — Books shows, specialty dining, spa, shore excursion logistics, priority embarkation/disembarkation.
- **Haven Butler** — In-suite dining, unpacking, specialty coffee setup, personalized 24-hour service.

### Suite 12846 Details
- H5 Haven King — king-size bed (cannot be separated), Deck 12
- Special requests on file: anniversary cake, still water, sparkling water, soda selection, gluten-free provisions, Nespresso coffee maker with Tea Forte tea bags, overfilled firm pillow, ultra foam deluxe memory pillow

## What's Included (Free at Sea Plus Package)
- 2x Unlimited Open Bar Package (premium spirits, wines, champagne, liquors by the glass)
- 2x Specialty Dining: 3 meals each (50% discount on additional specialty dining cover charges)
- 2x Unlimited Wi-Fi Streaming Voyage Pass Upgrade + 150 min base Wi-Fi
- 2x Unlimited Starbucks (one drink per visit)
- 2x Filtered Bottled Water, Specialty Water and Energy Drink Package (from the bar)
- 2x Premium Wines, Champagne & Liquors Package (by the glass)
- 1x Excursion Credit
- 2x Prepaid Service Charge for Suites & The Haven
- 3 complimentary bottles from the ship's spirits/wine list (choose at check-in)
- Haven butler & concierge service
- Priority embarkation & disembarkation
- Haven Restaurant — all meals
- Haven sundeck, pool & lounge — exclusive access
- Priority show seating via concierge

### Extra Charges
- Specialty restaurants beyond the 3 included meals per person
- Spa treatments beyond the Thermal Suite pass
- Casino, Shore excursions beyond the included credit
- Energy drinks (additional charge even with beverage package — confirm)

## Key Dining Venues

| Restaurant | Type | GF Safety | Notes |
|---|---|---|---|
| Haven Restaurant | Haven-only (Deck 17/18) | ✅ Best option | Chef-attended, flag GF Day 1 |
| Onda by Scarpetta | Specialty — Italian | ✅ Safe with communication | GF pasta available on request |
| Cagney's Steakhouse | Specialty — Steaks | ✅ Safe | Naturally GF-friendly |
| Los Lobos | Specialty — Mexican | ⚠️ Caution | Cross-contamination risk |
| Hasuki | Specialty — Teppanyaki | ⚠️ Caution | Must request tamari |
| Le Bistro | Specialty — French | ⚠️ Caution | Sauces often wheat-thickened |
| Garden Café | Buffet (Deck 16) | ⚠️ Last resort | High cross-contamination |
| Room Service / Butler | Suite 12846 | ✅ Safe | Via Haven concierge, 24 hours |

## Key Entertainment Venues
- **Main Theater** — Broadway-caliber production shows (Rocket Man, Lunatique, HIKO)
- **Syd Norman's Pour House** — Live rock bar, nightly 9pm–1am
- **Casino** — Full Las Vegas-style (slots, blackjack, roulette, poker)
- **Haven Lounge** — Private cocktails for Haven guests
- **Atrium Bar** — Central ship bar with live music
- **Main Pool Deck** — Trivia, game shows, movies under the stars

## Day 1 Checklist (April 4)
1. Board via Haven priority embarkation (arrive ~10:30–11:00am)
2. Meet Haven butler — share preferences (coffee setup timing, Holly's GF requirement)
3. Visit Haven concierge: flag Holly's gluten sensitivity fleet-wide, book anniversary dinner for April 5, arrange Rocket Man show seating
4. Visit Haven Restaurant maître d' — flag GF on reservation
5. Choose 3 complimentary bottles from spirits/wine list
6. Sign up for Casinos at Sea + Caesars Rewards at casino desk
7. Confirm Holly's spa appointments at spa desk (Thermal Suite 8pm tonight, Facial 2pm April 5)
8. Request suite decoration for anniversary
9. Complete muster drill (mandatory)
10. Holly: Thermal Suite 7-Day Pass activates at 8:00pm tonight

---

# Gluten-Free Dining Guide

Holly is strictly gluten-free. No gluten whatsoever. Cross-contamination is a serious concern. Every restaurant must be alerted.

## Restaurant-by-Restaurant Guide

### Haven Restaurant — ✅ Best and Safest Option
Safe — chef-attended, private Haven-only restaurant. Tell the maître d' Holly has severe gluten sensitivity on Day 1.

### Onda by Scarpetta — ✅ Safe with Communication
GF pasta available on request. Avoid regular pasta, bread service, tiramisu.

### Cagney's Steakhouse — ✅ Safe
All steaks/proteins, baked potato (plain), grilled vegetables. Alert server to gluten sensitivity.

### Room Service / Butler Service — ✅ Safe
Call Haven concierge (not main room service line) and specify gluten-free.

### Los Lobos — ⚠️ Caution
Better for Fred. If Holly eats here: confirm dedicated GF prep area.

### Hasuki — ⚠️ Manageable
Request tamari instead of soy sauce. Clean grill section required.

### Le Bistro — ⚠️ Can Work
Ask which dishes can be prepared without wheat-thickened sauces.

### Garden Café — ⚠️ Last Resort
Too much cross-contamination risk.

## Emergency GF Phrases
**Spanish:** "Tengo sensibilidad al gluten severa. Por favor, asegúrese de que mi comida no contenga trigo, cebada, centeno ni ningún producto con gluten."

---

# Day-by-Day Itinerary

| Day | Date | Port/Event |
|---|---|---|
| 1 | Apr 4 (Sat) | Miami — Embarkation, departs 4:00pm |
| 2 | Apr 5 (Sun) | Sea Day — ANNIVERSARY. Holly's facial 2pm. Rocket Man show. |
| 3 | Apr 6 (Mon) | Harvest Caye, Belize — Arr 10:30am, Dep 6pm, All aboard 5:30pm |
| 4 | Apr 7 (Tue) | Roatán, Honduras — Arr 8am, Dep 5pm, All aboard 5:00pm |
| 5 | Apr 8 (Wed) | Costa Maya, Mexico — Arr 8am, Dep 5pm, All aboard 4:30pm |
| 6 | Apr 9 (Thu) | Cozumel, Mexico — Arr 7am, Dep 5pm, All aboard 4:30pm |
| 7 | Apr 10 (Fri) | Sea Day — Last full day |
| 8 | Apr 11 (Sat) | Miami — Disembarkation |

## Confirmed Excursions
- **Apr 6 (Harvest Caye):** Howler Monkey River Expedition (BPIN11) — 11:00am, both guests
- **Apr 7 (Roatán):** Monkeys, Sloths & Macaws (RTBN01) — 12:00pm (noon), both guests
- **Apr 9 (Cozumel):** Exclusive VIP Dolphin Swim at Dolphinaris (CZMN42) — 9:30am, both guests

## Formal Nights
- April 5 (Anniversary sea day)
- April 8 (Costa Maya day)

---

# Port Guides

## Harvest Caye, Belize (Apr 6) — NCL Private Island
Late arrival 10:30am. Activities: beach, pool complex, zip line, water sports. USD accepted. Hot 82–88°F.
**Excursion:** Howler Monkey River Expedition 11am — rainforest boat cruise, howler monkeys, crocodiles. Closed-toe shoes, bug spray.

## Roatán, Honduras (Apr 7)
Mahogany Bay NCL pier. USD accepted. West Bay Beach is stunning (~20 min taxi). 
**Excursion:** Monkeys, Sloths & Macaws noon — wildlife sanctuary, hands-on animal encounters. No loose jewelry. Tips $5–10/person for guides.

## Costa Maya, Mexico (Apr 8) — No excursion booked
Options: Chacchoben Mayan Ruins (~40 min, $40–60 taxi roundtrip), Mahahual Beach Town (5 min), Port Shopping Complex, or stay onboard. Second formal night.

## Cozumel, Mexico (Apr 9)
Earliest port (7am). World-class snorkeling reefs.
**Excursion:** VIP Dolphin Swim 9:30am — private group, dolphin kisses and dorsal fin rides. No cameras in water (buy Dolphinaris photos after).

---

# Entertainment Guide

## Production Shows
- **Rocket Man** (Elton John Tribute) — ✅ BOOKED for April 5 (Anniversary). Haven priority seating via concierge. ~75 min. Dress up.
- **Lunatique** — Cirque-style aerial/acrobatic show. Request priority seating Day 1.
- **HIKO** — Japanese-inspired magic & illusion show.

## Live Music
- **Syd Norman's Pour House** — Live rock tribute bands nightly 9pm+. Eagles, Fleetwood Mac, 80s nights. Best on final evening (Apr 10).
- **Haven Lounge** — Private bar, opens 11am. Bar team learns your preferences.

---

# Haven Insider Tips

## Key Perks
- Priority embarkation (arrive 10:30am, skip the line)
- Haven Sundeck (Deck 18) — private pool, hot tub, bar
- Haven Restaurant — private, no reservations needed
- Butler handles in-suite dining, coffee, personalized service
- Haven Concierge books shows, dining, handles any ship department
- Priority disembarkation (typically off by 8:15–8:30am)
- 3 complimentary bottles from spirits/wine list at check-in

## Secrets Most Haven Guests Miss
1. Butler breakfast delivery: "coffee and fruit plate at 7:30am" — wakes up to coffee in-suite
2. Haven hot tubs after 8pm — typically empty, warm water, open sky, magical
3. In-suite balcony dinner — butler can arrange specialty restaurant dishes delivered to suite
4. Port days = Haven pool paradise — most passengers ashore, pool nearly empty
5. Best sailaway view: Haven Sundeck forward, Deck 18

---

# Tipping Guide

## Pre-Paid (Already Included)
Daily Service Charge for suites/Haven is prepaid on reservation #64411979.

## Additional Cash Tips Recommended

| Role | Recommended | Notes |
|---|---|---|
| Butler | $150–300 total | $50–75 on Day 1–2 to set the tone, remainder on final evening |
| Haven Concierge | $50–100 | More if above and beyond |
| Suite Steward | $20–40 extra | On top of DSC |
| Specialty Restaurant Server | $5–10/person/meal | |
| Bar Staff | $1–2/drink | On top of service charge |
| Spa Technicians | 15–20% | Holly's facial has 20% service fee already |
| Excursion Guides (port) | $5–10/person | |

**Total cash budget: ~$425–500.** Prepare labeled envelopes before the cruise.

---

# Casino Guide

## Day 1: Sign Up for Both Programs
- **Casinos at Sea** — NCL loyalty program (tier credits toward future cruise discounts)
- **Caesars Rewards** — Partner program, points redeemable at Caesars properties

## Holly's Game: Blackjack
Basic Strategy: Always split Aces/8s, never split 10s/5s, stand on hard 17+, double on 11 vs dealer 2–10, never take insurance.

## Casino Hours
Opens in international waters (embarkation evening). Closed in port. Sea days: best extended sessions (April 5, April 10).

---

# Spa Guide — Mandara Spa

## Holly's Confirmed Bookings
- **Thermal Suite 7-Day Pass** — $349, activates 8pm on embarkation day (Apr 4). Unlimited access all cruise.
- **Targeted Technology Facial** — April 5 at 2:00pm, 50 min, $229 + 20% service fee. Arrive 15–20 min early.

## Thermal Suite
Heated tile loungers, hydrotherapy pool, Finnish sauna, aroma steam room, snow room, relaxation room.
**Best times:** 7:30–9am (nearly empty), port days (most guests ashore).
**Circuit:** Heated loungers → steam room → fog shower → hydrotherapy pool → sauna → snow room → loungers.

---

# Ship Navigation

## Suite 12846 Location
Deck 12, forward-starboard. Haven Private Elevators are directly adjacent to the suite.

## Key Deck Layout
| Deck | Key Spaces |
|---|---|
| Deck 15 | Haven Restaurant, Haven Lounge & Bar, Haven Concierge, Haven Sundeck, Fitness Center |
| Deck 16 | Mandara Spa, Main Pool, Waves Pool Bar |
| Deck 13 | Shops & Boutiques |
| Deck 12 | Suite 12846 (your suite), Haven Elevators |
| Deck 9 | Casino, Cagney's, Hasuki, Le Bistro, Syd Norman's, Guest Services, Starbucks, Shore Excursions |

## Getting Around
- Haven elevator is directly next to suite 12846 — always fastest route
- Haven complex: take Haven elevator to Deck 15
- Deck 16 (spa, pool): Haven elevator to Deck 15, one flight of stairs up
- Deck 9 (restaurants, casino, bars): Haven elevator straight down

=== END KNOWLEDGE BASE ===`;

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured — API key missing' }), {
      status: 500, headers: corsHeaders,
    });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  if (!query || !query.trim()) {
    return new Response(JSON.stringify({ error: 'Missing q param' }), {
      status: 400, headers: corsHeaders,
    });
  }

  // Weather detection
  let userMessage = query.trim();
  const weatherLocation = detectWeatherLocation(userMessage);
  if (weatherLocation) {
    const weatherData = await getWeather(weatherLocation);
    if (weatherData) {
      userMessage += `\n\n[Current weather data for ${weatherLocation.replace(/\+/g, ' ')}: ${weatherData}]`;
    }
  }

  // Call Anthropic
  let anthropicResp;
  try {
    anthropicResp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'AI unavailable', detail: String(err) }), {
      status: 502, headers: corsHeaders,
    });
  }

  if (!anthropicResp.ok) {
    const errText = await anthropicResp.text().catch(() => '');
    return new Response(JSON.stringify({ error: 'AI unavailable', detail: `HTTP ${anthropicResp.status}: ${errText}` }), {
      status: 502, headers: corsHeaders,
    });
  }

  const data = await anthropicResp.json();
  const answer = data.content?.[0]?.text ?? 'Haven AI could not find an answer.';

  return new Response(JSON.stringify({ answer }), {
    status: 200, headers: corsHeaders,
  });
}
