# Playwright CLI Fallback

## Purpose

This repository now includes a local CLI-first browser automation fallback for situations where Codex Playwright MCP is unavailable or unstable on this machine.

The fallback is intended for:

- local browser smoke checks
- screenshot capture for UI review
- DOM snapshots for quick inspection
- simple click / fill actions during manual debugging

## Installed Commands

System-wide command on this machine:

```bash
playwright-fallback --help
```

Repository wrapper:

```bash
bun run pw -- --help
```

The repository wrapper defaults artifact output to:

```bash
output/playwright/
```

## Core Examples

Check that the local app loads and save a screenshot:

```bash
bun run pw -- check http://localhost:3000 --screenshot
```

Capture a screenshot explicitly:

```bash
bun run pw -- screenshot http://localhost:3000
```

Print a lightweight DOM snapshot:

```bash
bun run pw -- snapshot http://localhost:3000
```

Open a headed browser for visual inspection:

```bash
playwright-fallback open http://localhost:3000
```

Click an element using a CSS selector:

```bash
playwright-fallback click http://localhost:3000 --selector 'a[href="/import"]' --screenshot
```

Fill an input using a CSS selector:

```bash
playwright-fallback fill http://localhost:3000/login --selector 'input[name="email"]' --value 'user@example.com'
```

## Supported Commands

- `check`
- `screenshot`
- `snapshot`
- `open`
- `click`
- `fill`

## Notes

- The fallback uses `playwright-core` plus the locally installed Playwright Chromium browser cache.
- If the browser binary is missing, install it with:

```bash
npx playwright install chromium
```

- This fallback is not a drop-in replacement for the MCP browser tool protocol. It is the operational fallback for local CLI-driven browser checks on this machine.
