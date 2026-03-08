

## Add "Create Room" / "Join Room" Tabs to JoinScreen

### Overview
Add a tab switcher below the v0id logo. Each tab tailors the form to its purpose:

- **Create Room**: Shows username, room code, password-protect toggle (with password field). Button says "create". On submit, checks if room already exists (has active users) — if so, shows error. Otherwise creates the room (optionally with password).
- **Join Room**: Shows username, room code. No password-protect toggle. Button says "join". On submit, checks if room has a password — if so, prompts for it. If room doesn't exist (no active users, no password), shows error "room not found".

### Changes (`src/components/JoinScreen.tsx`)

**1. Add `mode` state**
```typescript
const [mode, setMode] = useState<'create' | 'join'>('create');
```
Reset `error`, `roomTaken`, `needsPassword`, `joinPassword`, `passwordProtect`, `roomPassword` when switching tabs.

**2. Tab UI** — below the GlitchTitle, render two clickable tabs styled with the mono font theme:
```
[ create room ]  [ join room ]
```
Use simple buttons with bottom border highlight for the active tab. Keep it minimal — no Radix Tabs needed, just two styled buttons with conditional classes.

**3. Refactor `handleJoin` into two paths based on `mode`:**

**Create mode:**
1. Check if room has active users → if yes, set `roomTaken = true`, show error "ROOM ALREADY EXISTS"
2. Check if room has a stale password → delete it
3. If password-protect is on, set the password
4. Call `onJoin()`

**Join mode:**
1. Check if room has a password → if yes and no `joinPassword` yet, show `needsPassword` prompt
2. If password exists, verify it
3. Check if room has active users → if no users and no password, show error "ROOM NOT FOUND"
4. Call `onJoin()`

**4. Conditional UI rendering:**
- **Create tab**: show username, room code, password-protect toggle + password field. Button: "create". Hide the `needsPassword` section.
- **Join tab**: show username, room code. Show `needsPassword` section when triggered. Hide password-protect toggle entirely. Button: "join" or "unlock".

**5. Room code placeholder** changes per mode:
- Create: "choose a room code"
- Join: "enter room code"

### Files Changed
- `src/components/JoinScreen.tsx` — single file, add tabs and split logic

