# Portfolio site

Personal portfolio for Saira Qasim, Product Designer at Dubizzle.
Live at **https://sairaqasim.github.io** (GitHub Pages, `main` branch, root folder).

## What this is

Plain static HTML/CSS/JS. **No framework, no build step, no package.json.** Editing a
file and pushing is the whole deploy pipeline. Keep it that way — the simplicity is
deliberate, not an oversight.

```
index.html              home page (hero, bento grid, bio, footer)
projects/*.html         five case studies
styles.css              every style for every page
script.js               every behaviour for every page
assets/                 images and video, one subfolder per project
```

There is no CSS or JS bundling, so `styles.css` and `script.js` are shared by all six
pages. A change to either affects everything — check the other pages before assuming a
tweak is local.

## Running it

Never open the HTML with `file://` — the theme script and asset paths misbehave. Use the
dev server defined in `.claude/launch.json`:

```
npx http-server -p 8741 -c-1
```

(`python3 -m http.server` fails with a PermissionError on this machine.)

## Design system

Strict soft black-and-white. **No colour accents anywhere** in the chrome — the only
colour on the site comes from the project artwork itself.

Type is Lato throughout. Lato has no 500 weight, so emphasis steps 300 → 700; don't
write `font-weight: 500` and expect it to render.

All colours are CSS custom properties defined twice, on `:root` and on
`[data-theme="dark"]`. Never hardcode a hex outside that token block. The theme is set
by an inline pre-paint script in every page's `<head>` that reads `localStorage` before
first paint — it exists to prevent a flash of the wrong theme, so leave it inline and
leave it first.

## Case study pages

`.case` is the article wrapper, `max-width: 720px`, matching the Figma Article frame.
Everything belongs inside that 720 column.

Sections carry a `data-toc` attribute; `script.js` builds the labelled progress rail
from them at ≥1200px, with active-section highlighting. A section without `data-toc`
won't appear in the rail.

Light/dark artwork pairs use `.art-light` / `.art-dark` on two `<img>` tags; CSS shows
one and `display: none`s the other. Two consequences worth knowing: the hidden one is
never fetched (good, it halves image weight), and any script that counts "broken" images
by `naturalWidth === 0` will flag it as broken when it isn't.

## Gotchas that have already cost time

**Percentage padding resolves against the containing block's width, not the element's
own.** This is why `.device-phone` uses `padding: 1.25%` for what is a 9px bezel on a
270px phone — 9/720 of the *panel*, not 9/270 of the phone. Getting this wrong makes the
bezel look enormous. Same trap applies to any percentage padding inside `.device`.

**`scroll-behavior: smooth` and `behavior: 'smooth'` are no-ops in the preview browser.**
Verified directly: `auto` scrolled 100px, `smooth` scrolled 0. Every smooth scroll on
this site (back-to-top, TOC jump links, the flow-strip nudge button) is therefore
hand-rolled rAF easing calling `scrollTo` with `behavior: "instant"` per frame. Don't
"simplify" these back to `behavior: 'smooth'` — they will silently stop working.

**Specificity conflicts between base and modifier rules keep recurring.** Three separate
bugs, same root cause: shorthand `margin` beat longhand `margin-left`; `.case figure
video` beat `.device-shot > video`; and `.chip-flow span` beat `.icon-tile`'s own
`display: inline-flex`, which silently killed its flex centring. When a rule "isn't
applying", check specificity before rewriting the rule.

**The preview pane lies in two specific ways.** Screenshots of scrolled content render
blank — build an isolated scratch page that shows the component at scroll 0 instead. And
`getComputedStyle` returns values one frame stale — measure the DOM with
`getBoundingClientRect` rather than trusting computed styles right after a change.

## Copy conventions

**No em dashes.** They read as AI-generated. Use a comma. En dashes (`–`) are fine for
ranges like "Q1–Q2 2026", and middots (`·`) are the separator in tags and section
numbers — both stay.

Case studies are written as "we", not "I" — the work was done by teams.

## Assets

`assets/Zaam case study/` is gitignored: 95MB of original Figma exports kept locally as
source. Nothing on the site references it. Before adding a large asset, check whether
anything actually points at it.

Video is H.264 in MP4. Anything exported from Figma or QuickTime as HEVC needs
transcoding first (`avconvert`, or ffmpeg) — Safari will play HEVC but Chrome won't.

Videos inside device mockups carry `class="is-screen"` and are lazily played by an
IntersectionObserver in `script.js`. Videos outside mockups get a sound-toggle button
injected, with mutual exclusion so only one soundtrack plays at a time.

GitHub Pages has a slow cold cache — a file nobody has requested can take ~30s on first
hit before the CDN warms up. Keep media small; it is the difference between a page that
loads and one that appears broken to a first visitor.

## Unfinished

`hatla2ee.html`, `agent-performance.html` and `home-screen-widgets.html` are still
template stubs. They contain bracketed `[Placeholder, ...]` prose and `[Year]` / `[Tools]`
meta fields awaiting real content. `proconnect.html` and `zaam.html` are complete and are
the reference for what a finished case study looks like.
