# jj26 — Jamie Jones, portfolio

Plain HTML and CSS. No build step, no dependencies, no server. GitHub Pages serves
the files exactly as they sit in this repo, which means **publishing is committing a
file** — the same action whether a human or an agent does it.

See `PLAN.md` for the thesis and the phase plan.

---

## Layout

```
index.html                  the front door — hero, work gallery, lab, about, contact
work/<slug>.html            one page per project
assets/css/site.css         the entire visual system (all tokens live in :root)
assets/js/site.js           ~50 lines: scroll reveals + masthead hairline. That's all.
assets/img/work/            gallery card images (1600px wide, ~200KB each)
content/projects/           source material — intake notes, screenshots, video
```

Case pages reference images straight out of `content/projects/` rather than keeping a
second copy. One file per asset, no sync problem.

## Adding a project

1. Drop assets in `content/projects/<slug>/`.
2. Write `content/projects/<slug>.md` — the intake note: blurb, notes, open questions.
3. Make a card image: `sips --resampleWidth 1600 -s formatOptions 78 shot.jpg`, save it
   to `assets/img/work/<slug>-card.jpg`.
4. Copy the closest `work/<slug>.html` and edit it.
5. Add an `<article class="piece …">` to the gallery in `index.html`.
6. Commit and push. It's live in about a minute.

## Changing the look

Every colour, typeface, size, and easing curve is a custom property in the `:root`
block at the top of `assets/css/site.css`. A different direction — dark ground,
heavier editorial, a different type pairing — is a change to that block, not to any
markup.

Motion is deliberately one gesture: a 14px rise and fade on an expo-out curve
(`cubic-bezier(0.22, 1, 0.36, 1)`), staggered by 70ms via `--i`. Hovers use a slower
sibling of the same curve. Nothing uses a browser default ease. All of it is disabled
under `prefers-reduced-motion`.

## Still placeholder

- Hero and About copy — written as slots, needs Jamie's words.
- Contact: email, LinkedIn, and résumé are unfilled by design; no address is published
  until Jamie picks the public one.
- ALPA screens not yet uploaded — the gallery tile is an honest empty state, not a
  stand-in image.
- Role and year read `—` on every project until confirmed.

## Local preview

```sh
python3 -m http.server 8000
# → http://localhost:8000
```
