# Portfolio Site — The Plan (v2)

**Owner:** Jamie (bmorejamie)
**Thesis:** A portfolio that proves you're current, wrapped around a lab that keeps it alive.
**Philosophy:** Ship the hireable core soon; grow the interesting parts forever. Boring technology where it counts, experiments where it's fun.

---

## What this site is (from discovery)

Three layers, stacked — not competing:

1. **The floor — career insurance.** A polished, professional portfolio: work, about, contact. Full-time, consulting, or freelance — the door is open and the site says so. Non-negotiable, ships first.
2. **The engine — the site as proof.** Jamie is a designer shipping real things with AI and agentic workflows. That profile is rare and in demand, and this site — built that way, in the open — is itself the case study. The making-of is portfolio material and gets documented as a project.
3. **The dream — the journal.** A long-shelved product idea, revived here at small scale: AI-assisted journaling, private by default, with a publish valve that pushes selected entries to a public part of the site. It starts as a feature of this site, not a startup.

**Vibe (working):** business up front, party in back. A confident, clean front door; a living lab behind it with personality and motion.

## The elegant trick that makes it all one system

The site is a static site in a git repo. **Publishing = committing a file.** A journal entry going public is an agent (or Jamie) committing markdown to this repo; the lab grows the same way. The set-and-forget core and the living-lab dream use the same pipeline — no CMS, no database, no server to babysit.

**Hard rule:** private journal entries never touch this public repo. The private side lives elsewhere (local, or a private repo); only explicitly published entries get committed here.

---

## Big decisions

| Decision | Choice | Why |
|---|---|---|
| Stack (v1 core) | Plain HTML + CSS (+ vanilla JS sprinkles) | No build step, nothing to rot. Pages serves it as-is. |
| Hosting | GitHub Pages, from this repo | Free, HTTPS, zero accounts. |
| Content updates | Drop files in a folder, edit a few lines, push | Also exactly what an agent can do — human and AI share one publishing path. |
| Front door design | Visual-first, gallery-led | The work is the hero; the bio supports it. |
| Journal (later) | Static published entries; private side external | Keeps the dream alive without a server or a privacy risk. |

## Open questions (discovery leftovers)

1. **Depth vs breadth:** a few deep case studies, or a broad wall of work? *Biggest remaining design driver — decide after digging through the archives.*
2. **URL:** `bmorejamie.github.io/jj26/` as-is; rename repo to `bmorejamie.github.io` for the clean root URL; custom domain layerable anytime.
3. **Identity:** real name vs. handle vs. studio-style name for the masthead.

---

## Site structure (target)

```
Home ──── hero intro + work gallery (the front door)
  ├── Work — projects / case studies
  │     └── includes the meta-project: "Building this site with AI"
  ├── About — bio, photo, what you're about, what you're open to
  ├── Contact — email, links; resume lives here
  └── Lab / Journal — published entries, experiments, works-in-progress
        (v1: hand-published markdown → later: fed by the journaling tool)
```

## Phases

### Phase 0 — Discovery ✅
Done (see "What this site is"). Revisit only if the thesis stops feeling true.

### Phase 1 — Content gathering *(Jamie, ~an evening)*
- [ ] 4–8 projects: each with 1–5 images, a title, 1–3 sentences (what it was, your role)
- [ ] While digging: notice whether the archive wants **case studies** or **a wall** (open question #1)
- [ ] Short bio (2–3 sentences) + long bio (a paragraph) — rough is fine
- [ ] Photo of you (optional, recommended)
- [ ] Links: public email, GitHub, socials
- [ ] Resume PDF (optional)

### Phase 2 — Design direction *(one short session)*
2–3 clickable HTML mockups with real or placeholder content — e.g. gallery-forward minimal, dark studio, editorial — Jamie picks or Frankensteins.

### Phase 3 — Build the front door *(one session)*
Full v1 in the chosen direction: responsive, fast, accessible, optimized images, update path documented in the README. Includes an empty-but-real Lab section so the party in back has a door.

### Phase 4 — Deploy *(minutes)*
Enable GitHub Pages, verify live URL. Career-insurance box: checked.

### Phase 5 — Light the lab *(ongoing, low ceremony)*
First hand-published entries: short notes, experiments, and the making-of-this-site writeup (which doubles as a Work case study). Establishes the entry format the journal tool will later target.

### Phase 6 — The journal experiment *(when it's fun, not before)*
Prototype the AI-assisted journaling flow: private capture + AI reflection, with a "publish" action that commits an entry here. Start embarrassingly small — even a chat-with-Claude ritual that ends in a commit counts as v0.

### Later / never
Analytics (GoatCounter), custom domain, dark-mode toggle, RSS for the lab (actually — RSS moves up if the journal takes off).

---

## Budget reality check

Phases 2–4 are one or two working sessions — the hireable site does not cost $100 of model time. The lab and journal are open-ended by design, but they're pay-as-you-play. The only unavoidable cost is Phase 1: digging through your own archives. No API for that.
