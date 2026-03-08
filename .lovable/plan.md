

## Plan: Improve JoinScreen UX for room conflicts

### Problem
1. When a room already has active users (no password), the room code input doesn't visually indicate the conflict — user just gets a toast.
2. When a user tries to password-protect a room that's already password-protected, the UI silently switches to the password entry box without explaining why.

### Changes (single file: `src/components/JoinScreen.tsx`)

**1. Add red ring to room code input when room is taken**
- Add a `roomTaken` state (`boolean`).
- When the user tries to set a password on an active room (the `hasActiveUsers` branch, line 102), set `roomTaken = true` in addition to the existing toast.
- Apply a conditional `ring-2 ring-destructive` class to the room code input when `roomTaken` is true.
- Clear `roomTaken` when the user changes the room code value.

**2. Toast explaining the switch to password entry for already-locked rooms**
- In the `roomAlreadyHasPassword && !needsPassword` branch (line 66), add a toast:
  ```
  toast.info('ROOM IS LOCKED', {
    description: 'This room is password-protected. Enter the password to join.',
  })
  ```
- This fires right before switching to the password input, so the user knows why the UI changed.

**3. Clear roomTaken on room code change**
- In the `onChange` handler for `roomName` (line 204), also reset `roomTaken` to false.

### No new pages needed
Splitting into separate create/join pages would be a large UX change. The current single-form approach works well — we just need better visual feedback, which this plan delivers.

