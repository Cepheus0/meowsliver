# DESIGN.md — เหมียวเงิน (meowsliver)

> Thai personal finance dashboard — Next.js 16 · React 19 · Tailwind 4 · Recharts

---

## 1. Visual Theme

**Name**: Warm Editorial
**Inspired by**: Cursor design system (getdesign.md/cursor/design-md)
**Direction**: Warm cream canvas with an orange brand accent. Editorial yet technical.
Light-first. Finance data presented through careful typographic hierarchy rather than
decoration. Every component feels handcrafted — warm borders, restrained orange, and
Cursor's own semantic green/red for income/expense.

The UI communicates warmth and precision at the same time:

- **Orange #f54e00** → UI chrome: active nav inset, CTA buttons, focus rings, links
- **Cursor Green #1f8a65** → income, positive delta, savings progress
- **Cursor Red #cf2d56** → expense, negative delta, debt
- **Cursor Gold #c08532** → neutral delta, pending, warnings
- **Warm stone #8c8a84** → derived/calculated metrics (net line, chart axes)

White cards lift off a warm cream page background. Warm oklab-style borders.
Plus Jakarta Sans as the UI typeface. Geist Mono for all financial figures.

**Mode default**: Light. Dark mode supported via `.dark` class (warm dark browns —
not cold zinc).

---

## 2. Color Palette

### Base (light)
| Token | Value | Usage |
|---|---|---|
| `--app-bg` | `#f2f1ed` | Page background (Cursor Surface 200) |
| `--app-bg-elevated` | `#f7f7f4` | Sidebar, topbar, panels |
| `--app-surface` | `#ffffff` | Card fill — lifts off cream bg |
| `--app-surface-soft` | `#ebeae5` | Inner tabs, tag backgrounds |
| `--app-border` | `#e1e0db` | All card/input borders (warm) |
| `--app-text` | `#26251e` | Body text (Cursor dark brown) |
| `--app-text-muted` | `#5c5950` | Labels, secondary text |
| `--app-text-subtle` | `#96917f` | Hints, timestamps |

### Brand Accent — Cursor Orange
| Token | Value |
|---|---|
| `--app-brand-text` | `#c23500` (light mode — for text AA contrast on cream) |
| `--app-brand-soft` | `rgba(245, 78, 0, 0.07)` |
| `--app-brand-soft-strong` | `rgba(245, 78, 0, 0.13)` |
| Raw orange for buttons/FAB | `#f54e00` |
| Hover | `#d44400` |

### Finance Semantic (Cursor palette)
| Token | Light | Dark | Meaning |
|---|---|---|---|
| `--income` | `#1f8a65` | `#2aab80` | Income bars, positive indicators |
| `--expense` | `#cf2d56` | `#e8426a` | Expense bars, negative indicators |
| `--neutral` | `#c08532` | `#e0a030` | Cursor gold — pending/warnings |

### Dark mode base
| Token | Value |
|---|---|
| `--app-bg` | `#1a1916` (warm dark, not zinc) |
| `--app-surface` | `#221f1b` |
| `--app-border` | `#3d3930` |
| `--app-text` | `#f0ede8` (warm off-white) |

---

## 3. Typography

| Role | Font | Variable | Usage |
|---|---|---|---|
| UI body | Plus Jakarta Sans 400/500/600/700 | `--font-jakarta` | All UI text |
| Numbers | Geist Mono | `--font-geist-mono` | All financial values, amounts |

**Font CSS variable**: `var(--font-jakarta)` (set in `layout.tsx`)

### Scale
| Name | Size | Weight | Usage |
|---|---|---|---|
| Page title | `text-xl` | `font-bold` | H1 equivalents |
| Section title | `text-base` | `font-semibold` | Card titles |
| Card label | `text-xs uppercase tracking-wide` | `font-medium` | Stat card labels |
| Body | `text-sm` | `font-normal` | Default prose |
| Caption | `text-xs` | `font-normal` | Timestamps, hints |
| Mono value | `text-xl` (stat), `text-sm` (table) | `font-semibold` / `font-medium` | Financial numbers |

---

## 4. Spacing & Layout

- **Base unit**: 4px (Tailwind spacing scale)
- **Card padding**: `p-5` (20px)
- **Section gap**: `gap-4` to `gap-6`
- **Sidebar width**: expanded `220px`, collapsed `52px`
- **TopBar height**: `52px`
- **Density**: compact — no gratuitous whitespace, data-forward

---

## 5. Border Radius

| Context | Radius | Tailwind |
|---|---|---|
| Cards, modals | 8px | `rounded-lg` |
| Buttons, inputs, dropdowns | 6px | `rounded-md` |
| Badges, tags | 4px | `rounded` |
| FAB | 9999px | `rounded-full` |
| Chart tooltips | 6px | (inline style) |

---

## 6. Components

### Card
- `rounded-lg border border-[--app-border] bg-[--app-surface] p-5`
- Warm border (`#e1e0db`) separates white card from cream page
- Card shadow: `0 1px 3px rgba(38,37,30,0.06)` — subtle warm tint

### Button (primary)
- `bg-[#f54e00] text-white hover:bg-[#d44400] rounded-md`
- Focus ring: `ring-orange-500/40`
- No `shadow-lg` — restrained elevation

### Sidebar nav (active)
- `bg-[--app-brand-soft] text-[--app-brand-text] shadow-[inset_3px_0_0_var(--app-brand-text)]`
- Orange left inset bar as the active indicator

### Input / Select focus
- `border-[#f54e00]` or `ring-orange-500/40`
- No emerald focus state anywhere

---

## 7. Iconography

- **Library**: Lucide React
- **Size**: 16px (sidebar nav), 18–20px (feature icons), 14px (inline)
- **No filled icons** — stroke-only

---

## 8. Chart Color Contract

**3-color semantic rule** — enforced in `src/lib/chart-theme.ts`:

```
Cursor Green  → income bars, positive cashflow    var(--income)
Cursor Red    → expense bars, negative cashflow   var(--expense)
Warm Stone    → net line, derived metrics         #8c8a84
```

**Category palette** (pie / allocation) — warm amber monochrome:
```
Slot 0: #7c2d12  (darkest — largest slice)
Slot 1: #9a3a16
Slot 2: #b84d22
Slot 3: #d9622f
Slot 4: #f07843
Slot 5: #f5a070
Slot 6: #f8c4a0
Slot 7: #fde4cc  (lightest — smallest slice)
```

**Rule**: NEVER use blue, purple, or teal for data. Orange brand = non-semantic UI only.

---

## 9. AI/LLM Guidance

When generating or editing components for meowsliver, follow these rules:

1. **Palette**: All colors via `var(--app-*)` tokens. Hardcode only `#f54e00`/`#d44400`
   for primary orange where CSS vars can't be used in Tailwind.
2. **Radius**: `rounded-lg` (cards), `rounded-md` (inputs/buttons), `rounded` (badges).
   Never use `rounded-xl`, `rounded-2xl`, or `rounded-3xl`.
3. **Finance colors**: Use `var(--income-text)`, `var(--expense-text)` in JSX classes.
   Hardcode `#1f8a65` / `#cf2d56` only in `SummaryCards.tsx` icon colors.
4. **Font**: UI text inherits `Plus Jakarta Sans` from `html { font-family }`.
   Numbers use `font-[family-name:var(--font-geist-mono)]` class.
5. **No emerald/violet Tailwind classes**: Replace with CSS var references or orange.
   Exception: income/expense semantic indicators may use `var(--income)` / `var(--expense)`.
6. **Dark mode**: Only via CSS custom property swaps. No `dark:` class overrides for
   colors if the token already handles it.
7. **Chart imports**: Always use `chartColors` from `@/lib/chart-theme`. Never set
   fill/stroke colors directly in chart components.
