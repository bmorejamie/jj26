# Portfolio Site — The Plan

**Owner:** Jamie (bmorejamie)
**Goal:** A personal home on the web, led by a visual showcase of design/creative work — with enough "about me" substance that it quietly works as a job-hunt or freelance asset too.
**Philosophy:** Set-and-forget. Boring technology on purpose. Updating the site should mean editing one file and pushing.

---

## The big decisions (made)

| Decision | Choice | Why |
|---|---|---|
| Stack | Plain HTML + CSS (+ a sprinkle of vanilla JS) | No build step, no dependencies, nothing to break in 5 years. GitHub Pages serves it as-is. |
| Content updates | One `projects` data block + a `projects/` image folder | Adding new work = drop in images, add a few lines, push. No code archaeology. |
| Hosting | GitHub Pages, deployed straight from this repo | Free, zero accounts, HTTPS included. |
| Design | Visual-first, gallery-led homepage | The work is the hero; the bio supports it. |

## Decisions still open (low stakes, decide anytime)

1. **URL.** As-is, the site lives at `bmorejamie.github.io/jj26/`. Renaming this repo to `bmorejamie.github.io` gets the cleaner `bmorejamie.github.io` root URL. A custom domain (~$10–15/yr) can be layered on later with no rework — just DNS.
2. **Site title / identity.** Real name, a handle, a studio-style name? Affects the header, the `<title>`, and not much else.
3. **Blog or no blog.** Skipping for v1. The structure will leave room to add a `/notes` section later without redesigning.

---

## Site structure (v1)

```
Home ─── hero intro (who you are, one sentence)
  │      └── work gallery (grid of projects, the main event)
  ├── Project pages (or lightbox) — images + short story per project
  ├── About — longer bio, photo, what you're about, what you're open to
  └── Contact — email + links (GitHub, socials); resume link lives here too
```

Small enough to hold in your head; roomy enough to grow.

## Design direction

To be locked in at the start of the build phase — I'll mock up **2–3 visual directions** as real HTML you can click through, e.g.:

- **Gallery-forward minimal** — near-white, generous whitespace, the work provides all the color
- **Dark studio** — charcoal ground, work glows, moodier
- **Editorial** — bigger type, more personality in the text, work interleaved with words

You pick one (or Frankenstein them), then that becomes the system for everything.

---

## Phases

### Phase 1 — Content gathering *(you, ~an evening)*
The real bottleneck of every portfolio ever. Needed:

- [ ] **4–8 projects**: for each — 1–5 images, a title, 1–3 sentences (what it was, your role)
- [ ] **Short bio** (2–3 sentences) + **long bio** (a paragraph) — rough is fine, I'll edit
- [ ] **A photo of you** (optional but recommended for the personal-presence goal)
- [ ] **Links**: email you want public, GitHub, any socials
- [ ] **Resume PDF** (optional, for the job-hunt angle)

Rough and unpolished is fine — placeholder-quality content is enough to start Phase 2.

### Phase 2 — Design direction *(one short session)*
I build the 2–3 direction mockups with your real (or placeholder) content, deploy them as previews, you pick.

### Phase 3 — Build *(one session)*
Full site in the chosen direction: responsive, fast, accessible, images optimized, easy-update content structure documented in the README.

### Phase 4 — Deploy *(minutes)*
Enable GitHub Pages on the repo, verify live URL, done. Optional: custom domain hookup.

### Phase 5 — Later / never *(the graveyard of good ideas, kept on purpose)*
Blog/notes section, analytics (a privacy-friendly one like GoatCounter, also free), custom domain, dark-mode toggle.

---

## Budget reality check

Phases 2–4 are comfortably one or two working sessions total — this does not need $100 of model time, and the expensive-model part (design taste, structure, writing) is exactly what's planned here. Your only real cost is Phase 1: gathering your own stuff. That part, unfortunately, has no API.
