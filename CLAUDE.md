# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Manifest V3 extension that adds project filtering functionality to the Asana Inbox. It operates entirely client-side without requiring any API access, using DOM manipulation to inject UI elements and filter notifications by project.

## Architecture

### Core Components

**background.js** - Service worker that handles navigation events
- Listens for `chrome.webNavigation.onCompleted` events on `https://app.asana.com/*`
- Injects `content.js` into the page when navigation completes (main frame only)
- Handles script execution errors

**content.js** - Main filtering logic, runs in the context of Asana pages
- Wrapped in an IIFE to avoid polluting global scope
- Injects custom CSS styles using a `GM_addStyle` polyfill
- Creates and manages the filter UI (dropdown + refresh button)
- Implements MutationObserver-based reactive updates

### Key Architecture Patterns

**DOM Observation Strategy**: The extension uses a multi-layered observation approach to handle Asana's dynamic SPA:
1. Body-level observer watches for route changes and major DOM updates
2. InboxFeed-specific observer watches for task list mutations (archive, add, etc.)
3. Retry mechanism (`MAX_RETRIES = 40`) handles delayed DOM element availability
4. Debouncing (300ms for route changes, 500ms for feed updates) prevents excessive re-renders

**Selector Resilience**: Multiple fallback selectors handle Asana's evolving class names:
- Primary: `.InboxIconAndNameContext-name--withDefaultColors`
- Fallback: `[class*="InboxIconAndNameContext-name"]` (attribute substring match)
- Thread detection fallback: Uses parent element of `.InboxExpandableThread` if `.InboxFeed` is unavailable

**Filter Logic** (`threadBelongsToProject`):
- Threads with explicit project tags are matched against tag text
- Threads without project tags (e.g., AI summaries) are matched against title content
- When no project is selected, all threads are visible

## Development

### Testing the Extension

1. Load unpacked extension in Chrome:
   ```
   chrome://extensions/ → Enable Developer mode → Load unpacked → Select this directory
   ```

2. Navigate to `https://app.asana.com/` and open the Inbox to test filtering

3. Monitor console logs - all significant events are logged with `[InboxFilter]` prefix

### Debugging

The extension includes extensive logging. Key log patterns:
- `[InboxFilter] Script executing - top level` - Script initialization
- `[InboxFilter] tryObserveInboxFeed: Inbox feed FOUND` - Observer attachment success
- `[InboxFilter] [ISO timestamp] filterTasks: Filtering for "ProjectName"` - Filter execution
- `[InboxFilter] Max retries (40) reached` - Observer attachment failed

Check console when:
- Filter UI doesn't appear → Look for toolbar element warnings
- Filtering doesn't work → Check thread count and match logs
- Observer errors → Check for selector changes in Asana's DOM

### Making Changes

**Updating selectors**: If Asana changes their class names:
- Primary selectors are in `updateProjectList()` (lines 128-129) and `threadBelongsToProject()` (lines 165-167)
- Toolbar selector is in `addProjectFilter()` (line 101)
- Thread selector is used throughout: `.InboxExpandableThread`

**Modifying filter behavior**:
- `threadBelongsToProject()` (lines 160-187) controls visibility logic
- Line 182 has commented alternatives for handling threads without project tags

**Adjusting timing**:
- `MAX_RETRIES` at line 63 controls how long to wait for InboxFeed element (500ms × retries)
- Debounce delays at lines 263 (route changes) and 303 (feed updates)

## Manifest Configuration

Version: 1.2 (Manifest V3)
- Host permissions: `https://app.asana.com/*` only
- Required permissions: `activeTab`, `webNavigation`, `scripting`
- Content script automatically injected via manifest for initial page load
- Service worker re-injects on navigation (handles SPA route changes)

## Common Issues

**Filter doesn't appear**: Asana may have changed toolbar class names (`.GlobalTopbarStructure-middleChildren` or `.GlobalTopbarStructure-search`)

**Projects not detected**: Check if Asana changed project tag class names (search for `InboxIconAndNameContext-name`)

**Observer not attaching**: Check console for max retry warnings - selector for `.InboxFeed` may need updating
