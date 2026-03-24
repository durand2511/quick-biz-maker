import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert web app generator. Given a user's description, you generate a complete, self-contained HTML page with inline CSS and JavaScript.

RULES:
- Output ONLY valid HTML. No markdown, no code fences, no explanations.
- The HTML must be a complete document with <!DOCTYPE html>, <html>, <head>, <body>.
- Use modern, clean design with a sans-serif font (Inter from Google Fonts).
- Use Tailwind CSS via CDN for styling.
- Make the app mobile-responsive.
- Include realistic placeholder content relevant to the business.
- For forms, use onsubmit="event.preventDefault(); alert('Submitted!')" for demo purposes.
- Use a professional color scheme (sky blue primary #0ea5e9, slate grays).
- Include smooth transitions and hover effects.
- Add a sticky navigation bar, hero section, and footer.
- Generate complete, working interactive elements (tabs, modals, forms).

WHEN THE USER ASKS TO MODIFY AN EXISTING APP:
- You will receive the current HTML as context.
- Apply ONLY the requested changes while keeping everything else intact.
- Return the FULL updated HTML document.

IMPORTANT: Your entire response must be valid HTML. Nothing else.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentHtml } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build the messages array for the AI
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // If there's existing HTML, include it as context
    if (currentHtml) {
      aiMessages.push({
        role: "system",
        content: `The user's current app HTML is:\n\n${currentHtml}\n\nApply the user's requested changes to this HTML. Return the complete updated HTML.`,
      });
    }

    // Add conversation messages
    for (const msg of messages) {
      aiMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-app error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
