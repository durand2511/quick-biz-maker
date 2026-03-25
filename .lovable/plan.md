

## Fix: Plan details styling in chat

The plan summary message that appears after approval currently renders with light gray `text-muted-foreground` styling, looking different from other assistant messages. It should use the same card-based style.

### Changes

**`src/components/ChatMessages.tsx`**
- Remove the special `isPlanMsg` branch that renders plan titles as small gray text
- Let plan-approved/rejected messages use the same `rounded-xl border bg-card p-3` card with `CheckCircle2` icon, just like other assistant messages
- Keep the `details` block but style it slightly more prominent (e.g. `text-sm text-foreground` instead of `text-xs text-muted-foreground`)

This is a single-file change affecting only the `AssistantMessage` component rendering logic.

