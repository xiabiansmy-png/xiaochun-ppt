# PPT 模板库

## 快速开始

1. 下载这个文件夹：`git clone https://github.com/xiabiansmy-png/xiaochun-ppt.git`，或者在 GitHub 页面点 Code → Download ZIP 后解压。
2. 在这个文件夹里打开你常用的 AI 编程工具（Codex、Claude Code、Cursor、Gemini CLI、Copilot、OpenCode 等都行），第一次先说「帮我安装」，AI 会装好依赖并跑一遍自测。
3. 说「用 ppt-generate 帮我做一个关于 XX 的 PPT」。

- skill 就在项目里，不需要往电脑别处装任何东西。各个 AI 工具怎么找到它：

  | 工具 | 自动读取的说明文件 | 自动识别的 skill 目录 |
  |---|---|---|
  | Codex | `AGENTS.md` | `.agents/skills/` |
  | Claude Code | `CLAUDE.md`（引用 AGENTS.md） | `.claude/skills/` |
  | Cursor / GitHub Copilot / OpenCode | `AGENTS.md` | `.agents/skills/` 或 `.claude/skills/` |
  | Gemini CLI | `GEMINI.md`（引用 AGENTS.md） | `.agents/skills/` |
  | 其他工具（Trae、Kiro、Windsurf 等） | 大多会读 `AGENTS.md` | 不一定 |

  不认 skill 目录的工具也能用：`AGENTS.md` 里写了「做 PPT 前先读 `.agents/skills/ppt-generate/SKILL.md` 照做」。万一某个工具连 AGENTS.md 都不读，就跟它说一句「先读 AGENTS.md」。
- 想要 AI 配图：安装时 AI 会问你要接口地址和 key；不要的话就用模板原图。
- 想用自己的照片：把照片放进 `projects/<项目名>/photos/`（可以有子文件夹，放多少张都行），或者直接告诉 AI 照片在哪个文件夹。AI 会看过每张照片，按内容和横竖分配到合适的页面；没分到照片的图框自动补图。
- 用 claude.ai 网页版或 Claude 桌面 App：把这个文件夹连接到对话，或者上传它的 zip，说「帮我安装」，AI 会教你把 skill 存进账号。
- 版权：代码和 skill 按 [MIT 协议](LICENSE) 开源。`morimoto`、`tech-hud`、`party-red`、`ink-heritage` 四个模板 `assets/` 里的图片来自网络模板，版权归原作者，仅供学习交流，请勿商用，如有侵权请提 issue 删除。`watercolor` 的图片全部由 AI 生成，可以自由使用。

### 现有模板

| 模板 | 色调 | 风格 | 适合 |
|---|---|---|---|
| 雾紫杂志 `morimoto` | 深色 | 文艺、简洁、杂志 | 人文、生活方式、观点分享、品牌介绍 |
| 深蓝科技 `tech-hud` | 深色 | 科技、未来、商务 | 项目路演、创业大赛、科技产品、AI |
| 党政红 `party-red` | 浅色 | 商务、专业、中国风 | 工作汇报、年终总结、述职、党建、政务 |
| 墨韵国风 `ink-heritage` | 深色 | 中国风、文艺、复古 | 传统文化、博物馆、诗词、非遗、文旅 |
| 蓝驼水彩 `watercolor` | 浅色 | 商务、简洁、清新 | 工作汇报、工作总结、述职、项目复盘、市场分析 |

新模板：上传一个 .pptx，说「用 ppt-template-intake 把这个模板做进库」。

---

# PPT Template Library · Multi-template PPT generation system

Enter a topic / copy → choose a template (3-choose-1) → automatically generate the full PPT (images, page transitions, entrance animations, automatic QA).
Content (`deck.json`) and templates are kept separate: the same content can be redrawn with any template.

```
├── core/                 shared engine
│   ├── render.js         render entry point: deck.json → .pptx (images → transitions → animation → QA → report)
│   ├── engine.js         render context ctx (APIs a template uses while drawing)
│   ├── spec.js           machine-readable version of the template standard (page types, slots, word limits)
│   ├── validate-deck.js  validate deck.json
│   ├── qa.js / textfit.js automatic QA (overflow, single-character line drops, overlap, out of bounds, font size, contrast)
│   ├── preview.js        thumbnails + overview image, PDF export (requires LibreOffice)
│   ├── select.js         3-choose-1: score templates on style + topic, spread across tones
│   ├── card.js           preview cards (cover rendered live with the user's title)
│   ├── selftest.js       template intake self-test
│   ├── images.js / gen_image.js   images: gpt-image-2 / Pexels / template originals / placeholders
│   ├── transitions.js    20 page transitions (seeded randomness)
│   └── animations.js     entrance animations
├── templates/
│   ├── morimoto/         Mist Purple Magazine (dark · literary / magazine)
│   ├── tech-hud/         Deep Blue Tech (dark · sci-fi HUD style for pitches and competitions)
│   ├── party-red/        Party Red (light · blue sky, red silk ribbons, work reports)
│   └── ink-heritage/     Ink Heritage (dark · black + dusty-rose Song-typeface giant characters, Chinese culture / museums)
├── fixtures/test_deck.json   standard test copy (used by the self-test)
├── projects/             one folder per PPT (deck.json + out/ + generated/)
├── tools/pptx_extract.py  for template intake: cuts gradient vector decorations out of the original template as transparent PNGs
├── TEMPLATE_SPEC.md      template standard
├── .agents/skills/       the project's skills (read by Codex): ppt-generate (make a PPT), ppt-template-intake (add a template to the library)
├── .claude/skills/       same as above (read by Claude Code; synced via npm run sync-skills)
├── install.js            first-time setup (dependencies + self-test)
├── AGENTS.md             instructions for the AI (universal); CLAUDE.md / GEMINI.md just reference it
└── .env                  image API (Base URL / apikey / Model) — don't share it
```

## Install

```bash
node install.js          # dependencies + self-test; or just let the AI do it: say "帮我安装"
```
For previews / PDF you also need LibreOffice (`soffice`) and poppler (`pdftoppm`); without them generating the .pptx still works.

## Common commands

```bash
# Render (in the project folder: projects/<name>/deck.json)
node core/render.js projects/demo/deck.json
node core/render.js projects/demo/deck.json --images ai          # AI images (reads .env)
node core/render.js projects/demo/deck.json --images template    # template originals (no network, free)
node core/render.js projects/demo/deck.json --animation click    # click to reveal / off to disable
node core/render.js projects/demo/deck.json --template other-id  # switch template, content unchanged
node core/render.js projects/demo/deck.json --preview --pdf      # also produce the overview image and PDF

# Validate content only
node core/validate-deck.js projects/demo/deck.json

# Pick templates / preview cards
node core/select.js --style 文艺,简洁 --topic "城市慢生活"
node core/card.js --ids morimoto,xxx,yyy --title "你的标题" --out cards.jpg

# Template intake self-test
node core/selftest.js morimoto

# Generate a single image on its own
node core/gen_image.js "海边的灯塔，黄昏" 1536x1024
```

Windows PowerShell works the same way, e.g. `node core\render.js projects\demo\deck.json --images ai`.

## Images

- `.env` (root directory): `Base URL=http://localhost:8317/v1`, `apikey=…`, `Model=gpt-image-2` (case and spaces don't matter).
- Images are cached in the project's `generated/` by "prompt + aspect ratio": when you edit content, only images whose prompts changed are regenerated. Use `IMAGE_REFRESH=1` to regenerate everything.
- When an image fails it falls back to the template's original image automatically; see `failedImages` in report.json.
- A local relay (localhost) can only be reached from your own computer: AI images must be generated by running render on your computer.

## Changing content

Everything is driven by deck.json: edit a page's text / change `layout` / edit `image.prompt` / add, remove or reorder `slides`, then run render again.
Transitions and animations stay the same as long as the seeds in `settings` don't change; delete a seed to reshuffle.
