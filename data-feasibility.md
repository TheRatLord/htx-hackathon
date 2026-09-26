# RideMETRO Data Feasibility: Can We Build This on Real METRO Data?

**Project:** Houston Hackathon 2026, RideMETRO app revamp
**Compiled:** September 25, 2026
**Question:** If we turn the prototype into a working demo, can we get real Houston stops, schedules and live bus predictions?

**Short answer:** Very likely yes. METRO runs a public developer portal with schedules and live predictions. It needs a free sign-up and a subscription key, and someone on the team has to do that step (I can't create accounts).

---

## 1. What METRO's developer portal offers

The portal at [api-portal.ridemetro.org](https://api-portal.ridemetro.org/) is run by the Metropolitan Transit Authority of Harris County. It lists four data products:

| Data product | What it gives us | Feeds which prototype feature |
|---|---|---|
| **GTFS Realtime** | Live bus arrival predictions | Live vs. scheduled times, countdowns |
| **GTFS Alerts** | Service alerts by route, in JSON and Protocol Buffer formats | Alerts on route and stop screens |
| **Transit Data** | Stops, routes and related information | Nearby stops, stop numbers, route names |
| **Static GTFS** | Downloadable schedule files (routes, stops, timetables) | Timetables, trip planning |

**How access works:** sign up with a Microsoft or Google account, subscribe to each API, and get subscription keys for your requests.

**Terms we'd have to follow (from the portal):**
- Show this attribution: "Route and arrival data provided by permission of METRO".
- The data is provided "as is" and "as available", with no accuracy warranty.
- METRO grants a limited, revocable license to use and redistribute the data, and keeps its trademark and intellectual property rights.

## 2. Evidence from other developers

- An open-source project, [wheres-my-bus](https://github.com/duckheap/wheres-my-bus), reads METRO's GTFS Realtime "TripUpdates" data from `https://api.ridemetro.org/GtfsRealtime/TripUpdates` (Protocol Buffers). It also uses METRO's other APIs for vehicle information, stop coordinates and route names. This is a third-party report and we haven't tested it ourselves.
- The Mobility Database lists an older METRO static schedule feed, last updated in 2022, and says it has been replaced by a newer producer URL. So use the current feed from the portal, not old download links.

## 3. What we have not verified

- Whether live **vehicle positions** (where each bus is) are available, or only arrival predictions. Needed for "tracking lost" detection and for showing buses on the map.
- How often the data refreshes, and the rate limits on a free key.
- Whether trip planning is available as an API. It doesn't look like it, so a demo would need its own routing on top of static GTFS.
- Whether METRO's fare and account systems have any public API. We assume not, so the Fares tab stays a design concept.

## 4. What we'd build on top

| Prototype feature | Real-data version |
|---|---|
| Nearby stops with stop numbers | Stops from Transit Data or static GTFS, sorted by distance from the phone's location |
| Live vs. scheduled countdowns | GTFS Realtime predictions, falling back to static timetables |
| "Tracking lost" state | Flag a route when its live predictions stop updating for a set time |
| Where to? search and route options | Place search (an open geocoder or a maps provider), plus routing on static GTFS and OpenStreetMap walking paths (for example with the open-source OpenTripPlanner) |
| Multiple routes on the map | Route geometry from static GTFS shapes |
| Saved places and trips | Stored on the phone, no account needed |

## 5. Suggested demo plan (about one to two days for a small team)

1. **Get a key.** One teammate signs up on the portal and subscribes to GTFS Realtime, Transit Data and Static GTFS.
2. **Nearby stops and live times.** A small web app that shows nearby stops with live countdowns. This alone covers the biggest complaint (untrustworthy tracking) with real data.
3. **Stop screen.** Real timetables and the live vs. scheduled labels.
4. **Trip planning.** Add routing last, since it is the hardest part.

If the key or data doesn't work out, the prototype and video are still a complete concept submission.

## 6. Risks

- Accuracy is METRO's, not ours. Our design can label uncertainty but can't fix bad predictions.
- The attribution requirement must appear in any public demo.
- Keys must never be committed to the GitHub repo. Keep them in an environment file that is ignored by git.
