# Krillion Style Guide

A reference teardown of the visual, motion and sound language of **krillion.io** ("Krillion · the daily dive"), taken from the live site's stylesheets, its game engine bundle and a played-through practice dive on 2026-11-05.

> **Scope and ownership.** This documents how Krillion looks, moves and sounds so we can learn from it. The name, wordmark, mascots, tier sprites, painted backgrounds and copy belong to Krillion. Use the *techniques and token structure* here as inspiration for Million Fathoms; don't lift its sprites, art, logo or text.

---

## Contents

1. [Design pillars](#1-design-pillars)
2. [Brand and voice](#2-brand-and-voice)
3. [Color](#3-color)
4. [Typography](#4-typography)
5. [Layout, spacing and layering](#5-layout-spacing-and-layering)
6. [Surfaces: the pixel-bevel system](#6-surfaces-the-pixel-bevel-system)
7. [Components](#7-components)
8. [Sprites and iconography](#8-sprites-and-iconography)
9. [The scene: the ocean world](#9-the-scene-the-ocean-world)
10. [Motion](#10-motion)
11. [Sound](#11-sound)
12. [Game choreography, beat by beat](#12-game-choreography-beat-by-beat)
13. [Accessibility and performance modes](#13-accessibility-and-performance-modes)
14. [Theming: alternate worlds](#14-theming-alternate-worlds)
15. [Sharing format](#15-sharing-format)
16. [Starter token sheet](#16-starter-token-sheet)

---

## 1. Design pillars

| Pillar | What it means in practice |
|---|---|
| **CRT pixel arcade** | One bitmap font (VT323), `image-rendering: pixelated` everywhere, scanline overlays, stepped `steps()` transitions on buttons, hard-edged "ring" shadows instead of borders or radii. **Border-radius is 0 everywhere** except the sonar timer. |
| **Depth is the score** | Points are literally meters: 1 point = 10 m of sinking. The whole game is a 7,000 m vertical world, and the camera follows your answer down it. |
| **Neon on abyss** | Near-black navy base (`#050a14`) lit by two neon accents: **lumen pink** `#ff5d8f` and **lumen cyan** `#4de3ff`. Gold `#ffd166` is reserved for the top tier and success. |
| **Chromatic aberration** | Headlines carry a pink offset shadow on one side and a cyan one on the other, like a misaligned CRT. |
| **Every answer is an event** | Each rarity tier has its own sink speed, wobble, particle trail, screen effect, landing sound and mascot reaction. |
| **Juicy but courteous** | Rich effects, with a full reduced-motion path, a low-power mode, a colorblind mode, a mute toggle that persists, and audio that only starts after a user gesture. |
| **Dry, nerdy ocean wit** | Lowercase deadpan microcopy ("no echo. try again", "the clock beat you to it.") and real oceanography facts pinned to the depths. |

---

## 2. Brand and voice

### Wordmark

- **Text:** `KRILLION`, all caps, VT323.
- **Treatment:** foam-white `#e8f1ff` text with three shadows: pink offset down-left, cyan offset up-right, soft cyan glow.

| Size context | Font size | Letter-spacing | text-shadow |
|---|---|---|---|
| Title screen (`.ds-title`) | `clamp(58px, 17vw, 124px)`, line-height .9 | .04em | `-4px 3px #ff5d8f, 4px -3px #4de3ffd9, 0 0 30px #4de3ff59` |
| Hub / page header | 34px, line-height 1 | .06em | `-3px 2px #ff5d8f, 3px -2px #4de3ffd9, 0 0 16px #4de3ff4d` |
| Results header | 27px | .06em | `-2px 2px #ff5d8f, 2px -2px #4de3ffd9, 0 0 14px #4de3ff4d` |
| Modal titles (h2) | 34px / `clamp(27px,7vw,38px)` | .06em | `-2px 1px #ff5d8fcc, 2px -1px #4de3ffb3, 0 0 14px #4de3ff40` |

The offset scales with the type: about 3–4 px at hero size, 2 px at UI size.

- **Animated title:** each letter is its own `<span>` bobbing up and down (`ds-bob-l`, 3.2 s, ease-in-out, each letter delayed **0.18 s** more than the last), and the whole word gets a CRT flicker (`ds-title-flicker`, 5 s, `step-end`).

### Lockup

```
KRILLION                      ← wordmark
THE DAILY DIVE                ← tagline: cyan #4de3ff, letter-spacing .3em, clamp(18px,5.4vw,28px), glow 0 0 12px #4de3ff80
7 prompts · 25 seconds each · rarer answers sink deeper   ← subline: drift #7d93b8, .08em, clamp(14px,4vw,20px)
```

### Voice and microcopy

The voice is **lowercase, dry, nautical, a little smug about rare knowledge**. Labels and buttons are UPPERCASE and widely tracked. Sentences are lowercase and terse.

| Moment | Copy |
|---|---|
| Start button | `▼ BEGIN DESCENT ▼` |
| Submit button | `DIVE` |
| Input placeholder | `type one answer…` |
| Card hint | `▼ rarer answers sink deeper ▼` |
| Pre-round countdown pill | `descending · the clock starts in 34` |
| Rejected answer | `"xqzv": no echo. try again` |
| Network failure | `signal lost. resend` |
| Between rounds | `DESCEND ▼` |
| After the last round | `SURFACE ▲` |
| No answer typed in time | `NOTHING LANDED`, then `the clock beat you to it.` |
| Unrecognized answer | `never made it onto the reef.` |
| HUD center | `SURFACE` → `PROMPT 3 OF 7` → `DIVE COMPLETE` |
| Loading the result | `sounding the depths…` |
| Boot screen | `descending…` |
| Mascot tooltip | `a friend` |
| Mascot tap | `blub!` (each character has its own: `glub!`, `blorp!`, `chomp!`, `mwahaha!`) |
| Results sections | `THE CATCH`, `THE BEARING`, `DIVE LOG · DEEPER = RARER` |

**Tier blurbs** (shown under the landed banner):

| Tier | Blurb |
|---|---|
| Plankton | The answer everyone blurts out. |
| Too Clever | A famously "obscure" pick. Everyone reaches for it. |
| Schooler | Solid — swims with the school. |
| Rare | Genuinely uncommon. Nice pull. |
| Deep Cut | True obscurity. Few go this deep. |
| One in a Krillion | The designated gem. Trench floor. |

**Score bands ("the bearing"):**

| Range | Verdict |
|---|---|
| 0–150 | Plankton. Plenty of ocean left down there. |
| 151–250 | Schooler. Swimming with the school. |
| 251–350 | Rare. Below the thermocline. Nice. |
| 351–449 | Deep cut. Seriously deep dive. |
| 450+ | One in a krillion. Trench dweller. Absurd. |

**Glyph vocabulary:** `▼ ▲ ▸ ▾ ► ↓ → ↗ ⟲ ∞ · ── ×`. The middle dot `·` separates metadata, and `──` box-drawing dashes frame the depth labels.

---

## 3. Color

### 3.1 Core palette

| Token | Hex | Role |
|---|---|---|
| `--color-abyss` | `#050a14` | Page base, outer ring of every bevel, text on bright buttons |
| `--color-shallow` | `#101d33` | Panels, cards, secondary buttons |
| `--color-line` | `#1b2c47` | Lines (in practice `#1b3050` is the ring color used most) |
| — ring | `#1b3050` | The standard 2nd ring of the bevel shadow, input borders |
| — deep panel | `#0b1526` | HUD pod gradient bottom, overlays, pills |
| — inset | `#0d1830` | Menu tiles, history tiles |
| — darkest | `#060d1a` / `#03070f` / `#02050b` | Inner ring on HUD pieces, gradient ends, backdrops |
| `--color-foam` | `#e8f1ff` | Primary text |
| `--color-drift` | `#7d93b8` | Secondary text, labels, depth ruler |
| `--hairline` | `#7d93b838` | Dashed dividers, link borders |
| `--color-lumen-pink` | `#ff5d8f` | Primary action, score, "current", danger, caret, mascot |
| `--color-lumen-cyan` | `#4de3ff` | Depth, timer, focus rings, hover states, info |
| gold | `#ffd166` | Krillion tier, completed-progress dots, celebration |
| gold light | `#ffe9a8` | Gold highlights and pulse peaks |
| orange | `#ff9f43` | Too Clever tier, warnings (reject message) |

**Shadow / "pressed" partners for bright buttons:**

| Face | Bottom lip |
|---|---|
| Pink `#ff5d8f` | `#7d1d3c` |
| Cyan `#4de3ff` | `#16758a` |
| Shallow `#101d33` | `#123048` (outlined buttons) / `#0d1a2e` (close buttons) / `#0b1424` (tiles) |
| Pink-ringed tile | `#2a1024` |

### 3.2 Tier palette

Each tier has one color (`--tier-*`). It drives the sprite glow, the landed title, the tier line once passed, and the answer chip ring.

| Tier | Points | Token | Default | Colorblind mode | Emoji |
|---|---|---|---|---|---|
| Plankton | 10 | `--tier-plankton` | `#8fa3c4` | `#d7e1f2` | 🫧 |
| Too Clever | 15 | `--tier-tooclever` | `#ff9f43` | `#ffb35c` | 🤡 |
| Schooler | 30 | `--tier-schooler` | `#4de3ff` | `#7deaff` | 🐟 |
| Rare | 60 | `--tier-rare` | `#ff5252` | `#ff7bac` | 🦑 |
| Deep Cut | 85 | `--tier-deepcut` | `#9d7bff` | `#bfa7ff` | 🏮 |
| One in a Krillion | 100 | `--tier-krillion` | `#ffd166` | `#ffe08a` | 🌟 |
| Miss | 0 | `--tier-miss` | `#3d4f6e` (lit: `#5d739c`) | `#a3b6d6` (lit: `#b6c8e4`) | ⬛ |

Components read tier color through a local custom property (`--tc` for tier lines and banners, `--cc` for the answer chip, `--pc` for pack cards), so one component handles all tiers.

### 3.3 Alpha conventions

Colors are reused at a small set of 8-digit-hex alphas instead of new hues:

| Suffix | ≈ opacity | Typical use |
|---|---|---|
| `0f` | 6% | Inner top highlight on pods (`inset 0 2px #e8f1ff0f`) |
| `24`–`2e` | 14–18% | Faint panel glows |
| `40`–`4d` | 25–30% | Resting outer glow on CTAs, card ring |
| `59`–`73` | 35–45% | Text glows, button glows, mascot drop-shadow |
| `80`–`8c` | 50–55% | Hover glows, number glows |
| `a6`–`b3` | 65–70% | Focus border, hot text glows |
| `cc`–`e6` | 80–90% | Panel backgrounds over the scene |
| `eb`–`f2` | 92–95% | Near-opaque cards, pills, HUD pods |

### 3.4 Ocean depth gradient

The sea is a canvas gradient sampled by depth (meters). Between stops the color is linearly interpolated in RGB:

| Depth | Color |
|---|---|
| 0 m | `#1d5580` |
| 150 m | `#123a5e` |
| 350 m | `#0b1526` |
| 800 m | `#081020` |
| 1,400 m | `#050a14` |
| 2,600 m | `#03070f` |
| 5,200 m+ | `#02050b` |

Sky: top `#81cbe8`, CSS fallback gradient `#8fd0f0 → #d8f0ff`.

The page background behind everything (`html`) is a fixed gradient `#0d1e38 → #0a1729 21% → #0c1a2f 25% → #071223 33% → #050c18 55% → #030710 78% → #020409`, plus an SVG `feTurbulence` noise tile (140 px, about 2.5% opacity, blue-tinted) for grain.

### 3.5 Signature gradients

| Name | Value | Used on |
|---|---|---|
| Bottom wash | `linear-gradient(180deg, #0b152600, #050a14eb 26%)` | Answer dock, next-button bar, intro panel (24–30% variants) |
| Boot / hub | `linear-gradient(#0b1526, #050a14 45–55%, #03070f)` | Loading screen, hub pages |
| Results overlay | `linear-gradient(#050a14db, #050a14b8 30%, #050a14c7)` | Done screen over the scene |
| HUD pod | `linear-gradient(#101d33eb, #0b1526eb)` | Depth / score pods |
| Vignette | `radial-gradient(at 50% 45%, #0000 55%, #02040ad9 100%)` | Stage vignette |
| Danger edge | `box-shadow: inset 0 0 90px 18px #ff5d8f99` | Last seconds of the timer |
| Scanlines | `repeating-linear-gradient(0deg, #0000002e 0 1px, #0000 1px 3px)` | CRT overlay (45% opacity) |
| Panel scanlines | `repeating-linear-gradient(0deg, #00000029 0 1px, transparent 1px 3px), #101d33` | Every modal panel |

---

## 4. Typography

### 4.1 Typeface

**VT323** (Google Fonts, 400 only) is the only typeface, for both `--font-display` and `--font-mono-ui`. It loads through `next/font` with `font-display: swap`, plus a size-adjusted Arial fallback (`size-adjust: 89.73%`, `ascent-override: 89.16%`, `descent-override: 22.29%`) so the layout doesn't jump when the font arrives.

- **No bold.** Emphasis comes from color, glow and size. `<b>` is restyled to `font-weight: 400` plus an accent color.
- **Numbers** use `font-variant-numeric: tabular-nums` so counters don't jitter while counting.
- **Optical padding:** VT323 sits high, so text controls use asymmetric vertical padding: about 2 px more on top than bottom (`padding: 12px 18px 10px`, `9px 18px 7px`, `5px 12px 3px`).

### 4.2 Type scale

| Role | Size (mobile → ≥700px) | Tracking | Case | Color |
|---|---|---|---|---|
| Hero wordmark | clamp(58px, 17vw, 124px) | .04em | UPPER | foam + aberration |
| Prompt text | clamp(28px, 8vw, 40px), lh 1.02 | normal | Sentence | foam, glow `0 0 16px #e8f1ff40` plus a faint 2 px pink/cyan split |
| Landed tier name | clamp(28px, 8.5vw, 44px) | .12em | UPPER | tier color + `0 0 22px` glow |
| Begin button | clamp(22px, 6vw, 28px) | .14em | UPPER | foam |
| HUD numbers | 25px → 32px, lh 1 | — | — | cyan (depth) / pink (score) |
| Timer digits | 26px | — | — | cyan, then pink when hot |
| Answer chip | 24px → 28px | .06em | UPPER, in quotes | tier color |
| Input | 22px → 26px | .04em | as typed | foam, pink caret |
| Primary buttons | 19–22px | .12–.14em | UPPER | — |
| Landed points | 22px → 28px | — | — | foam, points in tier color |
| Landed answer | 19px → 24px | .08em | "Quoted" | foam |
| Body / modal copy | 15–17px, lh 1.35–1.45 | .04em | Sentence | drift |
| Ambient depth labels | 14px → 17px | .06em | lowercase | drift |
| Major zone labels | 15px → 19px | .2em | UPPER | cyan + glow |
| Card round label | 14px → 16px | .32em | UPPER | pink |
| Hints / sub-labels | 13–15px | .14em | lowercase | drift |
| Meta links / eyebrows | 11–14px | .14–.24em | UPPER | drift / cyan |
| HUD pod label | 10px → 12px | .3em | UPPER | drift |
| Micro chips | 9–10px | .1–.16em | UPPER | accent |

**Tracking rule of thumb:** the smaller and more "label-like" the text, the wider the tracking (.2–.32em). Large display text stays tight (.04–.12em).

### 4.3 Text-shadow recipes

| Name | Recipe |
|---|---|
| Neon glow (number) | `0 0 12px <color>8c` |
| Neon glow (hot) | `0 0 16px <color>e6` |
| Tier title | `0 0 22px var(--tc), 0 3px 0 #0009` |
| Legibility drop | `0 1px #050a1459` or `0 2px #00000080` |
| Aberration (UI) | `-2px 1px #ff5d8fcc, 2px -1px #4de3ffb3, 0 0 14px #4de3ff40` |
| Colorblind outline | `1px 0 #050a14, -1px 0 #050a14, 0 1px #050a14, 0 -1px #050a14, 0 0 6px #050a14cc` |

---

## 5. Layout, spacing and layering

### 5.1 Grid and widths

- Built on Tailwind v4 (`--spacing: .25rem`), but most game UI uses hand-tuned px values.
- **Content columns:** dock and intro max **600px**, HUD max **720px**, results **28rem (448px)**, hub **430px**, modals **430–560px** (`min(92vw, 560px)`).
- **Prompt card:** full width minus a 12px left and 62px right gutter on mobile (leaving room for the depth ruler); on ≥700px it's a fixed **480px** card at `left: calc(50% - 264px)`.
- **Right-edge rail:** about 54–62px on the right is kept clear for the depth ruler and the stacked icon buttons (mute, settings, character), which sit at `right: 10px; top: 70 / 102 / 134px` (84px+ on desktop).

### 5.2 Breakpoints

| Query | Effect |
|---|---|
| `min-width: 700px` | The main desktop switch: bigger HUD, fixed-width card/banner, centered tier lines (820px), larger mascot (88px perched) |
| `max-width: 340–540px` | Fine-grained tweaks for small phones and ad-slot collisions |
| `hover: hover` | Hover-only effects |
| `prefers-reduced-motion: reduce` | See §13 |

### 5.3 Spacing patterns

- Dock: `padding: 10px 12px calc(12px + env(safe-area-inset-bottom))`, gap 10px.
- Cards: `16px 18px 14px` (mobile) → `22px 26px 20px` (desktop).
- Modal panels: 18–22px padding; menu grid gap 16px; settings rows min-height 74px.
- Every bottom-anchored element adds `env(safe-area-inset-bottom)`.
- **Tap targets:** at least 44px for menu triggers, launchers and links; 56px for link rows.

### 5.4 Z-index stack (inside `.ds-root`, which is `position: fixed; inset: 0; z-index: 40`)

| z | Layer |
|---|---|
| 0 | `.ds-sea` canvas (sky, water, art, silhouettes) |
| 1 | `.ds-world` (14,800px-tall DOM layer: title, labels, cards, tier lines, banners) |
| 2 | `.ds-fore` canvas (foreground particles, depth ruler, swarms) |
| 5 | Vignette; landed banner |
| 6 | Spotlight dim; answer chip |
| 7 | Swarm fish |
| 8 | Danger edge glow |
| 9 | Full-screen color flash |
| 10 | HUD, dock, next button, pills, done screen |
| 11 | Mascot |
| 12 | CRT scanlines, mute button, intro panel |
| 30 / 65 / 80 | Icon triggers / site menu trigger / modal backdrops |

### 5.5 World coordinates

- **2 CSS px = 1 meter.** An element at depth *d* sits at `top: 2*d px` inside `.ds-world`.
- The world is 14,800px tall (7,400 m). The seafloor image sits at 14,020px (≈7,010 m). The surface/title block starts at −336px.
- **Score → depth:** each point sinks the diver 10 m. A perfect 7 × 100 = 700 points = **7,000 m = "the trench floor — a perfect dive ends here."**
- The camera moves the world with `translate3d(0, viewportH/2 − 2*cameraDepth, 0)`.

---

## 6. Surfaces: the pixel-bevel system

Krillion never uses `border-radius` or ordinary borders on its chunky elements. **Every raised surface is built from stacked, zero-blur `box-shadow` rings:**

```
box-shadow:
  0 0 0 2px  #050a14,      /* 1. dark "gap" ring (abyss) */
  0 0 0 4px  #1b3050,      /* 2. colored outline ring */
  0 3px 0 4px #0d1a2e,     /* 3. bottom lip: same spread, pushed down = 3D depth */
  0 0 16px   <accent>59;   /* 4. optional neon glow */
```

| Variant | Ring 1 | Ring 2 | Lip | Glow |
|---|---|---|---|---|
| Resting tile / close button | 2px abyss | 4px `#1b3050` | `0 3px 0 4px #0d1a2e` | — |
| Hover / focus | 2px abyss | 4px **cyan** | `0 3px 0 4px #123048` | `0 0 18px #4de3ff40` |
| Selected / current | 2px abyss | 4px **pink** | `0 4px 0 4px #2a1024` | `0 0 14–18px #ff5d8f2e–59` |
| Big CTA (Begin / Next) | 3px abyss | 6px cyan | `0 6px 0 6px #123048` | `0 0 26px #4de3ff4d` |
| Big CTA hover | 3px abyss | 6px **pink** | same | `0 0 34px #ff5d8f8c` |
| Solid pink button | 2px abyss | — | `0 3px 0 2px #7d1d3c` | `0 0 16px #ff5d8f73` |
| HUD pod | 2px `#060d1a` | 4px `#1b3050` | `inset 0 2px #e8f1ff0f` (top highlight) | — |
| Dialog | 3px abyss | 5px `#1b3050` | **`10px 10px 0 #02050bd9`** (hard offset drop) | `0 0 38px #4de3ff24` |

**Press feedback:** on `:active` the element moves down by the lip height (`translateY(2–3px)`) and the lip shrinks (`0 3px` → `0 1px`), so it reads as a physical key going down. Transitions use `transform 60–100ms steps(2, end)`: two frames, deliberately choppy, like a sprite.

### Pixel-cut corners (`.ds-px`)

HUD pods and the prompt card use a `clip-path` polygon that removes a stepped 2-step staircase (5px + 5px) from each corner, for a pixel-art rounded rectangle:

```css
.px-corners {
  clip-path: polygon(
    0 10px, 5px 10px, 5px 5px, 10px 5px, 10px 0,
    calc(100% - 10px) 0, calc(100% - 10px) 5px, calc(100% - 5px) 5px, calc(100% - 5px) 10px, 100% 10px,
    100% calc(100% - 10px), calc(100% - 5px) calc(100% - 10px), calc(100% - 5px) calc(100% - 5px),
    calc(100% - 10px) calc(100% - 5px), calc(100% - 10px) 100%,
    10px 100%, 10px calc(100% - 5px), 5px calc(100% - 5px), 5px calc(100% - 10px), 0 calc(100% - 10px)
  );
}
```

A smaller 2px/4px version is used on "NEW" badges.

### Texture overlays

- **Stage CRT:** 1px dark line every 3px, at 45% opacity, over everything. It "zaps" (`ds-crt-zap`, 0.28s `steps(3)`) on every round transition and on rejects.
- **Card scanlines:** `.ds-card::after` has a light 1px line every 3px at **6%** opacity, so panels look like lit glass.
- **Panel scanlines:** every modal panel background stacks a dark scanline gradient on `#101d33`.
- **Pack art:** 50%-opacity scanlines plus an inset bottom shadow that fades the image into the panel color.

---

## 7. Components

### 7.1 Buttons

| Button | Face | Text | Padding | Font | Shadow | States |
|---|---|---|---|---|---|---|
| **Begin descent** (`.ds-begin-btn`) | `#101d33` | foam | 13px 34px 11px | clamp(22,6vw,28)px, .14em | big CTA rings (cyan) | Idle: bobs `ds-btn-bob` 1.9s. Hover: ring turns pink. Active: `translateY(3px)` |
| **Next / Descend** (`.ds-next-btn`) | `#101d33` | foam | 12px 30px 10px | 22px, .14em | big CTA rings (cyan, 5px lip) | Rises in (`ds-rise-in` .5s snap). Hover: pink ring |
| **Dive / submit** (`.ds-dive-btn`) | **pink** `#ff5d8f` | abyss | 11px 16px 9px | 21px, .12em | solid pink | Active: down 2px. Disabled: 55% opacity |
| **Primary (results)** (`.btn-descend`) | pink | abyss | 12px 18px 10px | 19px, .14em | solid pink | same |
| **Keep diving** | **cyan** `#4de3ff` | abyss | 12px 18px 10px | 19px, .14em | `0 0 0 2px #050a14, 0 3px 0 2px #16758a, 0 0 16px #4de3ff59` | Hover: `#8eeeff`. Focus: 2px foam outline, offset 5px |
| **Quiet** (`.btn-quiet`) | `#101d33` | foam | 11px 16px 9px | 16px, .14em | 2px abyss + 4px ring | Hover: cyan text + cyan ring |
| **Meta link** (archive, packs) | `#0b1526d9` | drift | 5px 12px 3px | 14px UPPER, .14em | 1px `#1b3050` border | Hover: foam text, cyan border |
| **Close (×)** | `#101d33` | drift, 25px | 34×30px | — | tile bevel | Hover: foam + cyan ring. Active: down 2px |
| **Icon trigger** (mute, settings, character, menu) | `#0b1526bf` | drift | 34×26px | — | `0 0 0 2px #060d1ae6` | Hover/focus: cyan + 2px cyan outline offset 2px. Muted: drift at 45% |

### 7.2 Answer input (`.ds-input`)

- `#0b1526e6` fill, **2px solid `#1b3050`** border (one of the few real borders), 22px text, `caret-color: #ff5d8f`.
- Focus: border becomes `#4de3ffa6`. **Hot** (timer nearly out): border turns pink.
- Placeholder: drift at 55% opacity (80% in colorblind mode).
- Every keystroke spawns a few bubbles from the caret area (`typeFx`).
- **Fuse bar** sits 8px below the input: a 4px track (`#0a1322`, 2px dark ring) whose `transform-origin: 0` fill (`scaleX`) drains cyan and turns pink when hot.

### 7.3 Sonar timer (`.ds-sonar-*`)

- A 58px circle: the only round element. Radial fill `#0b1526f2 → #101d33e6`, bevel rings plus a faint cyan glow, an inner ring 8px in at `#4de3ff38`.
- A rotating sweep line (half-width, 2px tall, cyan → transparent with glow) spins every **2.4s**, speeding up to **0.7s** when hot.
- Centered 26px tabular digits, cyan; pink with a stronger glow when hot.

### 7.4 HUD

```
[ DEPTH  ]   ■■■■□□□   [  SCORE ]
[ 1,300m ]  PROMPT 5 OF 7 [   130  ]
```

- **Pods** (`.ds-pod.ds-px`): pixel-cut corners, pod gradient, 86px min-width (120px desktop). Label 10px .3em drift; number 25px (32px) tabular, cyan glow for depth and pink glow for score.
- **Progress dots:** seven 10×10 squares, 6px gap, each with a 2px dark ring. Empty `#12233d`; **done = gold** with an 8px gold glow; **current = pink**, pulsing (`ds-dot-pulse` 1.4s, scale 1.05 ↔ 1.35).
- The HUD slides in from `translateY(-80px)` with the snap easing (0.6s) when the game phase becomes answering, preview or feedback.

### 7.5 Prompt card (`.ds-card.ds-px`)

- `#101d33ed`, padding 16/18/14, ring `0 0 0 3px #4de3ff40`, a big soft drop `0 0 50px #0009`, and an inner shade `inset 0 0 34px #050a1499`.
- Content: `PROMPT 3 OF 7` (pink, .32em) → prompt (28–40px) → hint (drift, .14em).
- **Enter:** `ds-card-in` 0.7s `cubic-bezier(.2, 1.5, .4, 1)` from `translateY(46px) scale(.92)`, opacity 0 (a springy overshoot), delayed 0.45s on descend.
- **Exit:** `ds-card-gone` 0.6s ease-in, to `translateY(-28px) scale(.9)`, `blur(2px)`, opacity 0, with a burst of 12 cyan sparks.

### 7.6 Answer chip (`.ds-chip.ds-px`)

The submitted answer becomes a glowing chip that physically sinks through the world.

- 24px uppercase text in curly quotes, `#101d33f2` fill, ring and glow in the tier color (`0 0 0 3px var(--cc), 0 0 26px var(--cc)`), with a `▼` after it.
- Krillion tier: the ring pulses gold (`ds-gold-pulse` 1s).

### 7.7 Tier lines (`.ds-tierline`)

During a sink, six horizontal guide lines appear at each tier's depth below the current position:

- 2px **dashed** top border `#7d93b85c`, with a right-aligned tag: tiny tier sprite (55% opacity) + `RARE · 60` (13px, .12em).
- They fade in one by one, **90ms apart** (0.55s ease-out each).
- **Passed:** the line turns the tier color with a 16px glow, flashes (`filter: brightness(3) → 1`, 0.6s), its tag lights up, and a short triangle chirp plays (`tierline`). Lines for the tier you didn't land on emit 7 small sparks in their color.

### 7.8 Landed banner (`.ds-landed`)

- Pops in with `ds-banner-in` 0.8s `cubic-bezier(.2, 1.7, .4, 1)` from `scale(.5)`, a big elastic overshoot.
- Stack: tier sprite 66px (88px desktop) bobbing (`ds-icon-bob` 2.6s) with a 20px drop-shadow glow in the tier color → **tier name** → `"Answer"` → `+60 PTS · sink 600m` (points in tier color) → blurb in drift.
- Miss: no icon, title `NOTHING LANDED` in the miss color.

### 7.9 Pills and status lines

- **Preview pill:** centered at the bottom, `#0b1526eb`, two-ring bevel, 16px .14em drift text with the number in cyan: `descending · the clock starts in 34`.
- **Reject line:** orange `#ff9f43`, 16px .08em, just above the dock, shaking with `ds-reject-jolt` 0.4s.
- **Correction panel:** the same pill style, wrapping, 20px, with an arrow (`→`) in foam and a 14px hint line.

### 7.10 Toggle switch (Settings)

A chunky hardware slider:

- **Track:** 70×30px, `#03070f`, deep inset shadow (`inset 0 3px 5px #000000e6`), double ring (2px `#060d1a`, 3px `#1b3050`). On: the outer ring turns cyan with a 12px cyan glow.
- **Thumb:** 34×24px with a banded 3-tone gradient (light 4px top band / body / dark 5px bottom band), labeled `OFF`/`ON` (11px, weight 600). Off: drift tones (`#a9bedd / #7d93b8 / #45597c`). On: cyan tones (`#b8f2ff / #4de3ff / #1e8aa8`) plus glow.
- Moves 30px with `transform .12s steps(2, end)`.
- Rows: label 16px .09em UPPER foam (cyan on hover), description 13px drift, max 30ch.

### 7.11 Modals (menu, settings, history, archive, announcement)

- Native `<dialog>`, `border-radius: 0`, backdrop `#02050bd1`.
- Frame: `0 0 0 3px abyss, 0 0 0 5px #1b3050, 10px 10px 0 #02050bd9, 0 0 38px #4de3ff24`.
- Panel: scanlines on `#101d33`, 18–22px padding.
- Header: eyebrow (11–12px, .22–.24em, cyan, glow; it blinks `steps(2)` on announcements) → h2 with the aberration shadow → close button → a dashed hairline rule.
- **Menu grid:** two columns, 16px gap, tiles at least 78px tall with icon + 15px UPPER label; current page = pink ring.
- **History / archive grid:** `repeat(auto-fill, minmax(72px, 1fr))` tiles; done = cyan-tinted (`#123048`) with a cyan note; current = pink ring that "breathes" (`translateY(2px)` 1.9s loop).
- **Character picker:** two columns of 72px sprites; locked = grayscale + 50% brightness + `not-allowed` cursor + an unlock requirement (`5-DAY STREAK`-style, 10px).

### 7.12 Fathom divider (`.fathom`)

Section headers on the results page: 13px UPPER .14em drift label, a dimmer secondary label, then a `1px dashed var(--hairline)` line that fills the rest of the row.

```
DIVE LOG  DEEPER = RARER  - - - - - - - - - - - - - - - - -
```

### 7.13 Pack cards (themed packs hub)

128px pixel-art header image (scanlined, fading into the panel), a corner chip (10px UPPER, 1px ring and glow in the pack color), name 21px with a pack-color glow, tagline 12px, and a dashed-rule footer with a progress count and CTA (`DESCEND ∞ ↓`). Hover lifts 2px, the ring takes the pack color with a 26px glow, and the CTA bobs.

---

## 8. Sprites and iconography

- **Every bitmap** renders with `image-rendering: pixelated`. Sprites are square PNGs drawn at 17px (tier-line tag), 24px, 32px, 64–66px (mascot, banner), 72px (picker) and 88px (desktop banner).
- **Tier sprites:** a creature per tier (bubble cluster, clown-ish fish, schooling fish, squid, lantern anglerfish, krill), each with a **gold variant** used once a Krillion is found.
- **Miss icon:** an SVG dashed circle (`r 7.5`, `stroke-dasharray 2.8 4`, 1.8px stroke in the miss color), "the empty spot".
- **UI icons:** tiny inline SVGs on a 20×16 grid with `shape-rendering="crispEdges"`, built from `<rect>`s like pixel art. Example, the speaker: a body path `M2 6h3l4-4v12l-4-4H2z`, plus two bars for "on" or a 5-block × for "muted".
- **Glow on sprites:** `filter: drop-shadow(0 0 12–20px <color>)`, using the tier or character color at about 45–73% alpha.

### Mascots (selectable companions)

The mascot swims beside the action and reacts to every result. Tapping it makes it speak and do a trick.

| Character | Color | Says | Tap trick | Unlocks at |
|---|---|---|---|---|
| The Krill (default) | `#ff5d8f` | blub! | roll (two full spins) | — |
| Schooler | `#4de3ff` | glub! | dart (zip right, flip, return) | 5-day streak |
| Rare Squid | `#ff5252` | blorp! | jet (squash, then shoot up) | 14 |
| Deep Cut Angler | `#9d7bff` | chomp! | chomp (lunge and bite twice) | 30 |
| Evil Krill | `#ff303b` | mwahaha! | roll | 45 |

The character color feeds `--dsm-color`, `--dsm-glow` (70% alpha) and `--dsm-shadow` (45% alpha). Sprites also get seasonal swaps.

---

## 9. The scene: the ocean world

The game screen is one long vertical diorama rendered as **two canvases sandwiching a DOM layer**.

### 9.1 Layers, back to front

1. **Sea canvas:** depth gradient (three samples: ¼ screen above, center, ¼ below the camera) → three tiled painted art bands → sky image and animated wave line → silhouette set-pieces → back particles.
2. **World DOM:** title block, ambient depth labels, prompt card, tier lines, chip, landed banners, seafloor image (masked to fade in from the top).
3. **Fore canvas:** front particles, sink glow, schooling fish around the chip, krill swarm, bubbles, ink, sparks, depth ruler.
4. **Overlays:** dim/spotlight → vignette → danger edge → flash → HUD/dock → mascot → CRT.

### 9.2 Painted art bands

| Band | Depth range | Opacity |
|---|---|---|
| Top (reef, kelp) | 40–470 m | 0.45 |
| Mid (open water, rock) | 480–2,620 m | 0.50 |
| Trench | 2,950–7,060 m | 0.55 |

Each band tiles vertically at full width and is feathered into the gradient with 150px fades at both ends, so the joins are invisible.

### 9.3 Surface

- A pixel-art sky with chunky clouds and a soft pixel sun. At the waterline sits a tiny trawler silhouette with a pink pennant.
- **Wave line:** `y = surface + 3·sin(0.02x + 1.6t) + 2.4·sin(0.011x − t)`, sampled every 8px, filled with the 0 m water color and stroked `rgba(232,241,255,.6)` at 2px.

### 9.4 Depth markers ("ambient" labels)

Real facts pinned to their depth, alternating left (`── text`) and right (`text ──`). Major zones are uppercase cyan:

| Depth | Label |
|---|---|
| 60 m | light begins to fade |
| 200 m | most sunlight stops here |
| 332 m | deepest scuba dive ever — 332m |
| 385 m | sperm whales hunt below here |
| 535 m | emperor penguins dive this deep |
| 660 m | pressure: 67x the surface |
| 800 m | siphonophore drift zone |
| **1,040 m** | **THE MIDNIGHT ZONE** |
| 1,240 m | anglerfish territory |
| 1,550 m | sperm whales duel giant squid here |
| 1,850 m | giant squid territory |
| 2,150 m | colossal squid eyes: football-sized |
| 2,500 m | the water is 2°C and utterly black |
| **3,000 m** | **THE ABYSSAL ZONE** |
| 3,800 m | the Titanic rests here — 3,800m |
| 4,400 m | cusk eels patrol the plain |
| 4,900 m | the abyssal plain stretches out |
| 5,500 m | deeper than most submarines survive |
| **6,000 m** | **THE HADAL ZONE** |
| 6,500 m | named for Hades. fitting. |
| **7,000 m** | **the trench floor — a perfect dive ends here** |

Labels are hidden (opacity 0) until a sink is in progress (`.ds-reveal`), then fade to 0.85 (majors to 1) over 0.6s. On the way down they read like a passing tour.

### 9.5 Silhouette set pieces (canvas, fill `rgba(4,9,18,.85)`)

| Depth | Piece |
|---|---|
| 85 m | A school of 9 small fish crossing |
| 800 m | 22 cyan bioluminescent siphonophore dots, twinkling |
| 980 m | 6 lanternfish with blinking pale eyes |
| 3,800 m | The Titanic: hull, three funnels, stern |
| 4,400 m | Pink bioluminescent specks |
| Everywhere | 4 loner fish drifting across at random depths |

Silhouette fish are drawn as an ellipse plus a triangle tail (body aspect 0.45).

### 9.6 Particles

| System | Count / look | Behavior |
|---|---|---|
| Back "marine snow" | 70 × scale squares, 0.6–2px, alpha 0.12–0.37, `rgb(200,220,255)` | Drift up 7.2 px/s, sway, 0.35–0.85 parallax |
| Front snow | 26 × scale, 1–2.8px, alpha 0.18–0.48 | Faster (12 px/s), parallax 1.15–1.6 |
| Bubbles | Up to 90 stroked circles, 1.2px line | Rise 14–32 px/s with a wobble, 4s life |
| Sparks | Up to 260 squares, 1.5–4px | Radial burst, drag 2.4/s, slight float, 0.6–1.4s life |
| Ink | Up to 30 radial blobs (`rgba(60,4,14,.95) → transparent`) | Expand and slow, 1.2–2.2s (Rare tier) |
| Pointer trail | Cyan specks under the cursor | Only below 550 m, every 50ms |

*Scale* = `min(area / 304,500, 2.4)` × particle scale (1 normal, 0.4 low-power, 0 reduced-motion).

### 9.7 Depth ruler (fore canvas)

On the right edge (`x = width − 14`): a 2px vertical line in `rgba(125,147,184,.55)`, ticks every 10 m (5px), 50 m (10px) and 100 m (16px, labeled `-1,200m` in 13px VT323). Your last landing is marked by a **pink triangle + "YOU"** (12px).

### 9.8 Lighting

- **Vignette** opacity rises with depth: `min(0.72, 0.25 + depth / 2400)`.
- The sky disappears and the sea darkens through the gradient stops, so the screen gets physically darker the better you do.

---

## 10. Motion

### 10.1 Principles

1. **Springy in, quick out.** Entrances overshoot (cubic-bezier y-values of 1.5–1.7). Exits accelerate away (ease-in).
2. **Chunky for UI, smooth for the world.** Buttons and toggles use `steps(2)` transitions; the camera and creatures use smooth exponential smoothing.
3. **Everything breathes.** Idle elements have slow loops (bobbing title letters, swimming mascot, bobbing CTA, pulsing current dot, sonar sweep).
4. **Bigger result, bigger moment.** Duration, shake, flash count and particle count all scale with rarity.

### 10.2 Easing tokens

| Token | Curve | Character | Used for |
|---|---|---|---|
| `--ds-ease-out` | `cubic-bezier(.22, 1, .36, 1)` | Fast start, long glide (quint-out) | Dims, faints, perched growth, gild |
| `--ds-ease-snap` | `cubic-bezier(.34, 1.56, .64, 1)` | Overshoot spring (back-out) | HUD/dock slide-ins, score slam, dot growth, button press |
| `--ds-ease-io` | `cubic-bezier(.65, 0, .35, 1)` | Symmetric (cubic in-out) | Loops: swim, pulse, throb, bob |
| card spring | `cubic-bezier(.2, 1.5, .4, 1)` | Strong overshoot | Prompt card in |
| banner spring | `cubic-bezier(.2, 1.7, .4, 1)` | Extreme overshoot | Landed banner pop |
| sink | `cubic-bezier(.5, 0, .85, .6)` | Accelerating drop | Results-page chips and droplines |
| roll | `cubic-bezier(.3, .1, .3, 1)` | Front-loaded spin | Mascot roll and chomp |
| swarm | `cubic-bezier(.45, .05, .55, .95)` | Gentle in-out | Fish swarm crossing |

**JS easings in the engine:** cubic in-out (`t<.5 ? 4t³ : 1−(−2t+2)³/2`) for sinks and descents; cubic out (`1−(1−t)³`) for surfacing and swarm dispersal; quartic out for score counting; cosine in-out for the plankton sink.

### 10.3 Durations

| Duration | Use |
|---|---|
| 60–120ms | Button press steps, toggle thumb, depth "crank" jolt (0.12s) |
| 150–250ms | Hover color/shadow transitions, input border |
| 0.28s | CRT zap |
| 0.4–0.5s | Reject jolt, stage shake, score slam, rise-in |
| 0.55–0.9s | HUD/dock slide, tier line fade, card in/out, banner pop, dim fade |
| 1–1.5s | Blub float, celebrate loop, swarm dispersal |
| 1.4–3.2s | Idle loops (dot pulse 1.4, CTA bob 1.9, sonar 2.4, swim 2.6, sad 2.8, title letters 3.2) |
| 2.2s | Descend between rounds |
| 3–4.6s | The sink itself (by tier) |
| 2.5–9s | Surfacing at the end (3 ms per meter, clamped) |
| 34s / 44s | Background light rays / water drift (alternate loops) |

### 10.4 Keyframe catalog

**Screen and feedback**

| Name | Duration / timing | Motion |
|---|---|---|
| `ds-shake` | 0.5s linear | Decaying translate+rotate: (−10,5,−.6°) → (9,−6,.5°) → (−7,4) → (6,−3) → (−3,2) → 0 |
| `ds-reject-jolt` | 0.4s linear | Horizontal: −8 → 7 → −4 → 2 → 0 px |
| `shake` | — | Horizontal: −8 → 7 → −5 → 3 → 0 |
| `ds-crt-zap` | 0.28s `steps(3)` | Opacity .9 → .2 → .7 → .45 with a ±2px vertical jump |
| `ds-edge-throb` | 0.55s io, infinite | Danger glow opacity .15 ↔ .85 |
| `ds-title-flicker` | 5s `step-end`, infinite | Holds 1, then at 93–95.5% flickers .7 / .94 / .62 |
| `ds-line-flash` | 0.6s ease-out | `brightness(3)` → normal |

**Enter and exit**

| Name | Timing | Motion |
|---|---|---|
| `ds-card-in` | 0.7s card spring | From y+46px, scale .92, opacity 0 |
| `ds-card-gone` | 0.6s ease-in, forwards | To y−28px, scale .9, blur 2px, opacity 0 |
| `ds-banner-in` | 0.8s banner spring | From scale .5, opacity 0 |
| `ds-rise-in` | 0.5s snap | From y+30px, opacity 0 |
| `fade-up` | — | From y+6px, opacity 0 |
| `sink` | — | From y−14px, opacity 0 (things drop into place) |
| `bloom` | — | Scale .6, brightness 2.5, opacity 0 → 1.06 at 60% → 1 |
| `sink-to-depth` | 0.9s sink curve | `translateY(0 → var(--sink-to))` (results chips) |
| `dropline-grow` | 0.9s sink curve | `scaleY(0 → 1)` from the top (results droplines) |

**Emphasis**

| Name | Timing | Motion |
|---|---|---|
| `ds-score-slam` | 0.5s snap | Scale 1 → 1.4, rotate −2°, color gold + 26px gold glow → back |
| `ds-crank-jolt` | 0.12s snap | Depth number drops 3px and grows 6% |
| `ds-gold-pulse` | 1s io, infinite | Gold ring 3px with glow 26px ↔ 60px, ring color `#ffd166` ↔ `#ffe9a8` |
| `ds-dot-pulse` | 1.4s io, infinite | Scale 1.05 ↔ 1.35 |
| `glow-pulse` / `boot-pulse` / `hub-charting-pulse` | 1.6–2.2s | Opacity 1 ↔ .35–.55 |

**Idle loops**

| Name | Timing | Motion |
|---|---|---|
| `ds-bob-l` | 3.2s ease-in-out | Title letter up 9px (staggered 0.18s per letter) |
| `ds-btn-bob` | 1.9s io | Begin button sinks 5px and returns |
| `ds-icon-bob` | 2.6s ease-in-out | Tier icon up 8px |
| `ds-boot-bob` | 2.4s io | Loading krill: up 9px, rocking −4° ↔ 4° |
| `ds-sweep-spin` | 2.4s linear (0.7s hot) | Sonar 360° |
| `hub-go-bob` / tile-breathe | 0.9–1.9s | Down 2–3px |
| `water-drift` | 44s alternate | Background ±2.4% x, ±0.5% y |
| `rays-drift` | 34s alternate | God-rays ±3% x, opacity .75 ↔ 1 |

**Mascot**

| Name | Timing | Motion |
|---|---|---|
| `ds-swim` (idle) | 2.6s io, infinite | 4-pose loop: y 0/−7/−2/−9, rotate −4/2/5/−2°, scaleX 1/.96/1/.97 (a breathing squash) |
| `ds-loop` (celebrate) | 1.2s io | Full backflip: −140° up 36px, −280° up 16px, −360° home, scale to 1.2 |
| `ds-faint` | 2.3s ease-out, forwards | Rolls 178° and sinks 90px, opacity to .65 |
| `ds-sad` | 2.8s io, infinite | Drooped at 24–30°, sagging 2–9px |
| `ds-roll` | 0.9s roll curve | Two full spins (720°) |
| `ds-dart` | 0.85s io | +36px stretched, +44px flips (scaleX −1), back to −8px, home |
| `ds-jet` | 1s io | Squash (1.28, .68) → shoot up 48px stretched (.8, 1.32) → settle |
| `ds-chomp` | 0.9s roll curve | Wind back −7px, lunge +11px scale 1.24, half-close, lunge again |
| `ds-blub-up` | 1s ease-out | Speech text: fade in, rise 22px, fade out |
| `ds-gold-breathe` | 2.6s io | Gold halo behind the mascot, scale .88 ↔ 1.08, opacity .38 ↔ .72 |
| `ds-gild` | 1.1s ease-out | Halo burst: scale 1.7 → .92 when the mascot turns gold |

### 10.5 Procedural motion (JS)

- **Camera:** critically damped follow, `cam += (target − cam)·(1 − e^(−6·dt))`, plus a constant idle bob of `2.2·sin(0.45·t)` meters, so the world gently heaves like a swell.
- **Mascot:** the same exponential follow toward a target that depends on the phase (intro: right side near the surface; plunge: just beside the chip, tilted 24°; landed: upper left, −8°; answering: bottom left above the dock; finale: top right). Stiffness is 2.6 normally, 3.4 when perched and 4.6 when orbiting. A bob of `sin(1.7t)·6px` and a rock of `sin(1.1t)·4°` are layered on top. It burps a bubble every 2.2–3.2s, and sheds gold glitter every 0.55s once gilded.
- **Score count-up:** 700ms quartic ease-out (1,100ms for a Krillion, overshooting to 106% before settling, then `ds-score-slam`).
- **Depth crank (Krillion only):** the depth readout clicks up in **8 discrete steps, 110ms apart** (quadratic ease-out), each step replaying `ds-crank-jolt`, like a winch.
- **Screen flash:** a full-screen color layer jumps to 42% opacity and fades over *n* ms. Repeats are spaced at 2.1 × *n*.
- **Shake / zap restart:** remove the class, force a reflow (`el.offsetWidth`), re-add it, so the effect can retrigger mid-play.

---

## 11. Sound

**Every sound is synthesized live with the Web Audio API.** There are no audio files. Sounds are short, soft, low-passed sine/triangle blips and filtered noise "whooshes", like sonar.

### 11.1 Engine rules

- One shared `AudioContext` → master `GainNode` at **0.75** → destination.
- **Mute** is persisted in `localStorage["krillion-muted"]` (`"1"`/`"0"`) and applied by setting master gain to 0. The toggle shows a pixel speaker icon with `aria-pressed`.
- **Gesture unlock:** capture-phase `pointerdown`, `pointerup` and `keydown` listeners resume the context. A sound triggered by a gesture is **dropped if unlocking took longer than 250ms**, so late, out-of-sync sounds never play.
- The context **suspends when the tab is hidden** and resumes when visible. A stalled clock (`currentTime` frozen for 1s while "running") triggers a context rebuild.
- Reference counting: audio only runs while a game screen is mounted.

### 11.2 Primitives

**Envelope:** linear attack from 0 to `peak` over `a`, then an exponential decay to 0.0001 over `dur`.

| Primitive | Parameters (defaults) | Signal chain |
|---|---|---|
| `tone` | `type` sine · `f0` · optional `f1` glide (exponential) · `dur` 0.2 · `a` 0.005 · `peak` 0.3 · optional `lp` · `delay` 0 | Oscillator → [lowpass] → envelope gain → master |
| `noise` | `dur` 0.3 · `lp` 1200 · optional `sweepTo` (exponential) · optional `hp` · `peak` 0.25 · `a` 0.003 · `delay` | White-noise buffer → lowpass (sweeping) → [highpass] → envelope → master |
| `arp` | note list · `type` triangle · `step` 0.12s · `dur` 0.5 · `peak` 0.16 · optional `lp` | One `tone` per note, staggered by `step` |

### 11.3 Sound catalog

Frequencies in Hz, times in seconds. "→" means an exponential glide from f0 to f1 over the duration.

| Event | When it plays | Recipe | Character |
|---|---|---|---|
| **begin** / **descend** | Begin Descent; Descend between rounds | noise 1.1s, lp 2000 → 240, peak .15 · sine 110 → 48, 1.2s, peak .32 · triangle 784 (G5) 0.5s, peak .12, lp 3k · triangle 523 (C5) 0.75s, peak .12, lp 3k, +0.22s | Bubbly whoosh down + sub drop + a falling two-note "sonar" chime (G → C) |
| **submit** | Answer accepted | sine 1150, 0.16s, a .003, peak .16 | Crisp single ping |
| **submit_soft** | Quiet variant | the same at peak .04 | Barely-there ping |
| **reject** | Answer not recognized | noise 0.22s, lp 420, peak .2 · sine 150 → 62, 0.36s, peak .22, lp 700 | Dull low "thunk" with a downward bend |
| **sink** | The chip starts sinking | sine 1150, 0.7s, a .01, peak .1 · noise 1.3s, lp 1400 → 180, peak .16 · sine 300 → 60, 1.3s, peak .1 | Sonar ping ringing out over a darkening water rush |
| **tierline** | Each tier line passed | triangle 780 → 1560, 0.07s, peak .13, lp 2500 | Tiny rising chirp; a quick series sounds like a depth counter |
| **land_small** | Landing on Plankton / Too Clever | sine 140 → 70, 0.25s, peak .28, lp 600 · noise 0.14s, lp 500, peak .1 | Soft "thud" in sand |
| **land_big** | Landing on Schooler / Rare / Deep Cut | sine 80 → 45, 0.6s, peak .38 · noise 0.7s, lp 900 → 200, peak .18, +.02 · triangle 523 (C5) 0.4s, peak .09, +.15 | Heavy boom, sediment cloud, and a little bell confirming it |
| **krillion** | Landing a One in a Krillion | sine 60 → 40, 1.2s, peak .34 · arp triangle G5–B5–D6–G6 (784, 988, 1175, 1568), step .13, dur .7, peak .15, lp 3k · noise 1.4s, lp 2500 + hp 1200, peak .05, +0.3s | Sub boom + rising G-major arpeggio + shimmering sparkle wash |
| **miss** | Nothing landed / timed out | sine 220 → 52, 0.7s, peak .24 · noise 0.5s, lp 400, peak .14, +.05 | Sad deflating slide |
| **tick** | Final seconds of the clock (urgency > 80%, about 3 ticks) | sine 880, 0.07s, peak .16 · sine 880, 0.05s, peak .06, +0.12s | "Tick-tick" with a softer echo |
| **surface** | Rising back up after round 7 | noise 1.6s, lp 300 → 3000, peak .16 · sine 80 → 600, 1.5s, peak .08 | Reverse whoosh: water brightening as you rise |
| **blub** | Tapping the mascot | sine (260 → 720) × random 0.85–1.30, 0.13s, peak .22, lp 2200 · noise 0.05s, lp 1800, hp 700, peak .05 | Rising "bloop" bubble, pitch randomized each tap |
| **spare** | (defined; for other modes) | arp sine C5–G5 (523.25, 783.99), step .09, dur .22, peak .1 | Two-note "nice" |
| **category** | (defined; for other modes) | noise .35s, lp 900 → 4200, hp 400, peak .07 · triangle 988 (B5) .32s +.12 · triangle 1319 (E6) .55s +.24 | Airy upward swish + two bright notes |

### 11.4 Sound design rules

- **Waveforms:** sine for pings and subs, triangle for melodic chimes (always low-passed at 2.5–4 kHz to stay soft), filtered white noise for water. No square or sawtooth: nothing harsh.
- **Pitch language:** downward glides mean going deeper or failing (descend, sink, miss, reject); upward glides mean rising or success (tierline, surface, blub, the Krillion arpeggio).
- **Notes** come from C major / G major (C5, G5, B5, D6, E6, G6), so every chime agrees with the others.
- **Loudness budget:** individual voice peaks stay between 0.04 and 0.38, and the master is 0.75. Sub-bass (40–80 Hz) carries the weight of big moments; melodic layers stay around 0.09–0.16.
- **Event layering:** big moments are 3 layers (sub + noise + melody), small ones 1–2.
- There is **no music bed**. Ambience comes from the visuals; sound only marks events.

### 11.5 Reference implementation (clean-room, same parameters)

```js
class Sfx {
  constructor() {
    this.muted = localStorage.getItem('muted') === '1';
    this.ctx = null;
    const unlock = () => this.unlock();
    for (const ev of ['pointerdown', 'pointerup', 'keydown'])
      document.addEventListener(ev, unlock, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () =>
      this.ctx && (document.hidden ? this.ctx.suspend() : this.ctx.resume()));
  }
  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.75;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx.resume();
  }
  setMuted(m) {
    this.muted = m;
    localStorage.setItem('muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.75;
  }
  env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(1e-4, t + a + dur);
  }
  tone({ type = 'sine', f0, f1, dur = 0.2, a = 0.005, peak = 0.3, lp, delay = 0 }) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    let out = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); out = f; }
    this.env(g, t, a, peak, dur);
    out.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + a + 0.05);
  }
  noise({ dur = 0.3, lp = 1200, hp, peak = 0.25, a = 0.003, delay = 0, sweepTo }) {
    const c = this.ctx, t = c.currentTime + delay;
    const len = Math.ceil(c.sampleRate * (dur + 0.1));
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const low = c.createBiquadFilter(); low.type = 'lowpass';
    low.frequency.setValueAtTime(lp, t);
    if (sweepTo) low.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    src.connect(low);
    let out = low;
    if (hp) { const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; low.connect(h); out = h; }
    const g = c.createGain(); this.env(g, t, a, peak, dur);
    out.connect(g).connect(this.master);
    src.start(t); src.stop(t + dur + 0.1);
  }
  arp(notes, { type = 'triangle', step = 0.12, dur = 0.5, peak = 0.16, lp } = {}) {
    notes.forEach((f0, i) => this.tone({ type, f0, dur, peak, lp, delay: i * step }));
  }
}
// Example: the top-tier landing
// sfx.tone({ f0: 60, f1: 40, dur: 1.2, peak: 0.34 });
// sfx.arp([784, 988, 1175, 1568], { step: 0.13, dur: 0.7, peak: 0.15, lp: 3000 });
// sfx.noise({ dur: 1.4, lp: 2500, hp: 1200, peak: 0.05, delay: 0.3 });
```

---

## 12. Game choreography, beat by beat

### 12.1 Flow

```
BOOT ("descending…", bobbing krill, pulsing label)
  → INTRO (sky, title, wordmark letters bobbing, boat, mascot near surface; bottom panel: BEGIN DESCENT)
  → [begin sfx] DESCEND 2.2s cubic-in-out to the first card; CRT zap; card springs in (+0.45s)
  → PREVIEW pill "descending · the clock starts in N"; HUD and dock slide in
  → ANSWERING: 25s timer (sonar + fuse); typing makes bubbles
        last ~5s: danger edge throbs pink, sweep 0.7s, digits/fuse/input turn pink, tick sfx
        invalid → reject sfx, CRT zap, orange line + jolt, two bubbles
  → PLUNGE (per tier, see below); dock drops away
  → LANDED banner + DESCEND ▼ button (rises in)
  → … ×7 …
  → SURFACE ▲ → finale: camera rises to −45m over 2.5–9s (surface sfx), results overlay
```

### 12.2 The plunge, by tier

Every valid answer: the card leaves (`ds-card-gone` + 12 cyan sparks), the **answer chip** appears and sinks from the current depth to `current + 10·points` m, tier lines fade in (90ms stagger), the ambient labels reveal, and the `sink` sound plays. A soft cyan sink glow (80px radial) follows the chip.

| Tier | Sink time / ease | Chip motion | During the sink | On landing |
|---|---|---|---|---|
| **Plankton** (10) | 3.4s, cosine in-out | Wide lazy sway: 36px·sin(7t), shrinking slightly; tilt 0.55× | Mascot **sad**; grey motes drift | `land_small`; 8 grey sparks |
| **Too Clever** (15) | 3.0s | Nervous jitter: 7px·sin(42t) ± 2px noise, random ±3° tilt | **3 orange flashes** (130ms), **shake**, mascot **faints**; a **swarm of 8–11 schooler fish** crosses the screen (1.3–2s each, 110ms stagger) as the crowd "reaching for it" | `land_small`; 2 orange flashes, shake, 18 sparks |
| **Schooler** (30) | 3.0s | Damped wobble 14px·sin(16t)·(1−t) | Bubble trail; **6 schooler fish circle the chip** | `land_big`; 22 cyan sparks |
| **Rare** (60) | 3.4s | Damped wobble | **Red flash** (220ms); **squid ink clouds** burst and trail | `land_big`; 22 ink clouds + 26 red sparks, shake, red flash (240ms) |
| **Deep Cut** (85) | 4.3s | Damped wobble | **Lights out:** the screen dims to near-black with a **spotlight hole** following the chip (66px clear → 72% dark at +90px → 96% dark at +260px) | `land_big`; spotlight widens to 200px, 18 violet sparks; lights return after 2.3s |
| **One in a Krillion** (100) | 4.6s | Strong damped wobble 26px·sin(24t)·(1−t) | **Gold flash**; chip ring **pulses gold**; a **swarm of 14–20 krill orbits** the chip | `krillion` sound; banner perched, gold flash; mascot **backflips**; after 1s the mascot **turns gold** (halo `ds-gild`, 12 multicolor sparks), the swarm **bursts outward** over 1.5s, the score counts with overshoot + **slam**, and depth **cranks up in 8 clicks**. The mascot then perches on the banner icon |
| **Miss** (0) | — | No chip | Immediate **shake + CRT zap**, `miss` sound, slate flash (200ms), mascot sad | After 0.9s: "NOTHING LANDED" at +40 m |

### 12.3 Mascot reactions

| Situation | Pose |
|---|---|
| Idle | `ds-swim` loop, following the camera |
| Plankton or miss | `sad` (drooped, sagging loop) |
| Too Clever | `faint` (rolls over, sinks, fades) |
| Krillion | `celebrate` (backflip), then permanently **gold** for the rest of the dive with a breathing halo and glitter |
| Tapped | Its own trick + its own word floating up + 6 bubbles + 10 sparks in its color |

---

## 13. Accessibility and performance modes

### 13.1 Settings (all persisted)

| Setting | Default | Effect |
|---|---|---|
| Low-power mode | Off | Pauses idle loops (title, mascot swim, halo, begin bob, banner icon, current dot, sonar), caps pixel ratio at 1, particles at 40%, frame rate 15 fps idle / 30 fps animating |
| Colorblind mode | Off | `:root.colorblind`: brighter drift text (`#dbe5f5`), lifted and more separated tier colors (see §3.2), stronger dashed lines, outlined sublines, CRT down to 15%, vignette down to 10% |
| Answer corrections | On | Shows the corrected answer before scoring |
| Clear rejected entries | Off | Empties the input after a reject |
| Share link | Off | Appends a site link to shared results |

### 13.2 Reduced motion

- `prefers-reduced-motion: reduce` (or the engine's own detection) sets `data-reduced-motion` on the root: **all animations and transitions drop to 0.01ms with a single iteration**, the camera bob and parallax time freeze, particles go to 0, and the idle canvas updates at 2 fps.
- The background water drift, light rays, shake, bloom, sink and pulse utilities are disabled. Results droplines appear instantly.
- The mascot's gold halo becomes a static glow (opacity .5, scale .94).

### 13.3 Frame and pixel budget

- Rendering is **on demand**: full frame rate while something is animating (and for 1.5s after any change), then throttled to **30 fps idle** (15 low-power, 2 reduced-motion). Rendering stops when the tab is hidden.
- Canvas pixel ratio = `min(devicePixelRatio, 2, sqrt(8.3M / viewportArea))`; low-power uses `min(dpr, 1, sqrt(1.5M / area))`.
- Particle pools are hard-capped (bubbles 90, sparks 260, ink 30).

### 13.4 Focus and input

- Global `:focus-visible { outline: 2px solid #4de3ff; outline-offset: 2px }`. Bright buttons use a foam outline at 5px offset.
- The game root disables text selection and the tap highlight. Results re-enable selection.
- `touch-action: manipulation` on buttons and inputs (no double-tap zoom). Tapping the mascot doesn't steal focus from the answer input.
- Icon buttons have `aria-label`s that state the action ("turn sound off").

---

## 14. Theming: alternate worlds

The engine is themed by a **world object** (depth color stops, art layers, ambient labels, particle colors, copy) plus a `data-world` attribute that swaps CSS tokens. The movie pack ("At the Movies") shows the pattern:

| Ocean (default) | Cinema world |
|---|---|
| Cyan accents | **Gold** `#ffd166` accents (tagline, depth, major labels, fuse) |
| Navy panels `#101d33` | **Plum** panels `#1d0d22`, rings `#57284a` / `#3d1d46`, outer `#14080f` |
| Pink Dive button | **Orange** `#ff9f43` button, lip `#7d4a1d` |
| Pink danger edge | Orange danger edge |
| Sonar scope | **Film-leader dial**: parchment `#d8d2bc` face, crosshair, a clock-hand sweep |
| "PROMPT / SURFACE / DIVE COMPLETE" | "SCENE / THE STUDIO GATE / THAT'S A WRAP" |
| "▼ rarer answers sink deeper ▼" | "▶ rarer answers drive farther ▶" |
| meters | blocks (`3.5 blocks`) |
| Bubbles | Gold dust and sparkle crosses |
| Krill swarm | Twinkling gold star-crosses |
| Swarm fish | Orange **ticket stubs** (CSS clip-path notches) |

**Rule:** a new world swaps palette, metaphor and copy, but keeps every timing, easing, layout and component shape.

---

## 15. Sharing format

```
Krillion #112 🦐
250

🦑🐟🐟🫧⬛🦑🦑
```

- Line 1: game name, `#` plus the day number, krill emoji. Archive dives use `Krillion ⟲ #N 🦐`, unlimited dives use an `∞` badge.
- Line 2: score.
- Line 3: one tier emoji per round in order, with ⬛ for a miss.
- An optional link is appended when "Share link" is on.
- Copy uses a hidden-textarea `execCommand('copy')` first, then `navigator.clipboard`. The button confirms for 2s. A native share sheet is used where available.

### Results screen anatomy

1. Mini aberrated wordmark + `∞ DIVE #1 COMPLETE` (drift, with a dash prefix).
2. A huge score (`250`) with `/700` and `-2,500m` beside it.
3. A **bell-curve distribution** of all players: cyan line with a soft fill, a pink "YOU" marker, and `BETTER THAN 66% OF PLAYERS'…` in cyan caps.
4. **Dive log:** one column per round with a dropline sinking to its depth (`sink-to-depth` / `dropline-grow`, 0.9s) topped by that tier's sprite, over the live scene.
5. **The bearing:** score band table. **The catch:** every prompt with your answer and points, each expandable to see all answers.

---

## 16. Starter token sheet

A drop-in CSS foundation that reproduces the system's *structure* (rename and re-tint for your own game):

```css
:root {
  /* palette */
  --abyss: #050a14;   --shallow: #101d33;  --panel-deep: #0b1526;
  --ring: #1b3050;    --ring-dark: #060d1a; --lip: #123048;
  --foam: #e8f1ff;    --drift: #7d93b8;    --hairline: #7d93b838;
  --pink: #ff5d8f;    --pink-lip: #7d1d3c;
  --cyan: #4de3ff;    --cyan-lip: #16758a;
  --gold: #ffd166;    --gold-light: #ffe9a8; --orange: #ff9f43;

  /* tiers */
  --tier-1: #8fa3c4; --tier-2: #ff9f43; --tier-3: #4de3ff;
  --tier-4: #ff5252; --tier-5: #9d7bff; --tier-6: #ffd166; --tier-miss: #3d4f6e;

  /* motion */
  --ease-out:  cubic-bezier(.22, 1, .36, 1);
  --ease-snap: cubic-bezier(.34, 1.56, .64, 1);
  --ease-io:   cubic-bezier(.65, 0, .35, 1);
  --ease-pop:  cubic-bezier(.2, 1.5, .4, 1);

  /* surfaces */
  --bevel:       0 0 0 2px var(--abyss), 0 0 0 4px var(--ring), 0 3px 0 4px #0d1a2e;
  --bevel-hover: 0 0 0 2px var(--abyss), 0 0 0 4px var(--cyan), 0 3px 0 4px var(--lip), 0 0 18px #4de3ff40;
  --dialog:      0 0 0 3px var(--abyss), 0 0 0 5px var(--ring), 10px 10px 0 #02050bd9, 0 0 38px #4de3ff24;
  --scanlines:   repeating-linear-gradient(0deg, #0000002e 0 1px, #0000 1px 3px);

  font-family: 'VT323', ui-monospace, monospace;
  color: var(--foam);
  background: var(--abyss);
}

img { image-rendering: pixelated; }
:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

.wordmark {
  letter-spacing: .04em; line-height: .9;
  text-shadow: -4px 3px var(--pink), 4px -3px #4de3ffd9, 0 0 30px #4de3ff59;
}

.btn {
  font: inherit; letter-spacing: .14em; text-transform: uppercase;
  border: 0; border-radius: 0; cursor: pointer;
  padding: 12px 18px 10px;                      /* optical: +2px top */
  transition: transform 60ms steps(2, end), background .15s;
}
.btn--primary { background: var(--pink); color: var(--abyss);
  box-shadow: 0 0 0 2px var(--abyss), 0 3px 0 2px var(--pink-lip), 0 0 16px #ff5d8f73; }
.btn--primary:active { transform: translateY(2px);
  box-shadow: 0 0 0 2px var(--abyss), 0 1px 0 2px var(--pink-lip); }
.btn--quiet { background: var(--shallow); color: var(--foam); box-shadow: var(--bevel); }
.btn--quiet:hover { color: var(--cyan); box-shadow: var(--bevel-hover); }

.crt { position: fixed; inset: 0; pointer-events: none; opacity: .45; background: var(--scanlines); }

@keyframes shake {
  0%, 100% { transform: none }
  12% { transform: translate(-10px, 5px) rotate(-.6deg) }
  26% { transform: translate(9px, -6px) rotate(.5deg) }
  42% { transform: translate(-7px, 4px) rotate(-.35deg) }
  58% { transform: translate(6px, -3px) rotate(.25deg) }
  76% { transform: translate(-3px, 2px) rotate(-.1deg) }
}
@keyframes pop-in { from { opacity: 0; transform: translateY(46px) scale(.92) } }

@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
```

---

*Sources: krillion.io production CSS chunks (the `ds-*` game system and the component modules), the descent engine and audio module in the JS bundle, and a played practice dive in Unlimited mode (prompts 1–7, including reject, timeout, Plankton, Schooler and Rare outcomes). Values are as shipped on 2026-11-05 and may change.*
