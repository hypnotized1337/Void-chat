

## Problem

When user A creates a room **without** password protection and is active in it, user B can join with the password toggle ON and it lets them set a password — overriding the creator's intent.

**Root cause**: The presence check uses channel `peek:${roomName}` but the actual chat room uses channel `room:${roomName}`. These are separate Realtime channels, so the peek always sees 0 users and assumes the room is empty.

## Fix

**In `src/components/JoinScreen.tsx` (line 87):**

Change the peek channel name from:
```
supabase.channel(`peek:${roomName.trim()}`)
```
to:
```
supabase.channel(`room:${roomName.trim()}`)
```

This makes the peek subscribe to the **same** presence channel that active chat users are on, so it correctly detects existing users and blocks password setting.

**Note**: After subscribing to check presence, we still call `supabase.removeChannel(channel)` immediately, so the joiner doesn't linger on the channel before actually joining the room through the normal flow.

## Files Changed
- `src/components/JoinScreen.tsx` — one line change (channel name)

