# Rider Test Plan: Testing the RideMETRO Prototype

**Goal:** Find out whether real riders can use the redesign, and where they get confused. About 30 minutes per person, five to eight people is plenty.

**Who to ask:** People who ride or have ridden Houston METRO buses, plus one or two who never have (they show where a first-timer gets lost). Friends, classmates and family are fine for a first round.

**What you need:** A phone with the prototype open (use the Share menu on the Claude Design page to send a link, since it's private by default), this sheet, and a timer. Optionally, the current RideMETRO app installed on the same phone for comparison.

## 1. Before you start (say this out loud)

"We're testing the design, not you. If something is confusing, that's our mistake. The places, times and routes are made up. Please think out loud while you use it."

## 2. Tasks

Give each task one at a time. Don't help. Start the timer when they start and stop it when they say they're done. If they're stuck for 60 seconds, note it and move on.

| # | Task | What we're checking | Success looks like |
|---|---|---|---|
| 1 | "You just opened the app. What do you think you can do here?" (30 seconds, no tapping) | First impression, clutter | They mention finding a route or seeing buses without prompting |
| 2 | "You want to get to the Houston Zoo. Find the fastest way." | Where to? search, route options | They find the fastest route in under 30 seconds |
| 3 | "Now find the option with the least walking." | Sorting | They tap Least walking, or find it, without help |
| 4 | "Start the trip. Where do you get on and where do you get off?" | Trip steps | They name the boarding stop and exit stop correctly |
| 5 | "Save this trip so you can find it later." | Save trips | They save it and can find it again |
| 6 | "Find out when the next bus comes at the stop closest to you." | Nearby stops, stop screen | They open the closest stop and read the next time |
| 7 | "Is the 65 bus at Fannin St tracked live? How can you tell?" | Live vs. scheduled, tracking lost | They say it isn't tracked and can point to the warning |
| 8 | "Show me how you'd pay when boarding." | Fares tab, boarding pass | They open Fares and find the code |

## 3. Questions to ask afterward

1. In your own words, what does "Live" mean? What does "Scheduled" mean?
2. What was the most confusing screen?
3. Was anything missing that you'd expect from a bus app?
4. On a scale of 1 to 5, how easy was it to plan a trip? (1 = very hard)
5. If you use the current RideMETRO app: which would you rather use for planning a trip, and why?

## 4. Score sheet (copy one row per tester)

| Tester | Rides METRO? | T1 first impression | T2 time (sec) | T3 | T4 | T5 | T6 | T7 | T8 | Ease (1-5) | Notes / quotes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | | | |
| 2 | | | | | | | | | | | |
| 3 | | | | | | | | | | | |

Mark each task **P** (passed alone), **H** (passed with a hint) or **F** (failed).

## 5. How to read the results

Proposed targets for a first round. These are goals we set, not measurements:

- At least 80% of tasks passed without a hint.
- Task 2 (fastest route to the zoo) done in 30 seconds or less by most testers.
- At least four out of five testers explain Live vs. Scheduled correctly.
- Average ease score of 4 or higher.

Anything that fails for two or more testers goes on the fix list. Copy strong quotes into `improvements.md` as evidence.

## 6. Limits to keep in mind

- Five to eight friendly testers can show us confusing screens. They can't show that riders will prefer this in the real world.
- The prototype uses sample data, so testers can't judge whether times are accurate.
- If you compare with the current app, alternate which one people see first, so the order doesn't bias the result.
