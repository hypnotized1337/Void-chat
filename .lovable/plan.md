# Implementation Plan: 5 Priority Features

## 1. Anti-Spam Rate Limiting

**Where:** `src/hooks/use-chat.ts` → `sendMessage`  
**How:** Track timestamps of last 5 messages in a ref. If 5+ messages within 3 seconds, block send and inject a local system message: `[SYSTEM]: RATE LIMITED — SLOW DOWN`. No broadcast needed — purely client-side throttle. Also apply to `sendGif` and `sendImage`.

## 2. Message Replies

**Types:** Add `replyTo?: { id: string; username: string; text: string }` to `ChatMessage` in `src/types/chat.ts`. Add to Zod schema in `use-chat.ts`.  
**UI — ChatArea:** Add `replyingTo` state. hold left click on other users' messages gets a "Reply" option. When replying, show a small quoted preview bar above the input (username + truncated text) with an X to cancel.  
**UI — MessageBubble:** If `msg.replyTo` exists, render a small quoted block above the message text — thin left border, muted text, clickable to scroll to original.  
**Hook:** `sendMessage` accepts optional `replyTo` param, attaches it to the broadcast payload.

## 3. Admin User Kick

**Broadcast:** New `kick` event in `use-chat.ts` with schema `{ username: string }`. On receive, if `username` matches current user, call `leaveRoom()` and show a terminal alert.  
**Hook:** Add `kickUser(username: string)` function that broadcasts the kick event + a system message.  
**Admin Panel:** Add a "Kick User" button. Clicking opens a sub-view listing active users; clicking a username triggers kick.  
**Sidebar:** Pass `onKick` prop for admin context (or keep kick in admin panel only).  
**Index:** Wire `kickUser` to `AdminPanel`.

## 4. Self-Destruct Timer

**MessageBubble:** Calculate remaining time from `msg.timestamp` (10-min lifecycle). Display a `[MM:SS]` badge next to the timestamp using a 1-second interval timer.  
**Performance:** Use a single shared interval in `ChatArea` that ticks every second and passes `currentTime` as a prop to `MessageBubble`, avoiding per-message intervals. Memoize the formatted time.  
**Style:** Terminal monospace, muted foreground, fades to brighter as time runs low (< 2 min).

## 5. Emoji Reactions

**Types:** Add `reactions?: Record<string, string[]>` to `ChatMessage` (emoji → list of usernames).  
**Broadcast:** New `reaction` event: `{ messageId, emoji, username }`. Toggle logic — same user + same emoji removes it.  
**UI — MessageBubble:** Below the message bubble, render small reaction badges. Each badge shows emoji + count. Clicking an existing badge toggles your reaction.  
**Reaction Picker:** On double-tap or via context menu "React" option, show a minimal horizontal picker with curated set: `✓ ✗ ⚡ 👁 🔥`.  
**Hook:** Add `reactToMessage(messageId, emoji)` function.

## Files to Create/Edit


| File                                    | Changes                                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/types/chat.ts`                     | Add `replyTo`, `reactions` fields                                                              |
| `src/hooks/use-chat.ts`                 | Rate limiter, reply support, kick event, reaction event, `kickUser`/`reactToMessage` functions |
| `src/components/chat/MessageBubble.tsx` | Reply quote block, self-destruct timer, reaction badges, reaction picker, "Reply" context menu |
| `src/components/ChatArea.tsx`           | Reply-to preview bar, `replyingTo` state, `currentTime` ticker, pass new handlers              |
| `src/components/AdminPanel.tsx`         | Kick user sub-view with user list                                                              |
| `src/pages/Index.tsx`                   | Wire `kickUser`, `reactToMessage`, pass users to AdminPanel                                    |


No database changes needed — all features use existing Supabase Realtime broadcast.