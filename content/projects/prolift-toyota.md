# ProLift Toyota Material Handling

**Live:** https://www.prolifttoyota.com/
**Status:** intake in progress — screenshots captured by Claude from the live site, blurb
drafted from what's on the page, awaiting Jamie's corrections
**Assets:** `prolift-toyota/` — desktop 1440 + mobile 390, viewport and full-page each
(captured 2026-08-26)

## Blurb (draft — correct me)

A dealer site for a Toyota material-handling distributor: forklifts, aerial lifts, automated
guided vehicles, pallet racking, parts, and service across multiple locations. The problem is
catalog scale — a deep equipment taxonomy that has to stay walkable — solved with a
mega-nav, an accordion equipment index, and an Equipment Finder for people who don't know
the product names. Industrial subject matter treated with real photography and confident
type rather than stock-photo gloss.

## Design notes (Claude's read, for the eventual case study)

- **Type:** Bebas Neue Pro Expanded for display — condensed caps, set big and tight; Work Sans
  for body and UI. The headline lockup does a lot of the brand work.
- **Palette:** Toyota red / black / white with grey section fields. Red used as accent and
  as structure — the vertical hairline rule to the left of section headings is a recurring
  device, as are the rotated vertical section labels (CAREERS, MANUFACTURERS).
- **Cards:** photo + category eyebrow tag (EQUIPMENT / WAREHOUSE / PARTS) + short copy +
  a diagonal arrow as the affordance. Same card shape reused across products, careers, and
  insights — one system, several applications.
- **Structure:** full-bleed video/photo hero → featured products → brands carried →
  equipment accordion → careers → locations. Utility bar up top (location selector, phone,
  "How Can We Help?").
- Conversion paths are everywhere but not shouty: Request a Quote, Schedule Installation,
  Schedule Appointment inline per service.

## Open questions for Jamie

- [ ] Role on the project (design? art direction? whole site? redesign vs refresh?)
- [ ] Year / how long it's been live — and is the live site still your design, or has it
      drifted since?
- [ ] Confirmed cleared for public portfolio
- [ ] Story or shots? (the catalog-taxonomy problem is a real case-study spine if you want one)
- [ ] Anything on the site that *isn't* yours and should be cropped out

## Capture notes

- Playwright headless Chromium, 1440×900 @2x and 390×844 @3x (iPhone UA), lazy-loaded
  images triggered by a full scroll pass before shooting.
- Full-page JPEGs resampled to 1× width to keep the repo sane; viewport shots kept at retina.
- Third-party interruption layers (the LivePerson chat widget) suppressed before capture —
  not your design, and it sat on top of the hero. The site's own bars were left in.

**Note on imagery:** these are reference captures, not final presentation assets.
Format (device frames, flat screens, crops, scrolling stills) gets decided by the site
design in Phase 2 — asset prep happens after a direction is chosen, not before.
