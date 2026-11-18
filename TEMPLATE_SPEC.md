# Template Standard (TEMPLATE_SPEC) · engine 1.0

Every template in the library must follow this document. Once a template follows it:
- the same `deck.json` (content) can be handed to any template and redrawn: **switch templates without changing the content**;
- dropping a new template into `templates/` makes it live automatically, with no need to edit the skill or the engine.

The machine-readable version of this standard is `core/spec.js` (page types, slots, word limits). If the two ever disagree, spec.js wins. The page-type table below is generated with `node core/spec-table.js`.

---

## 1. Division of labor

| Who | Responsible for | Not responsible for |
|---|---|---|
| `deck.json` (content) | text of every page, page type, image prompts, speaker notes, data sources | coordinates, colors, fonts |
| Template `build.js` | how each page type is drawn: layout, colors, decoration, font sizes | writing content, image generation, transitions, animation, QA |
| `core/` engine | validation, images (AI / web / template originals), transitions, entrance animations, QA, previews, preview cards | how any particular page looks |

## 2. Template folder structure

```
templates/<id>/
├── build.js        exports render(deck, ctx)
├── meta.json       template description (used for 3-choose-1, validation, preview cards)
├── assets/         the template's own assets: fallback images, decorative textures, device frames…
└── preview/        generated automatically by the self-test (do not hand-edit)
    ├── cover.jpg       cover rendered with the standard test copy
    ├── sample1.jpg     representative content page 1 (shown on the preview card)
    ├── sample2.jpg     representative content page 2
    └── overview.jpg    overview of every page
```

`<id>` uses lowercase letters, digits and hyphens (e.g. `morimoto`, `tech-blue`), and must match `meta.id`.

## 3. meta.json

```json
{
  "id": "morimoto",
  "name": "雾紫杂志",
  "engine": "1.0",
  "version": "1.0.0",
  "description": "低饱和雾紫底 + 琥珀点缀，杂志式大图留白与叶影装饰，安静、有质感",
  "style": ["文艺", "简洁", "杂志"],
  "fits": ["人文", "生活方式", "观点分享", "品牌介绍"],
  "avoid": ["严肃财报", "儿童教育"],
  "tone": "深色",
  "palette": ["#7B7584", "#CEC3CE", "#BD802F", "#C75431", "#3F3D42"],
  "background": "7B7584",
  "fonts": { "head": "思源黑体 CN Light", "body": "等线" },
  "pageTypes": ["cover", "toc", "section", "points3", "points4", "compare", "stats", "timeline", "imageText", "quote", "closing", "table", "steps"],
  "layouts": { "points4": ["colorCards", "numbered", "grid2x2"], "...": ["..."] },
  "imageHeavy": true,
  "imageStyle": "摄影风格：编辑杂志感……画面中不要出现任何文字、Logo 或水印。",
  "defaultImage": "image1.jpeg",
  "preview": { "cover": "preview/cover.jpg", "samples": ["preview/sample1.jpg", "preview/sample2.jpg"], "overview": "preview/overview.jpg", "samplePages": [6, 12] },
  "license": "原图仅限自用……",
  "qa": { "minBodyPt": 11, "minPt": 9 }
}
```

| Field | Required | Description |
|---|---|---|
| `id` `name` `engine` | ✓ | `engine` is the major version of this standard the template follows; currently `"1.0"` |
| `description` | ✓ | One line, ≤ 40 characters, shown on the preview card |
| `style` | ✓ | Style tags, first one is the primary style. Use common terms: 简洁 / 极简 / 商务 / 专业 / 科技 / 未来 / 文艺 / 杂志 / 国潮 / 中国风 / 复古 / 清新 / 可爱 / 活泼 / 时尚 / 学术 (similarity relations between styles are in `core/select.js` NEIGHBORS) |
| `fits` / `avoid` | ✓ / optional | Suitable / unsuitable topic keywords, used to score topic matches |
| `tone` | ✓ | `深色` / `浅色` / `彩色`; when picking 3, templates of different tones are preferred |
| `palette` | ✓ | 3–6 main colors, drawn as swatches on the preview card |
| `pageTypes` | ✓ | Page types implemented; must include all 11 **required types** |
| `layouts` | ✓ | Layout names for each page type (at least 1); the user can say "switch this page to another layout" |
| `imageStyle` | Recommended | Unified visual style appended to every AI image prompt, so images match the template |
| `imageHeavy` | Recommended | Whether there are many images (helps decide on 3-choose-1 for text-heavy content) |
| `preview.samplePages` | Optional | Which pages of the standard test copy to use as `sample1/2` for the preview card (default 6 and 12) |
| `license` | Recommended | Where the assets come from / whether redistribution is allowed |

## 4. Page types and word limits

**How characters are counted**: CJK characters / full-width punctuation = 1, uppercase English letters = 0.7, other half-width characters (lowercase letters, digits, symbols, spaces) = 0.5; line breaks are not counted.

The first 11 are **required types** that every template must implement; `table` and `steps` are optional types (if a template lacks `steps`, the engine automatically converts it to `timeline`; if it lacks `table`, the content side must avoid it).

| type | Page | Slots and word limits |
|---|---|---|
| `cover` | Cover | `title` ≤16 (required)<br>`subtitle` ≤24<br>`desc` ≤50<br>`tag` ≤16<br>`image` image |
| `toc` | Table of contents | `title` ≤6<br>`desc` ≤40<br>`items` 3–8 entries, each { `head` ≤8 (required), `sub` ≤12 } (required)<br>`image` image |
| `section` | Section page | `title` ≤12 (required)<br>`en` ≤24<br>`desc` ≤44<br>`keywords` 0–5 entries, each ≤4<br>`image` image |
| `points3` | 3 points | `title` ≤16 (required)<br>`lead` ≤40<br>`items` 3 entries, each { `head` ≤8 (required), `body` ≤30 (required), `icon` icon name } (required)<br>`conclusion` ≤36<br>`image` image |
| `points4` | 4 points | `title` ≤14 (required)<br>`lead` ≤40<br>`items` 4 entries, each { `head` ≤6 (required), `body` ≤22 (required), `icon` icon name } (required)<br>`conclusion` ≤40<br>`image` image |
| `compare` | Comparison | `title` ≤16 (required)<br>`lead` ≤40<br>`left` { `head` ≤8 (required), `icon` icon name, `items` 2–4 entries, each ≤16 (required) } (required)<br>`right` { `head` ≤8 (required), `icon` icon name, `items` 2–4 entries, each ≤16 (required) } (required)<br>`conclusion` ≤40<br>`image` image |
| `stats` | Data | `title` ≤16 (required)<br>`lead` ≤50<br>`items` 2–4 entries, each { `value` ≤6 (required), `label` ≤16 (required) } (required)<br>`chart` chart settings (optional)<br>`source` ≤60 (required)<br>`image` image |
| `timeline` | Timeline | `title` ≤20 (required)<br>`lead` ≤44<br>`items` 3–5 entries, each { `time` ≤6 (required), `head` ≤6 (required), `body` ≤20 } (required)<br>`conclusion` ≤36 |
| `imageText` | Large image with text | `title` ≤16 (required)<br>`body` ≤80 (required)<br>`points` 0–3 entries, each ≤20<br>`conclusion` ≤36<br>`image` image (required) |
| `quote` | Pull quote / quotation | `text` ≤40 (required)<br>`author` ≤20<br>`image` image |
| `closing` | Closing | `title` ≤16 (required)<br>`body` ≤60<br>`tag` ≤16<br>`image` image |
| `table` | Table (optional) | `title` ≤16 (required)<br>`lead` ≤40<br>`columns` 2–4 entries, each ≤8 (required)<br>`rows` 2–5 rows, each cell ≤18<br>`conclusion` ≤40<br>`image` image |
| `steps` | Steps (optional) | `title` ≤16 (required)<br>`lead` ≤50<br>`items` 3–4 entries, each { `head` ≤10 (required), `body` ≤30 (required) } (required)<br>`image` image |

**Common fields every page can carry**

| Field | Description |
|---|---|
| `id` | Required, unique page id (`s01`, `s02`…). Used to locate pages during edits; images are cached under this name too |
| `type` | Required, page type |
| `layout` | Optional, specifies a layout (must be one in meta.layouts); if omitted the template rotates automatically and the same type never repeats a layout on adjacent pages |
| `eyebrow` | ≤16, small label above the title; if omitted the template generates one automatically (e.g. `01 · CHANGES`) or leaves it out; `""` means don't show it |
| `source` | ≤60, source of data / citations (required on `stats`, recommended elsewhere when citing numbers) |
| `notes` | Speaker notes, written into the notes pane, no length limit |
| `images` | Extra images `[{prompt,…}]`; multi-image layouts use the 2nd, 3rd…; if omitted they're derived from the main image's prompt |

**Images**: `image: { "prompt": "中文画面描述", "query": "english keywords for Pexels", "alt": "替代文字" }`. Don't ask for text inside the image. When a layout has no image frame, it simply ignores it.
The user's own photo: `image: { "file": "photos/xxx.jpg", "focus": [0.5, 0.4], "alt": "…" }` (path relative to the project folder; `focus` = the point to keep when cropping, 0~1, optional). Photos are auto-rotated by EXIF and cropped to the frame; no image is generated for that frame. `images[]` entries take the same two forms. Templates need no changes: `ctx.pic` handles it. After rendering, `report.json → frames` lists every image frame (page, id, idx, aspect, file, share of the photo kept).

**Icons**: `icon` takes a [Feather Icons](https://feathericons.com) name (`search`, `pen-tool`, `trending-up`…); unknown names fall back to the template's default icon.

**Charts**: `stats.chart = { "type": "bar", "unit": "%", "title": "≤20 字", "labels": [...], "values": [...] }`. If `values` is omitted, numbers are parsed from `items[].value` (only when all items share the same unit; with mixed units there's no chart and the big-number layout is used).

### Hard rules templates must follow

1. **Must hold the maximum**: content at the word limits and maximum entry counts in the table above must lay out without overflow, overlap or single-character line drops (the self-test checks with a "max" deck). If it won't fit, change the layout or use `ctx.fit` to shrink the font, but body text must not go below 11pt.
2. **Must also handle the minimum**: when lists are at their minimum count and optional fields are empty, the page must not look like it has holes (checked with a "min" deck). Leave out the whole element group for an empty slot (color block + text + icon go together); never leave an empty shell.
3. **Every non-empty text slot must be displayed**; switching templates must not lose content. Only `image` may be ignored when the layout has no image frame.
4. **Don't write content**: no text from the template's sample copy in build.js (fixed labels like "目录 / CONTENTS / THANK YOU" are fine).
5. **Don't touch transitions, animation or image generation**: all of that is done by the engine.

## 5. deck.json (content format)

```json
{
  "engine": "1.0",
  "meta": { "title": "AI 时代，普通人如何应对", "topic": "AI 对工作和生活的影响", "author": "" },
  "settings": {
    "template": "morimoto",
    "imageSource": "ai",
    "animation": "auto",
    "transitionSeed": "（首次渲染自动生成）",
    "animationSeed": "（首次渲染自动生成）"
  },
  "slides": [
    { "id": "s01", "type": "cover", "title": "AI 时代", "subtitle": "正在悄悄改变我们每个人的生活",
      "image": { "prompt": "黄昏时分的城市天际线……", "query": "city skyline dusk", "alt": "城市天际线" },
      "notes": "开场白……" },
    { "id": "s02", "type": "points4", "title": "……", "items": [ { "head": "……", "body": "……", "icon": "search" } ] }
  ]
}
```

- `settings.imageSource`: `ai` (gpt-image-2, reads `.env` in the root) / `web` (Pexels) / `template` (template originals) / `mock` (offline placeholders, for checking layout)
- `settings.animation`: `auto` (appear one after another automatically after the slide transition) / `click` (each click shows the next item) / `off`
- The seeds are written back to deck.json on the first render; as long as they don't change, later edits keep the same transitions and animations. Reshuffling = delete the seed.
- The **project folder** is the folder deck.json lives in: `out/` (pptx, report, previews), `generated/` (image cache, by prompt), `.cache/` (intermediate files, deletable).

## 6. How to write build.js

```js
let ctx;
async function cover(s) {
  ctx.pickLayout(s, ["magazine"]);                       // choose a layout (this type has only one)
  const slide = ctx.addSlide(s, { master: "BASE", bg: "7B7584" });
  await ctx.pic(slide, s, 0, 0.8, 1.73, 6.01, 4.68, { radius: 0.78, fallback: "image1.jpeg" });
  const size = ctx.fit(s.title, { w: 5.6, h: 1.9, max: 54, min: 32 });
  slide.addText(s.title, { x: 7.27, y: 2.4, w: 5.6, h: 1.9, fontSize: size, color: "FFFFFF", margin: 0 });
}
async function render(deck, c) {
  ctx = c;
  ctx.pres.defineSlideMaster({ title: "BASE", background: { color: "7B7584" } });
  await ctx.renderAll({ cover, toc, section, points3, points4, compare, stats, timeline, imageText, quote, closing });
}
module.exports = { render };
```

The full ctx API is in the header comment of `core/engine.js`. The commonly used ones:

| API | Purpose |
|---|---|
| `ctx.addSlide(s, { master, bg })` | Create a page. `bg` = background color (or `"image"`), used by the contrast check |
| `ctx.pickLayout(s, [candidates])` | Choose a layout: honor `s.layout`, otherwise rotate. The candidate list may be filtered by content (e.g. chart only when values are numeric) |
| `ctx.pic(slide, s, idx, x, y, w, h, { fallback, radius, circle, alpha, flip, gray })` | Place the page's image no. idx (cropped to the frame ratio automatically; template original `fallback` on failure) |
| `ctx.image(...)` / `ctx.prep(file, w, h, opts)` | Get only the image path / process a template asset (decorations) |
| `ctx.icon(name, color, defaultName)` | Feather icon → image data |
| `ctx.fit(text, { w, h, max, min })` / `ctx.fitLine(text, { w, max, min })` | The largest font size that fits in the box / on one line |
| `ctx.measure(text, { w, fontSize })` | Estimate line count and height (for vertical stacking) |
| `ctx.balance(text, { w, fontSize })` | Rebalance line breaks when the last line has only 1–2 characters (preferring a break after punctuation) |
| `s._part` `s._num` `s._en` `s._sectionTitle` | Fields the engine fills in: PART number, section number, section English name, section title |

**Conventions**
- Canvas `LAYOUT_WIDE` 13.333 × 7.5 inches; pptxgenjs colors have no `#`.
- Decorative elements (leaf shadows, textures, oversized quote marks): give them an `objectName` containing `装饰` → not checked by QA, ignored in contrast checks; containing `static` → no entrance animation.
- Text is placed with `slide.addText` (the engine records it automatically for QA); text drawn inside an image can't be checked, so don't do it.
- On a light background use a dark ink color; don't put white text on light backgrounds.

## 7. Visual baseline (QA checks these automatically)

| Item | Requirement | Level |
|---|---|---|
| Text overflow | Estimated height ≤ text box height × 1.1 | Error |
| Overlap | Text boxes don't cover each other | Error |
| Out of bounds | Text boxes don't extend past the canvas | Error |
| Font size | ≥ 9pt; long body text (> 30 chars) ≥ 11pt | Error / Warning |
| Contrast | ≥ 3 (≥ 2.6 for large text); < 2 is an error | Error / Warning |
| Single-character line drop | Last line of a paragraph has only 1–2 characters | Warning |
| Margins | Text ≥ 0.3" from left/right edges, ≥ 0.25" from top, ≥ 0.2" from bottom | Warning |

QA is an estimate based on character widths. Warnings must be checked against the render images. LibreOffice renders show neither transitions nor animations.

## 8. Intake self-test (passing it is required to enter the library)

```bash
node core/selftest.js <id>
```

It automatically runs 3 decks (mock images):

| Deck | Content | Purpose |
|---|---|---|
| sample | Standard test copy `fixtures/test_deck.json` (21 pages, all 13 types) | Check normal content; produce the preview images |
| max | Every layout forced once; all text stretched to the limit, lists at maximum, optional fields filled | Prove the template can "hold the maximum" |
| min | Every layout forced once; lists at minimum, optional fields empty | Prove there are no "holes" |

**Passing criteria**: meta.json has no errors; none of the 3 decks has QA errors; `validate.py` (pptx skill) PASSED.
Then **review it yourself** in `projects/_selftest_<id>/{max,min}/*_preview/overview.jpg` and `templates/<id>/preview/overview.jpg`: crowding, misalignment, empty-looking areas, image cropping, inconsistent style.
After passing, `templates/<id>/preview/` is updated automatically (needed for preview cards).

## 9. Versions and copyright

- Bump `version` in meta.json when you change a template; when this standard changes incompatibly, bump the engine major version, and templates on the old version get a warning at render time.
- Images in templates downloaded from the web are usually not licensed for redistribution: personal use is fine; before sharing or charging, replace everything in `assets/` with AI-generated or commercially usable images. Layout structure can be borrowed.
