# Dark Mode Plan

## Objective

Turn dark mode from a page-by-page collection of `dark:` overrides into a consistent product system that feels intentional across shell, cards, charts, forms, and analytics screens.

## Design Principles

1. Use one semantic theme language across the app instead of repeated hard-coded colors.
2. Keep charts readable in both modes, especially tooltip and axis contrast.
3. Preserve the Thai-first product tone and financial-dashboard clarity rather than making the interface look overly gamified.
4. Default to system theme, while allowing users to force light or dark interactively.

## Implemented Foundation

### Theme tokens

- Added light and dark semantic CSS variables in [`src/app/globals.css`](/Users/woraweechanlongrat/Documents/projects/meowsliver-clean/src/app/globals.css)
- Centralized application background, surface, border, text, overlay, scrollbar, and chart colors
- Added themed selection, layered background gradients, and shared tooltip variables

### Theme runtime

- Updated [`src/components/layout/ThemeProvider.tsx`](/Users/woraweechanlongrat/Documents/projects/meowsliver-clean/src/components/layout/ThemeProvider.tsx) to use:
  - `defaultTheme="system"`
  - `enableSystem`
  - `disableTransitionOnChange`
- Updated the top-bar toggle to use `resolvedTheme`, so the toggle behaves correctly when the system theme is active

### Shared UI surfaces

- Updated shell, sidebar, top bar, cards, buttons, year picker, empty states, and manual-entry modal to consume semantic theme tokens
- Added shared chart theme helpers in [`src/lib/chart-theme.ts`](/Users/woraweechanlongrat/Documents/projects/meowsliver-clean/src/lib/chart-theme.ts)
- Rolled tokenized chart styling into cashflow, reports, investments, asset allocation, and savings-goal charts

## What This Solves

- Reduces visual drift between pages
- Makes dark mode maintainable as new features ship
- Avoids hard-coded tooltip and chart colors that previously assumed dark mode only
- Makes the product acceptable for live demos, screenshots, and long-form usage in both themes

## Remaining Polish Opportunities

1. Add explicit visual regression screenshots for light and dark mode on the main routes.
2. Add richer theme-aware empty/loading skeletons for import and savings-goal detail pages.
3. Review mobile contrast and spacing on long tables in dark mode.
4. Consider introducing a compact theme utility layer if the codebase grows beyond current scope.
