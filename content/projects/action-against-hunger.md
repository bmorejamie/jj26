# Action Against Hunger

**Live:** https://www.actionagainsthunger.org/
**Status:** intake in progress — screenshots captured by Claude from the live site, blurb
drafted from what's on the page, awaiting Jamie's corrections
**Assets:** `action-against-hunger/` — homepage, desktop 1440 + mobile 390, viewport and
full-page each. Plus `action-against-hunger/interiors/` — three interior templates, same
four captures each (captured 2026-08-26)

## Blurb (draft — correct me)

The US site for an international humanitarian NGO working on hunger and malnutrition across
50+ countries. Two jobs at once, in tension: explain a complex, grim problem with authority,
and convert a visitor into a donor without cheapening the subject. The answer here is
editorial rather than pleading — huge Futura caps, documentary photography given room,
statistics set as display type, and a donation module sitting right in the hero as a peer to
the headline instead of a nag layered over it.

## Design notes (Claude's read, for the eventual case study)

- **Type:** Futura Pro for display, set enormous and all-caps, ragged over multiple lines;
  Lato for body; Montserrat in UI. Animated hero headline swaps Fight/Prevent and
  Today/Tomorrow — the captures caught "PREVENT HUNGER TOMORROW."
- **Palette:** black and white ground with the brand green, orange, and blue as accents.
  Orange is reserved almost entirely for the donate action, which is why it works.
- **The bracket motif:** open corner brackets in green and blue framing sections — the
  identity's connective tissue, used at multiple scales.
- **Stat treatment:** white card overlapping a photo, number set huge (673M, 30%), label
  beneath. Repeats down the page as a rhythm and does the persuading that copy would
  otherwise have to.
- **Structure:** promo bar → crisis alert bar → utility nav → main nav → hero + donation
  module → trending stories → "How serious is global hunger?" stats → how we fight hunger →
  take action. Long page (~11.7k px desktop), but sectioned hard enough to stay navigable.
- Crisis-response infrastructure is baked into the design — a live alert bar and swappable
  emergency stories, which is a real editorial-systems problem worth talking about.

## Open questions for Jamie

- [ ] Role (design? art direction? design system? which parts are yours?)
- [ ] Year, and full site vs homepage/templates vs redesign of an existing thing
- [ ] Confirmed cleared for public portfolio
- [ ] Story or shots? (the donate-vs-dignity tension is the case study here if you want one)
- [ ] Which of the interior templates are yours? (captured three — see below)
- [ ] Want the donation flow captured too? It's the most interesting conversion problem on
      the site and I skipped it this pass.

## Interior templates captured (`interiors/`)

Three distinct page types, to show the system holds up past the homepage:

1. **`country-sudan-*`** — location/crisis template (`/location/africa/sudan/`). Country name
   set enormous in Futura, centered, alone on white, then a full-bleed photo beneath it. The
   restraint is the whole move — no hero copy competing, just the name and the place.
2. **`story-haiti-*`** — editorial/article template (`/story/supporting-survivors-of-gender-
   based-violence-in-haiti/`). Full-bleed documentary lead image, floating share affordance.
3. **`solutions-nutrition-*`** — programme/service template (`/our-solutions/nutrition-health/`).
   The longest of the three; explanatory content with the stat and bracket devices reused.

Worth noting for the case study: the homepage is loud (two bars, big type, donation module)
and the interiors are quiet. That's a deliberate gradient, and it's the kind of thing a
portfolio piece should point at.

## Capture notes

- Playwright headless Chromium, 1440×900 @2x and 390×844 @3x (iPhone UA), lazy-loaded
  images triggered by a full scroll pass before shooting.
- Full-page JPEGs resampled to 1× width to keep the repo sane; viewport shots kept at retina.
- The "Can children count on you?" donation pop-up was dismissed before capture so it
  wouldn't cover the hero. The site's own promo and crisis-alert bars were left in — those
  read as design, not interruption. Both bars are date-driven (the capture shows an August
  make-a-will promo and a Colombia earthquake alert), so they'll differ from what you see today.

**Note on imagery:** these are reference captures, not final presentation assets.
Format (device frames, flat screens, crops, scrolling stills) gets decided by the site
design in Phase 2 — asset prep happens after a direction is chosen, not before.
