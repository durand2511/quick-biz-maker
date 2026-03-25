

## Plan: Hard Session Isolation via Session ID Key

**Problem**: Despite resetting state variables, React components (ChatMessages, ChatInput, LivePreview) retain internal state (scroll position, textarea content, queued messages, etc.) because they are never unmounted/remounted. The "new chat" only updates props but doesn't destroy old component instances.

**Solution**: Introduce a `sessionId` state that changes on every new chat. Use it as a React `key` on the entire editor panel, forcing React to completely destroy and recreate all child components.

### Changes

**File: `src/pages/Index.tsx`**

1. Add a `sessionId` state initialized with `crypto.randomUUID()`
2. In `resetProjectState`, also reset `sessionId` to a new UUID
3. Wrap the entire editor `<>...</>` fragment in a `<div key={sessionId}>` so every new session destroys and recreates all editor components (ChatMessages, ChatInput, LivePreview)
4. Update `INIT_STAGES` to match requested UX text:
   - "Starting fresh session..."
   - "⏳ Clearing previous data"
   - "⏳ Creating new environment"
   - "⏳ Ready"
5. Also abort any in-flight streaming/loading when resetting (call `abortControllerRef.current?.abort()`, reset `isLoading`/`isStreaming`, stop loading cycle)
6. Remove the separate `previewKey` state since the `sessionId` key on the parent already forces LivePreview remount

This ensures every new chat creates entirely new component instances with zero carried-over internal state.

