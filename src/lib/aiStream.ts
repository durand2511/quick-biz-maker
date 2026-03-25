const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const GENERATE_URL = `${SUPABASE_URL}/functions/v1/generate-app`;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat-ai`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  title?: string; // Card title for assistant build messages
}

/** Call the conversational AI to understand intent and respond naturally */
export async function chatWithAI({
  messages,
  hasExistingApp,
}: {
  messages: ChatMessage[];
  hasExistingApp: boolean;
}): Promise<{ message: string; shouldBuild: boolean }> {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, hasExistingApp }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Chat failed" }));
    throw new Error(data.error || `Error ${resp.status}`);
  }

  return resp.json();
}

/** Stream HTML generation from the AI */
export async function streamGenerateApp({
  messages,
  currentHtml,
  onDelta,
  onDone,
  onError,
}: {
  messages: ChatMessage[];
  currentHtml: string | null;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const resp = await fetch(GENERATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, currentHtml }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Generation failed" }));
    onError(data.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError("No response body");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        onDone();
        return;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  if (buffer.trim()) {
    for (let raw of buffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
