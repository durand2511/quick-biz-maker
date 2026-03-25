import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREATE_SYSTEM_PROMPT = `You are an expert web app generator. Given a user's description, you generate a complete, self-contained HTML page with inline CSS and JavaScript.

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
- Buttons, forms, navigation, downloads and interactive elements must actually work in the browser with front-end JavaScript.

FOR BOOKING/RESERVATION APPS:
- Include a date picker, time slots, and a form with name/email/phone fields.
- Show a confirmation modal after booking.

FOR CONTACT FORMS:
- Include name, email, phone, subject, and message fields.
- Show validation errors and success feedback.

IMPORTANT: Your entire response must be ONLY valid HTML starting with <!DOCTYPE html>. Nothing else.`;

const UPDATE_SYSTEM_PROMPT = `You are a surgical code editor. You receive an existing HTML app and a change request. Your job is to make the MINIMUM changes needed to satisfy the request.

CRITICAL RULES:
- You MUST return the FULL HTML document (starting with <!DOCTYPE html>), but with ONLY the requested parts changed.
- DO NOT rewrite sections that are not related to the request.
- DO NOT change styling, colors, fonts, layout, or structure unless the user explicitly asked for it.
- DO NOT change text content unless the user explicitly asked for it.
- DO NOT reorganize or reformat the code.
- Preserve ALL existing JavaScript functionality, event listeners, animations, and interactivity.
- Preserve ALL existing CSS classes, inline styles, and Tailwind classes.
- Preserve ALL existing sections, elements, and structure.
- Keep the same variable names, function names, and IDs.
- If the user asks to ADD something, insert it in the appropriate location without touching anything else.
- If the user asks to CHANGE something, change ONLY that specific element/section.
- If the user asks to REMOVE something, remove ONLY that specific element/section.
- If the user asks to FIX something, fix ONLY the broken part.
- All text content should be in Dutch (Netherlands).

THINK OF IT AS A DIFF: What is the smallest possible change to the existing code that satisfies the user's request? Make exactly that change and nothing more.

IMPORTANT: Your entire response must be ONLY valid HTML starting with <!DOCTYPE html>. Nothing else.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentHtml } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isUpdate = !!currentHtml;
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: isUpdate ? UPDATE_SYSTEM_PROMPT : CREATE_SYSTEM_PROMPT },
    ];

    if (isUpdate) {
      aiMessages.push({
        role: "user",
        content: `Here is my current app code:\n\n${currentHtml}`,
      });
      aiMessages.push({
        role: "assistant",
        content: "I have your current app memorized. Tell me what to change and I will make only that change.",
      });
    }

    for (const msg of messages) {
      aiMessages.push({ role: msg.role, content: msg.content });
    }

    // Use faster model for updates, full model for new apps
    const model = currentHtml ? "google/gemini-2.5-flash" : "openai/gpt-5.2";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
