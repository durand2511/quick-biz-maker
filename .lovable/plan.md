
## Problem

The textarea auto-resize sets `height: auto` → `height: scrollHeight` via `useEffect`, but:
1. `useEffect` runs after paint, causing visual flicker
2. The wrapper div has no explicit height — it relies on natural flow, so `transition-[height]` on the wrapper does nothing (CSS transitions need explicit height values)

## Solution

Use `useLayoutEffect` (runs before paint) and explicitly set both the textarea height AND the wrapper div height so the CSS transition actually animates.

### Changes to `src/components/ChatInput.tsx`:

1. **Add a ref for the wrapper div** (`wrapRef`)
2. **Replace `useEffect` with `useLayoutEffect`** for the resize logic
3. **Explicitly set wrapper height** based on textarea `scrollHeight` + padding (for the buttons row ~40px)
4. **Add `onInput` handler** on textarea to also trigger resize immediately
5. **Set wrapper to `overflow-hidden`** and `transition-[height] duration-200 ease-out`

```tsx
const wrapRef = useRef<HTMLDivElement>(null);

useLayoutEffect(() => {
  const el = textareaRef.current;
  const wrap = wrapRef.current;
  if (!el || !wrap) return;
  el.style.height = "0px";
  const h = Math.min(el.scrollHeight, 400);
  el.style.height = `${h}px`;
  // 48px accounts for the button row + padding
  wrap.style.height = `${h + 48}px`;
}, [input]);
```

The wrapper div gets `ref={wrapRef}` and `transition-[height] duration-200 ease-out overflow-hidden`.

This is a single-file change to `ChatInput.tsx`.
