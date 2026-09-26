# RideMETRO Revamp: Project Overview

**Houston Hackathon 2026** · Challenge: RideMETRO app revamp · Status: concept with a clickable prototype (not a working app)

## The 190-character submission line

We redesign RideMETRO around "Where to?" on a map-first home screen, with clear Live vs. Scheduled times and a warning when tracking is lost, so riders trust the app and plan trips in seconds.

## The 30-second pitch

Open RideMETRO today and you land on a crowded map with a circle of nearby stops, and it's hard to tell if a time is live or just scheduled. We keep the app's glassy look and change the front door. The home screen is a map that asks "Where to?". Type a place and you see the fastest and least-walking routes on the map at once. Every time is labeled Live, Scheduled or Tracking lost, and riders can report a bus that isn't tracking. It's a redesign plus add-ons, not a rebuild.

## 1. The problem (evidence in `complaints.md`)

Riders' reviews of the current app cluster around: confusing first screen and nearby-stops circle, times that don't say if they're live, unreliable bus tracking, QR code scanning trouble, logouts, card migration and payment errors. See `complaints.md` for the sources and the team's own observations.

## 2. The idea

- **Where to? first.** Map-first home like Google or Apple Maps, no circle, no route chips down the side.
- **Trip planning up front.** Fastest and Least walking sorting, all route options on the map at once.
- **Honest times.** Live, Scheduled and Tracking lost are labeled everywhere. Stop schedules keep the app's familiar format, restyled.
- **Saved places and trips**, a boarding pass with an enlarge-code option for scanning trouble.
- **Keep the look.** Glassy, polished styling stays.

Reasoning and what we borrowed from NYC apps is in `improvements.md`.

## 3. What exists today

| Item | Where |
|---|---|
| Clickable prototype (Claude Design, page "Prototype v1") plus the reference mockups | Claude Design canvas "RideMETRO Redesign Mockup" |
| 11 screenshots, a one-page storyboard, and a 34-second walkthrough video | `demo/` |
| Complaint research | `complaints.md` |
| NYC comparison and design requirements | `improvements.md` |
| Data check on METRO's developer portal | `data-feasibility.md` |
| Rider test script | `rider-test-plan.md` |

Note: the prototype uses sample places, times and routes. The screenshots and video were captured with a substitute font, so type looks slightly different from the real prototype.

## 4. Pain-point scorecard (honest version)

| Complaint | Addressed by | Status |
|---|---|---|
| Cluttered, confusing first screen | Where to? home, no circle | Addressed in design, untested with riders |
| Can't tell live from scheduled | Labels on every time | Addressed in design |
| Times are hard to read | Restyled stop schedule | Addressed in design |
| Tracking is inaccurate | Tracking lost state and Report | Partly: we can label it, not fix METRO's data |
| QR code won't scan | Enlarge code | Partly: helps display, not scanner reliability |
| Logouts, card migration, payment errors | none | Not addressed: backend and account problems |

## 5. Proposed success measures (goals, not results)

See `rider-test-plan.md`: at least 80% of tasks passed unaided, fastest route found in 30 seconds or less, four of five testers explain Live vs. Scheduled, ease score of 4 or higher.

## 6. Next steps

1. **Human step:** sign up on METRO's developer portal and get keys (`data-feasibility.md`).
2. **Human step:** run 5 to 8 rider tests with the prototype link.
3. Build a small demo of nearby stops with live countdowns on real data.
4. Add real stop numbers only once we have METRO's stop data.
5. Fill in "About the project" and "Built with" on the portal once there is something built.

## 7. Limits

- No rider validation yet.
- Sample data only; accuracy of real predictions is METRO's.
- Account, fare and payment problems need METRO's systems and are out of scope for a design pitch.
