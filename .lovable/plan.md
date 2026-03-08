

## Code Cleanup and Optimization Plan

After reviewing the entire codebase, the code is generally well-structured. Here are the concrete optimizations worth making:

### 1. `use-chat.ts` — Extract repeated state reset pattern
The "reset to default state" object is duplicated 4 times (kick handler, duplicate check, leaveRoom, initial state). Extract it into a `DEFAULT_STATE` constant.

### 2. `use-chat.ts` — Consolidate duplicate broadcast handlers
The `system` and `announcement` handlers (lines 271-281) are nearly identical — both parse with `ChatMessageSchema` and append to messages. Merge into a shared handler.

### 3. `use-chat.ts` — Replace closure-captured `state.roomCode` with a ref
The notification handler on line 255 captures `state.roomCode` from the closure, which could be stale. Use a ref instead (same pattern as `usernameRef`).

### 4. `ChatArea.tsx` — Memoize stable callback props
`setFullscreenImage`, `setInspectedFile`, `setReplyingTo`, and `setEditText` are stable setState functions already, but `handleStartEdit` and `handleEditSubmit` are recreated. These are already wrapped in `useCallback` — good. No change needed here.

### 5. `ChatArea.tsx` — Deduplicate `oldIdx` calculation
In the `useEffect` for new messages (lines 129-156), `oldIdx` is computed twice identically. Compute it once.

### 6. `MessageBubble.tsx` — Move `renderMessageText` and `URL_RE` outside component
Already outside — good. But `URL_RE` uses `lastIndex` mutation which is a subtle bug risk with `exec`. Reset `lastIndex` is already done (line 64) — this is fine.

### 7. `JoinScreen.tsx` — Deduplicate "ROOM NOT FOUND" toast logic
Lines 139-145 and 149-155 are identical error handling. Extract into a helper.

### 8. `use-tick.ts` — Global interval runs even when no subscribers
The global `setInterval` runs forever even with zero listeners. Add start/stop logic.

### 9. `FullscreenImageViewer.tsx` — Unnecessary `AnimatePresence` wrapper
The component wraps itself in `AnimatePresence` but it's rendered conditionally from the parent. The parent in `ChatArea` doesn't wrap it in `AnimatePresence` either, so exit animations won't work regardless. Remove the internal one since it's a no-op.

### 10. General — Remove unused imports
Scan for unused imports across files (e.g. `forwardRef` in `SelfDestructTimer` is used, but worth double-checking all files).

---

### Summary of changes by file:

| File | Changes |
|------|---------|
| `src/hooks/use-chat.ts` | Extract `DEFAULT_STATE`, merge system/announcement handlers, add `roomCodeRef` |
| `src/hooks/use-tick.ts` | Lazy start/stop global interval based on subscriber count |
| `src/components/ChatArea.tsx` | Deduplicate `oldIdx` in new-message effect |
| `src/components/JoinScreen.tsx` | Extract shared "room not found" error helper |
| `src/components/FullscreenImageViewer.tsx` | Remove unnecessary `AnimatePresence` wrapper |

All changes are refactors — no behavior changes, no new features.

