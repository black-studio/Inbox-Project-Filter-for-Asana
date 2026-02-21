# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome Manifest V3 extension that adds project filtering to the Asana Inbox. Operates entirely client-side via DOM manipulation — no API access, no build system, no dependencies.

## Architecture

**background.js** — Service worker that listens for `chrome.webNavigation.onCompleted` on `https://app.asana.com/*` and re-injects `content.js` on SPA navigation (main frame only).

**content.js** — Main logic, wrapped in an IIFE. Injects filter UI (dropdown + refresh button) into Asana's toolbar and uses MutationObservers to reactively filter inbox threads by project.

### DOM Observation Strategy

Three-layer approach to handle Asana's SPA:
1. **Body observer** — watches for route changes and major DOM updates, triggers `debouncedCheckAndAddFilter` (300ms debounce)
2. **InboxFeed observer** (`archiveObserverInstance`) — watches for task list mutations (archive, add, class changes), triggers `updateProjectList` + `filterTasks` (500ms debounce)
3. **Retry loop** (`tryObserveInboxFeed`) — polls every 500ms up to `MAX_RETRIES` (40) to find the InboxFeed element, since Asana renders it asynchronously

### Selector Resilience

Multiple fallback selectors handle Asana's evolving class names:
- Project tags: `.InboxIconAndNameContext-name--withDefaultColors` → `[class*="InboxIconAndNameContext-name"]`
- Toolbar injection: `.GlobalTopbarStructure-middleChildren` → `.GlobalTopbarStructure-search`
- Feed container: `.InboxFeed` → parent element of `.InboxExpandableThread`

### Filter Logic (`threadBelongsToProject`)

- Threads with explicit project tags: exact match against tag text
- Threads without tags (e.g. AI summaries): checked via `InboxLinkifiedThreadTitle-link` title content (configurable — see commented alternatives in the function)
- No project selected: all threads visible

### Key Functions

| Function | Purpose |
|---|---|
| `createProjectFilter()` | Builds the dropdown + refresh button DOM elements |
| `addProjectFilter()` | Injects UI into Asana toolbar, idempotent |
| `updateProjectList()` | Scans threads for project names, preserves current selection |
| `filterTasks()` | Shows/hides threads based on selected project |
| `threadBelongsToProject()` | Core matching logic per thread |
| `tryObserveInboxFeed()` | Retry loop to attach InboxFeed MutationObserver |
| `observeDOM()` | Sets up body observer + history API event listeners |

## Development

No build step, no package manager, no tests. Pure vanilla JS.

### Loading the Extension

1. `chrome://extensions/` → Enable Developer mode → Load unpacked → Select this directory
2. Navigate to `https://app.asana.com/` → open Inbox
3. After code changes: click the refresh icon on `chrome://extensions/` and reload the Asana tab

### Debugging

All logs use `[InboxFilter]` prefix. Key patterns:
- `Script executing - top level` — script initialized
- `tryObserveInboxFeed: Inbox feed FOUND` — observer attached
- `filterTasks: Filtering for "X"` — filter applied with thread counts
- `Max retries (40) reached` — InboxFeed element never appeared

### Making Changes

**Updating selectors** — If Asana changes class names, update in these functions:
- `updateProjectList()` and `threadBelongsToProject()` — project tag selectors
- `addProjectFilter()` — toolbar selector
- `tryObserveInboxFeed()` — feed container selector

**Adjusting timing** — `MAX_RETRIES` controls feed detection timeout (40 × 500ms = 20s). Debounce delays are in `debouncedCheckAndAddFilter` (300ms) and the InboxFeed observer callback (500ms).

**CSS** — All styles injected via `GM_addStyle` polyfill at top of content.js, with `!important` auto-appended to all declarations.

## Manifest Configuration

Version 1.2, Manifest V3. Content script injected via both `content_scripts` in manifest (initial load) and `background.js` service worker (SPA navigation). Permissions: `activeTab`, `webNavigation`, `scripting`. Host: `https://app.asana.com/*` only.
