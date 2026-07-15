# Installer Feedback Session — Checklist

**Goal:** Validate the estimate wizard and record the expert decision tree for the bid calculator.

**Setup:** Have the app loaded on a phone/tablet. Let him drive. Record audio (voice memo app).

---

## Part 1: Unguided first impression (5 min)

Hand him the phone with https://tinsmith.fly.dev/ loaded. Say nothing except "tell me what you think this is and try it out."

- [ ] Does he understand what the page is without explanation?
- [ ] Does he get through the wizard without asking for help?
- [ ] Where does he hesitate or look confused?
- [ ] What does he say when the bid report loads?
- [ ] Does he click "Try Demo" on his own?

**Write down** any moment he says "that's not right" or "what does this mean" — those are bugs.

---

## Part 2: Wizard questions (10 min)

Go through each step together. For each question ask: "Is this right? What's missing?"

### Step 1 — Home Details
- [ ] Home types: single family / townhouse / condo / manufactured — missing any?
- [ ] Square footage: is this the right way to size? Or should it be tonnage?
- [ ] Stories: does this actually matter for pricing?
- [ ] Year built: does he care about this? Or is insulation quality sufficient?
- [ ] Insulation quality: poor/average/good — is 3 levels enough?

### Step 2 — Current System
- [ ] Project type: replacement / new install / add-on — covers the cases?
- [ ] Current system type: anything missing? (boiler? radiant? window units?)
- [ ] System age: does he use this for pricing or just for conversation?
- [ ] Fuel type: natural gas / electric / propane / oil — missing any?
- [ ] Ductwork condition: good / needs repair / needs replacement / no ducts — right?

### Step 3 — New System
- [ ] System types: central AC / heat pump / furnace / mini split / dual fuel — missing?
- [ ] Efficiency tiers: standard / mid / high — does he think in these terms?
- [ ] Should we ask about specific brands or SEER targets instead?
- [ ] Zones: 1/2/3+ — is this the right way to capture it?

### Step 4 — Additional Work
- [ ] Smart thermostat: does this belong here?
- [ ] Ductwork mods: right question?
- [ ] Electrical upgrade: when does this actually come up?
- [ ] Permits: does he always pull permits? Is this a real variable?
- [ ] **What's missing?** (refrigerant line set? concrete pad? crane for rooftop?)

---

## Part 3: Price validation (10 min)

Show him 3 specific bid reports and ask "is this in the ballpark?"

### Scenario A — bread and butter job
- 2000 sqft single family, replacement, central AC + furnace, standard efficiency
- **Expected range from the app:** ~$7,500–$16,000
- [ ] His actual range for this job: $_______ – $_______
- [ ] What's the biggest variable we're not capturing?

### Scenario B — heat pump conversion
- 1500 sqft townhouse, replacement (gas furnace → heat pump), high efficiency
- **Expected range:** ~$9,000–$22,000
- [ ] His range: $_______ – $_______
- [ ] Does gas→heat pump actually cost more? How much?

### Scenario C — new construction mini split
- 1200 sqft condo, new install, mini split, 2 zones, mid efficiency
- **Expected range:** ~$8,000–$18,000
- [ ] His range: $_______ – $_______
- [ ] Is mini split pricing per-head or per-system?

---

## Part 4: Decision tree recording (15+ min)

**Start recording audio here.** Say: "Walk me through how you price a job from start to finish."

Prompts if he stalls:
- [ ] "Customer calls and says they need a new AC. What do you ask first?"
- [ ] "What makes a $6K job vs a $15K job?"
- [ ] "What are the gotchas that double the price?"
- [ ] "How do you decide between recommending a 14 SEER vs a 20 SEER?"
- [ ] "When do you say 'you need ductwork' vs 'your ducts are fine'?"
- [ ] "What kills a deal? When does a customer say 'too expensive' and walk?"
- [ ] "If you could only ask a customer 5 questions before giving a number, what would they be?"

Things to capture:
- [ ] His mental model for sizing (rules of thumb? manual J? tons per sqft?)
- [ ] How he thinks about good/better/best tiers
- [ ] Regional price adjustments he makes
- [ ] Brand preferences and why
- [ ] What he'd want to show a customer on a tablet during a sales call

---

## Part 5: Would he use this? (5 min)

- [ ] "Would you send this link to a customer before a site visit?"
- [ ] "What would it need to be useful for YOUR workflow?"
- [ ] "What do you use now for estimates?" (pen/paper? spreadsheet? nothing? competitor tool?)
- [ ] "Would any of the guys you know use this?"
- [ ] "What would you pay for something like this?" (don't anchor — let him say a number)

---

## After the session

- [ ] Transcribe the decision tree recording (or feed audio to a transcription service)
- [ ] Update `domains/estimate/calculate-bid.ts` with his actual pricing logic
- [ ] Add/remove/modify wizard questions based on feedback
- [ ] File issues for any features he asked for
