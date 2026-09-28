# Asset brief for the image model

## Read this first — it will save you money

Most of what a celestial app seems to need in generated art, it does not need.
Three things were checked before this brief was written:

- **The star field should not be an image.** 9,096 real stars from the Yale
  catalogue pack to 40 KB of binary and render in one draw call, sharp at every
  zoom and astronomically correct. Any generated star texture would be larger,
  blurrier, and wrong — and users will look for Citrā and Rohiṇī against the
  planets.
- **Planet textures are pointless here.** On a celestial sphere the planets are a
  few pixels across. A textured sphere is indistinguishable from a coloured disc.
- **Jade's visual identity is already set**, and it is technical rather than
  mystical: licensed Telllu glyphs, blueprint corners, a steel accent, Barlow and
  IBM Plex Mono. Generated mystical illustration — nebulae, glowing mandalas,
  robed figures, gold filigree — would fight that identity and make a $99
  professional tool look like a $2 horoscope app. **Do not generate any of it.**

So this brief is deliberately narrow. It covers the one asset class that
genuinely needs artwork, plus two small optional sets.

---

## 1. THE PRIORITY: 27 nakṣatra symbols

These are the real ask. Each nakṣatra has traditional iconography that is
centuries old, specific, and currently rendered nowhere on the web as a coherent
set. They are not decorative — the symbol _is_ how the nakṣatra is identified in
the classical literature.

### Style specification — apply to all 27

- **Monochrome line art.** Single colour, flat, no gradients, no shading, no
  glow, no colour fills.
- **Uniform stroke weight** across the whole set, comparable to a 2px stroke on a
  48px canvas. This is the most important consistency rule — mismatched weights
  make a set look assembled rather than designed.
- **Square canvas, 512×512**, subject centred with even optical margin.
- **Readable at 24px.** This is the real constraint. Each will be rendered small
  beside a label on a ring. Test every one by viewing it at 24px; if the subject
  is not identifiable, simplify it and regenerate.
- **Geometric and restrained**, in the register of a technical diagram or a
  woodblock print — not fantasy illustration, not tattoo art, not clip art.
- **No text, no letters, no numerals** anywhere in the image.
- **No border, frame, circle enclosure or background.** Transparent or pure white
  background only. The subject alone.
- **No human faces.** Where the tradition's symbol is a person or deity, render
  the attribute or object instead — this keeps the set consistent and avoids
  generated faces, which age badly and look uncanny at small sizes.

### The 27 subjects

Use the traditional symbol. Where I have given an alternative, either is fine —
pick whichever renders more clearly at 24px.

| #   | Nakṣatra          | Symbol to draw                                                                 |
| --- | ----------------- | ------------------------------------------------------------------------------ |
| 1   | Aśvinī            | A horse's head, in profile                                                     |
| 2   | Bharaṇī           | A yoni, rendered as an abstract almond/vesica form — geometric, not anatomical |
| 3   | Kṛttikā           | A flame, or a razor / blade                                                    |
| 4   | Rohiṇī            | An ox-cart, or a single ox head                                                |
| 5   | Mṛgaśira          | A deer's head with antlers                                                     |
| 6   | Ārdrā             | A single teardrop, or a faceted gem                                            |
| 7   | Punarvasu         | A quiver of arrows                                                             |
| 8   | Puṣya             | A cow's udder, rendered abstractly, or a lotus flower                          |
| 9   | Āśleṣā            | A coiled serpent                                                               |
| 10  | Maghā             | A royal throne, seen from the side                                             |
| 11  | Pūrva Phalgunī    | The front legs of a bed / a bed frame, front half                              |
| 12  | Uttara Phalgunī   | The back legs of a bed / a bed frame, rear half                                |
| 13  | Hasta             | An open hand, palm forward                                                     |
| 14  | Citrā             | A single bright star, or a pearl                                               |
| 15  | Svātī             | A young shoot bending in wind, or a single coral branch                        |
| 16  | Viśākhā           | A decorated archway / triumphal gate                                           |
| 17  | Anurādhā          | A lotus flower, seen from above                                                |
| 18  | Jyeṣṭhā           | A circular amulet or earring                                                   |
| 19  | Mūla              | A bundle of tied roots                                                         |
| 20  | Pūrva Āṣāḍhā      | A hand fan, or an elephant's tusk                                              |
| 21  | Uttara Āṣāḍhā     | An elephant's tusk, or a small planked bed                                     |
| 22  | Śravaṇa           | An ear, or three footprints in a line                                          |
| 23  | Dhaniṣṭhā         | A drum (mṛdaṅga), or a flute                                                   |
| 24  | Śatabhiṣaj        | An empty circle, or a ship's wheel / hundred-spoked wheel                      |
| 25  | Pūrva Bhādrapadā  | A sword, or the front half of a funeral cot                                    |
| 26  | Uttara Bhādrapadā | Twin legs of a cot, or twin water vessels                                      |
| 27  | Revatī            | A fish, or a drum beaten to keep time                                          |

### Prompt template

Fill in the subject and use it unchanged otherwise, so the set stays consistent:

> Minimalist monochrome line-art icon of **[SUBJECT]**. Single uniform stroke
> weight throughout, flat black lines on a pure white background, no fill, no
> gradient, no shading, no glow, no texture. Geometric and restrained, in the
> style of a technical diagram or a woodblock print. Centred on a square canvas
> with even margin. Simplified enough to stay legible at 24 pixels. No text, no
> numerals, no border, no frame, no enclosing circle, no background scenery, no
> human face.

### Delivery

- **SVG if your tool can produce it**, otherwise PNG at 512×512 with a
  transparent background.
- If PNG, they will need vectorising before use — generated raster line art does
  not hold up scaled down. Budget for that step.
- Name each file `nakshatra-NN-name.svg`, e.g. `nakshatra-01-ashvini.svg`, using
  the numbering above. The numbering is load-bearing: the code will index by it.

---

## 2. OPTIONAL: nine graha sigils

Jade already has licensed glyphs for the planets from the Telllu pack, and those
stay — they are the correct astronomical symbols and they are what practitioners
read. A _sigil_ set is different and purely additive: a larger, more
characterful mark for use on a card header or a period card, where a 12px glyph
is too small to carry a heading.

Only worth doing if §1 goes well and the style holds. Same specification as
above, same prompt template, subjects: Sun, Moon, Mars, Mercury, Jupiter, Venus,
Saturn, Rāhu (a head without a body, abstracted), Ketu (a tail or banner).

**If these do not sit comfortably beside the Telllu glyphs, throw them away.**
Two competing symbol systems on one screen is worse than one.

---

## 3. OPTIONAL: theme background textures

For the six themes (Paper, Ink, Palm, Dusk, Ash, Vellum). Extremely subtle paper
and fabric grains — the kind of texture you notice only if you look for it.

> Seamless tileable subtle paper grain texture, very low contrast, near-uniform
> [warm off-white / deep blue-black / warm sand / muted plum-grey / neutral grey
> / cream], no pattern, no motif, no image, no text. Fine even fibre. 1024×1024,
> tiling seamlessly on all edges.

Deliver as 1024×1024 WebP, and they must be under 40 KB each after compression.
If a texture is visible enough to describe, it is too strong — regenerate.

---

## Two practical notes

**Licensing.** Check your generator's terms for commercial use before shipping
any of this in a paid product. Most current services permit it, some require a
paid tier for commercial rights, and a few restrict resale of outputs. Jade is a
subscription product, so this is a real question rather than a formality — get it
in writing and keep the receipt with the Telllu licence in `NOTICE.md`.

**Do not generate these, at all:**

- Star fields, nebulae, galaxies, or any space photography — the real star
  catalogue is smaller, sharper and correct.
- Planet surface textures.
- Zodiac sign illustrations. The Telllu glyphs already cover the signs and are
  licensed, precise, and consistent with each other.
- Anything depicting a named deity as a figure, or any human face.
- Mandalas, sacred geometry, glowing orbs, gold filigree, crystal balls, tarot
  imagery, or anything in the visual register of a consumer horoscope app.

That last list is the difference between a tool that looks like it costs $99 a
month and one that looks like it costs nothing.
