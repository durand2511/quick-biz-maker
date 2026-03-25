import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert web app generator. Given a user's description, you generate a complete, self-contained HTML page with inline CSS and JavaScript.

RULES:
- Output ONLY valid HTML. No markdown, no code fences, no explanations, no comments before <!DOCTYPE html>.
- The HTML must be a complete document with <!DOCTYPE html>, <html>, <head>, <body>.
- Use modern, clean design with a sans-serif font (Inter from Google Fonts).
- Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>) for styling.
- Make the app fully mobile-responsive.
- Include realistic, professional placeholder content relevant to the business.
- For forms, use proper form validation and onsubmit="event.preventDefault(); alert('Formulier verstuurd!')" for demo purposes.
- Use a professional color scheme appropriate to the business type.
- Include smooth CSS transitions and hover effects.
- Generate complete, working interactive elements (tabs, modals, forms, navigation).
- Add a sticky navigation bar with working mobile hamburger menu.
- Include hero section, about section, services/features, contact form, and footer.
- Use Font Awesome icons via CDN for visual appeal.
- All text content should be in Dutch (Netherlands).
- Make sure ALL links and buttons work (smooth scroll to sections, toggle menus, etc.).
- Include proper meta tags for SEO.
- The page should look like a real, professional website — not a template.
- Every response must directly satisfy the user's latest request. If they ask for a change, actually modify the app instead of repeating the old version.
- Keep existing content when editing, unless the user's request implies replacing it.
- Preserve working features from the current HTML and only change what is needed.
- If the user asks for functional behavior, include real front-end JavaScript for it in the returned HTML.
- If currentHtml is provided, the latest user message is the highest-priority instruction and you must make a real visible or functional change that matches it.
- Never return the same document unchanged unless the latest user request truly requires no modification.
- When the user asks to fix something, repair the existing implementation instead of only rephrasing text or repeating previous code.
- Buttons, forms, navigation, downloads and interactive elements must actually work in the browser with front-end JavaScript.

FOR BOOKING/RESERVATION APPS:
- Include a date picker, time slots, and a form with name/email/phone fields.
- Show a confirmation modal after booking.

FOR CONTACT FORMS:
- Include name, email, phone, subject, and message fields.
- Show validation errors and success feedback.

WHEN THE USER ASKS TO MODIFY AN EXISTING APP:
- You will receive the current HTML as context.
- Apply ONLY the requested changes while keeping everything else intact.
- Return the FULL updated HTML document.
- Treat the latest user message as the highest-priority instruction.

IMPORTANT: Your entire response must be ONLY valid HTML starting with <!DOCTYPE html>. Nothing else.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentHtml } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (currentHtml) {
      aiMessages.push({
        role: "system",
        content: `The user's current app HTML is:\n\n${currentHtml}\n\nApply the user's requested changes to this HTML. Return the complete updated HTML.`,
      });
    }

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
        model: "openai/gpt-5.2",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken. Probeer het over een moment opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-tegoed op. Voeg tegoed toe in Instellingen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-generatie mislukt" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-app error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
