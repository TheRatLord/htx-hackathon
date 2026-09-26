# RideMETRO Improvements: What NYC Does Well

**Project:** Houston Hackathon 2026, RideMETRO app revamp
**Compiled:** September 25, 2026
**Purpose:** Learn from New York's transit apps (based on App Store, Google Play, and press coverage), then map those lessons to the problems in [complaints.md](complaints.md).

---

## 1. NYC Benchmark Snapshot

| App | Type | Store rating | What it's known for |
|---|---|---|---|
| **The Official MTA App** | Official (subway + bus) | 4.4 / 5 on iOS (13K ratings) | Accurate real-time data, ad-free, favorites, accessibility |
| **MTA TrainTime** | Official (LIRR / Metro-North) | 4.9 / 5 on iOS (211K ratings) | In-app tickets with Apple Pay, GPS tracking, crowding, train car layout |
| **Citymapper** | Third party | 4.9 / 5 on iOS (108K ratings) | Live delays, platform and exit guidance, multi-route comparison |
| **Transit** | Third party | (store rating not retrieved) | "Now" screen of nearby departures, crowdsourced reports, bus focus |
| **OMNY** | Fare system, not an app | n/a | Tap-to-pay, fare capping (free after 12 paid rides a week) |

For comparison, the current RideMETRO app is at 2.2 (iOS) and 3.5 (Google Play). Note that a higher rating for Citymapper or TrainTime doesn't automatically transfer, since they do narrower jobs than RideMETRO. The official MTA app is the fairest comparison (transit info) and TrainTime is the fairest for payment.

---

## 2. What NYC Apps Do Well, With Rider Evidence

### 2.1 The Official MTA App (4.4 on iOS)
**What riders praise**
- "I found this app to be extremely helpful and accurate during my very first trip to NYC...I did download a highly rated third party app and found the official MTA app to be superior, and also ad free." (5 stars, June)
- "Very impressed with the latest update...you can favorite lines and stations across the system - it only defaults to nearby (which makes sense!)" (5 stars, May)
- "I think the redesign is much better." (5 stars, May)

**What the redesign added** (Time Out, MTA press coverage)
- Live positions of trains and buses, plus arrival times for every upcoming stop, not just the next one
- Clearer layouts for multi-level stations, better transfer guidance, and markers for where to stand on the platform
- More frequent bus location updates and real-time bus-to-subway connections
- An accessible-stations mode, easy elevator and escalator status, screen reader support, and font scaling
- Built in-house, which the MTA says means faster future updates and lower costs
- OMNY ride history planned for later in the year

**Where it stumbled (lessons in what NOT to do)**
- Widgets were removed in the redesign and riders noticed: "love the app and the app widgets on the screen that i could see my local stop next train time easily! after the most recent update the widget function seems disappeared." (1 star, April)
- Some riders felt the update removed information: "Once could use the app to tell me exactly where to go, where the bus and trains were, and how to transfer...in summary I just have a waste of space on my phone." (1 star, April)
- One 5-star review is sarcastic about the app now showing only nearby lines by default, though another user says the same information is still available. This is a discoverability problem more than a missing feature.
- **Lesson for RideMETRO:** a redesign wins when it keeps what people relied on and makes the rest easier to reach. Don't remove features to look cleaner.

### 2.2 MTA TrainTime (4.9 on iOS, 211K ratings)
**Features riders cite:** tickets via Apple Pay or card, trip planning with transfer details, save frequent trains, share trips with family and friends, real-time GPS tracking updated every few seconds, train car layout and crowding estimates, and in-app customer service chat.

**Praise**
- "The Train Time app is now very user-friendly and it is easy to navigate among the varied functions eg train time departures and arrivals, track numbers..." (Jan 2023)
- "This can't be a public transport app. It's too well-designed...From matching up potential tickets to the train time all in one place to carriage occupancy..." (May 2023)
- "The app is convenient as I can buy my ticket as I'm running for the train." (Aug 2024)

**Complaints (again, lessons)**
- Riders object to account-blocking threats over ticket activation and to location tracking used to verify tickets: "using tickets in the app is frankly insane...they track your location to ensure..."
- **Lesson:** payment inside the app should be forgiving. Don't punish riders with account blocks or aggressive location checks. It undoes goodwill.

### 2.3 Citymapper (4.9 on iOS, 108K ratings)
**Praise**
- "Best transit app they've tried across Chicago, Boston, and New York," highlighting real-time delay tracking and platform position info
- "All the information in one place WITH LIVE UPDATES and allows you to customize routes"
- "Quickest routes and options for different types of subways based on your preferences"
- Multiple route options are valued "especially when the buses don't run as promised or I have to make a quick change of plans"
- Users compare walking, transit, and other modes to see "if walking, public transportation or another method is faster"

**Complaints**
- Doesn't always detect shuttle buses during disruptions
- Confusing at large stations without platform guidance
- Weak first/last-mile customization (bike connections)

**Lesson:** offering several route options with honest time estimates builds trust, and it is what riders reach for when the bus is late.

### 2.4 Transit app (per NYC Moov's 2026 comparison)
- An instant "Now" screen showing nearby routes with live countdowns, good for "what's arriving now" decisions
- Strong bus experience, especially outer boroughs
- Crowdsourced rider reports surface issues early
- Weaker on complex multi-transfer trip planning

Transit also already covers Houston (METRO, Park & Ride, Harris County Transit, and Rice University transit), so it is a direct competitor for RideMETRO's tracking function and a useful thing to study directly.

*Note: this section relies on a single comparison article, not store reviews.*

### 2.5 OMNY and fare capping (what to copy and what to avoid)
- **Good:** tap-with-phone-or-card payment, no ticket to buy first, and fare capping (after 12 paid rides in a week, further rides are free) so riders never need to work out whether a pass is worth it.
- **Bad:** a Permanent Citizens Advisory Committee survey of nearly 400 riders found 74% had issues, with more than 40% saying readers failed to register a tap, 34% reporting delayed charges, and 31% believing they were overcharged. Nearly 70% of those who complained said the problem went unresolved. **The MTA disputes this**, calling it a "tiny online push poll" and citing internal surveys with 84% satisfaction. Treat the numbers as a warning signal, not a settled fact.
- **Lesson:** tap-to-pay works when it's reliable and errors are fixable. Whatever RideMETRO builds, add a visible payment history and an easy dispute path.

### 2.5b The ad-free point
A popular third-party NYC bus app (OK Transit's "NYC MTA Bus Time") is rated 4.3 but gets complaints like "Too many commercials...not helpful if you're making your bus." Meanwhile the official MTA app is praised as "ad free." Keeping the RideMETRO app free of ads is a small but real selling point.

---

## 3. Recommendations for RideMETRO

Each idea is mapped to the complaint it addresses. Effort is a rough hackathon guess: **S** (hours), **M** (about a day), **L** (needs backend or agency data).

### Tier 1: Build these first (biggest complaint impact)

| # | Feature | Fixes complaint | NYC precedent | Effort |
|---|---|---|---|---|
| 1 | **Live vs. scheduled badge on every arrival.** Show clearly whether a time is a live GPS prediction or a timetable guess, and show "last updated Xs ago." If a bus disappears from the map, say "Tracking lost, scheduled time shown" instead of leaving nothing. | 2.1 Real-time trust | MTA app shows arrivals for every stop; Citymapper live delay tracking | M |
| 2 | **Boarding mode for the fare QR.** One tap from the lock screen or a widget opens a full-screen, maximum-brightness, very large code. Cache the code so it opens with no signal. | 2.2 QR problems, 2.7 offline | TrainTime: buy ticket "as I'm running for the train" | M |
| 3 | **Nearby "Now" home screen.** Open the app to nearby stops with live countdowns and favorites, with trip planning one tap away. | 2.6 new-rider confusion | Transit app "Now" screen; MTA favorites that default to nearby | M |
| 4 | **Favorites and home-screen widgets** for stops and routes. | 2.6 | MTA riders explicitly asked for widgets back | S-M |

### Tier 2: High value if time allows

| # | Feature | Fixes complaint | NYC precedent | Effort |
|---|---|---|---|---|
| 5 | **Stay-signed-in design.** Long-lived sessions with Face ID or fingerprint re-authentication instead of forced logouts. | 2.3 Logouts | No direct NYC evidence found; standard mobile practice | S-M |
| 6 | **Multiple route options with honest ETAs**, including a "walk vs. ride" comparison. | 2.1 | Citymapper | M |
| 7 | **Fare balance, rewards, and history in one screen**, including migrated Q balance and earned free rides, with a clear "something's wrong" button. | 2.4 Migration, 2.5 | OMNY lesson: transparency about charges | M |
| 8 | **Fare-capping display** ("You're 3 rides from a free trip") tied to the existing rewards. | 2.4 | OMNY capping | S |
| 9 | **Rider reports** ("bus never came", "bus full") that feed back into tracking. | 2.1 | Transit app crowdsourced reports | L |

### Tier 3: Stretch goals and polish

| # | Feature | Fixes complaint | NYC precedent | Effort |
|---|---|---|---|---|
| 10 | **Accessibility mode**: accessible stops and rail stations highlighted, elevator status, screen reader support, scalable text, large tap targets. | 2.9 | MTA redesign | M |
| 11 | **Platform and stop guidance** at rail stations and big transit centers ("stand here", exit choice). Builds on version 2.71's transit-center departures list. | 2.6 | MTA redesign, Citymapper exit info | M-L |
| 12 | **Crowding indicator** on buses and rail. | none directly | TrainTime | L (needs data) |
| 13 | **Tourist-friendly path** for riders without a US data plan: Apple/Google Wallet pass or tap-to-pay with a bank card so the app isn't needed to ride. | 2.2, 2.7 | OMNY tap-to-pay | L |
| 14 | **In-app support chat / dispute flow.** | 2.5 | TrainTime in-app chat | L |
| 15 | **Single-entry app**: fold On Demand and legacy functions behind one home screen. | 2.8 fragmentation | No direct NYC evidence found (NYC also splits MTA app and TrainTime) | L |

---

## 4. Team Requirements (whiteboard session, September 25, 2026)

Our team's whiteboard for "Ride Metro Revamp" set these requirements. The right column shows how Prototype v1 handles each one. Prototype v1 is the "Prototype v1" page of the Claude Design canvas "RideMETRO Redesign Mockup" (https://claude.ai/artifact/TepnZU9hGLp3mekLKQ1Bdg, private until shared from its Share menu). The "Reference" page keeps the earlier static mockups.

| # | Requirement (as written on the whiteboard) | How Prototype v1 handles it |
|---|---|---|
| 1 | **Reduce clutter: remove the circle radius showing nearby bus stops** | The circle is gone. Nearby stops are numbered pins, each with a walk-time label (for example "3 min"). The numbers match the numbered "Near you" cards. |
| 2 | **Reduce clutter: remove bus route numbers on the left side of the screen** | Removed. Route numbers now appear only inside cards, route badges and the timetable. |
| 3 | **Make "Plan your trip" the main feature** | The home screen leads with a large "Where to?" search. Home, Work and saved places are one tap. The app opens with the nearby-stops sheet tucked down to one line (the next bus at the closest stop). Riders tap or drag it up for the full list. |
| 3a | Show routes with fastest travel time | A "Fastest" sort on the route options. Each option shows arrival time, total minutes and when to leave. |
| 3b | Show routes with shortest walking distance | A "Least walking" sort. The prototype measures walking in minutes, since that's what riders feel. Distance can be shown alongside if we get real walking data. |
| 3c | Show multiple routes displayed on the map at once | All options are drawn on the map together in different colors, each with a lettered badge (A, B, C). Tapping a card or a badge highlights that route. |
| 4 | **Be able to select specific nearby stops and see a clearly labeled bus schedule** | Tapping a stop pin or card opens that stop. The screen shows a tab per route and direction, the next departures labeled LIVE or SCHEDULED with a legend, and a timetable by hour. |
| 5 | **Be able to save destinations / trips** | A star saves a destination from search results and from the route screen. Saved places appear as chips on the home screen. A "Save trip" button on the trip screen adds it to a "Saved trips" list on the home screen. |

### 4.1 Visual direction: keep the app's glass look

The current RideMETRO app already has a glassy, polished, premium look. Our pitch is a **redesign and a set of feature add-ons, not a rebuild**, so Prototype v1 keeps that visual language and changes layout and content instead:

- **Frosted glass surfaces.** The search bar, chips, zoom controls, bottom sheet and full-screen pages are translucent and blurred, so the map shows through, as in the existing app.
- **Floating tab bar.** A rounded capsule tab bar (Trip, Fares, Recent, More) with a highlighted active tab, sitting over the sheet.
- **Route number cards.** Route numbers are white rounded cards with a colored top band, like the current app's route cards (blue, with red for the 700).
- **Same feel.** Soft shadows, large corner radii, one blue accent. The screens are cleaner because clutter was removed, not because the style changed.

### 4.2 Interactions in Prototype v1

- **Map:** drag to pan, scroll or pinch to zoom, double-click to zoom in, + and − buttons, and a locate button that re-centers.
- **Opens quiet:** the home screen opens with the nearby-stops sheet tucked away. Tapping or dragging the handle steps it through three heights (one line, half, full).
- **Fares tab:** a boarding pass screen (sample code only, not a valid fare code).
- **Recent tab:** recent destinations and saved trips.
- **More tab:** manage saved places and saved trips.
- **Numbered stop pins:** the map pins are numbered 1, 2 and 3 by distance and match the numbered Near you cards, with the walk time under each pin. Down the line we'd like to show real bus stop numbers (the app names stops like "Wheeler Transit Center - Bay F (11030)" today), which needs METRO's stop data.
- **Tracking lost, with a report button:** when a route's bus isn't being tracked, the card shows a LOST tag and the stop screen says so plainly, with a Report button that answers "Reported. Thank you." This is a design concept; the report goes nowhere until there is a backend.
- **Enlarge code:** on the Fares tab, "Trouble scanning? Enlarge code" makes the boarding code bigger for the scanner, and "Shrink code" puts it back. The code shown is a sample.
- **Placeholder data:** all places, times, routes and stops are placeholders, except the Wheeler Transit Center Bay F stop and the 5 Eastbound to Richey St route, which come from our screenshots. The map is a hand-drawn stand-in for a real map.

### 4.3 Stop schedule: we kept the app's format

We looked at how other apps show a stop's departures and tried a simplified version, but the team preferred RideMETRO's existing format. Prototype v1 keeps it, restyled in the same glass look: route and direction tabs, a strip of upcoming times, a legend for live and scheduled, and an hourly timetable.

Ideas we looked at and did not adopt, in case we want them later:

- **Transit** shows live times in bold with a radio-wave icon and scheduled times in gray, one row per route and direction, with the full timetable behind "More departures".
- **Google Maps** shows the next departure, then later ones as full clock times ("Also at 1:30 PM & 2:15 PM"), colors live times by status (green on time, orange early, red delayed), and hides the rest behind "More departures".

Sources: [Transit: check a schedule](https://help.transitapp.com/article/151-check-a-schedule), [Transit: how to track departures on your line](https://help.transitapp.com/article/445-how-to-track-departures-on-your-transit-line), [Google Maps: get train and bus departures](https://support.google.com/maps/answer/6142130?hl=en&co=GENIE.Platform%3DiOS).

**Open questions before building the real thing**
- Whether METRO's existing trip planner can be reached by an API, and whether it can return several route options at once. Not verified. The prototype uses placeholder routes.
- Whether the real data includes walking paths, so we can show walking distance and not just estimated minutes.
- How saved destinations and trips are stored (on the phone or in a rider account), which also affects the login complaints in complaints.md.

---

## 5. Design Principles (from NYC's wins and stumbles)

1. **Don't remove features people rely on.** The MTA's widget removal drew immediate anger. If something has to go, say why and offer a replacement.
2. **Default to nearby, keep everything else one tap away.** This is praised, but only when other lines are clearly still reachable.
3. **Be honest about data quality.** Label live vs. scheduled and show freshness. Trust comes from admitting when the system doesn't know.
4. **Make the boarding moment bulletproof.** Payment must work fast, offline, and one-handed.
5. **Never punish the rider for system errors.** Account blocks and location checks (TrainTime), or unresolved overcharges (OMNY), damage trust far more than a missing feature.
6. **Stay ad-free** and keep the interface calm.
7. **Build accessibility in from the start**, not as a mode added at the end.

---

## 6. Suggested Hackathon Plan (scope guidance)

A reasonable demo for a short hackathon is a clickable prototype covering **#1 to #4** and the **fare screen (#7)**, tied to a short demo story: *"Maria is running late, opens the app from her lock screen, sees the bus is live and 4 minutes away, and boards with a big, bright QR that works without signal."* Then show the same trip in the current app failing in the three ways riders complain about.

**Open question for the team:** METRO appears to have a developer API portal (it showed up in searches at api-portal.ridemetro.org, but we haven't opened or verified it). If real GTFS or real-time data is accessible, a working prototype using live Houston data would be far more compelling than mock data.

---

## 7. Limits of This Research

- Store review pages show only a handful of reviews to a text fetch, so quotes are examples, not statistics. For rigor, export full review sets.
- Ratings were read on the date compiled and change over time.
- The Transit app section and the "Official MTA App weaknesses" (less intuitive interface, no full offline mode) come from a single comparison article (NYC Moov), not store reviews.
- The Google Play page we retrieved for "MTA" turned out to be a third-party app (OK Transit), so Google Play evidence for NYC comes from that app and only supports the ad-free point. The official MTA evidence is from the App Store.
- The OMNY survey is contested by the MTA (see section 2.5).
- Dates on some App Store reviews omit the year.

---

## Sources

- [The Official MTA App, App Store ratings and reviews](https://apps.apple.com/us/app/the-official-mta-app/id1297605670?see-all=reviews&platform=iphone)
- [MTA TrainTime, App Store](https://apps.apple.com/us/app/mta-traintime/id1104885987)
- [Citymapper, App Store ratings and reviews](https://apps.apple.com/us/app/citymapper-all-live-transit/id469463298?see-all=reviews&platform=watch)
- [The MTA just launched a new revamped app with real-time tracking, Time Out](https://www.timeout.com/newyork/news/the-mta-just-launched-a-new-revamped-app-with-real-time-tracking-032626)
- [MTA (app), Wikipedia](https://en.wikipedia.org/wiki/MTA_(app))
- [Best NYC Transit App 2026, NYC Moov](https://www.nycmoov.com/guide/best-nyc-transit-app-2026-mta-citymapper-transit-google-maps-reviewed)
- [74% of NYC subway riders are having issues with OMNY, Time Out](https://www.timeout.com/newyork/news/74-of-nyc-subway-riders-are-having-issues-with-omny-says-new-study-071525)
- [NYC MTA Bus Time Subway Trains (OK Transit), Google Play](https://play.google.com/store/apps/details?id=app.oktransit.newyork&hl=en_US)
- [Transit app for the Houston area](https://transitapp.com/en/region/houston)
- [RideMETRO Mobile App, METRO](https://www.ridemetro.org/riding-metro/apps/ridemetro-app)
