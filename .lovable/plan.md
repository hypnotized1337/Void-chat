## Plan: Global Ginger Mode (Irish Theme)

We will add a "Ginger Mode" toggle to the `/admin` panel that acts as a room-wide gag. When an admin activates it, the theme changes to an Irish/ginger color palette (dark green and ginger orange) for **everyone currently in the chat room**. 

### 1. CSS Theme Setup (`src/index.css`)

- Add a `.ginger-theme` class in `@layer base` that overrides the default monochromatic variables with an Irish/ginger palette:
  - Deep forest green backgrounds (`--background`, `--card`, `--input`)
  - Ginger orange foregrounds/borders (`--foreground`, `--border`, `--ring`, `--primary`)
  - Thematically appropriate muted colors for chat bubbles.

### 2. State & Types (`src/types/chat.ts` & `src/hooks/use-chat.ts`)

- **Types**: Add `gingerMode: boolean` to the `ChatState` interface.
- **Hook**: 
  - Update `DEFAULT_ROOM_STATE` to initialize `gingerMode: false`.
  - Add a new Zod schema `GingerSchema = z.object({ enabled: z.boolean() })`.
  - Add a Supabase channel listener for the `ginger` broadcast event to update local state.
  - Expose a `toggleGingerMode` function that flips the state and broadcasts the `ginger` event to all other clients in the room.

### 3. Applying the Theme (`src/pages/Index.tsx`)

- Extract `toggleGingerMode` from `useChat()`.
- Add a `useEffect` hook that listens to `state.gingerMode`. When true, it adds `.ginger-theme` to `document.documentElement.classList`; when false, it removes it. This automatically applies the CSS variables.
- Pass `gingerMode={state.gingerMode}` and `onToggleGinger={toggleGingerMode}` down to the `AdminPanel` component.

### 4. Admin Panel UI (`src/components/AdminPanel.tsx`)

- Update `AdminPanelProps` to accept the new `gingerMode` state and `onToggleGinger` handler.
- Import the `Clover` icon from `lucide-react`.
- Add a new button in the main admin menu (next to Nuke Room and Freeze Chat) that says "Enable Ginger Mode" / "Disable Ginger Mode" and triggers the toggle.

&nbsp;

Also make it so that it starts raining clovers

&nbsp;

This approach ensures the feature matches existing admin tools (like Freeze Chat) by broadcasting the gag to the entire room simultaneously.