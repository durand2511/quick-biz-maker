import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREATE_SYSTEM_PROMPT = `You are an expert web app generator. Given a user's description, you generate a complete, self-contained HTML page with inline CSS and FULLY FUNCTIONAL JavaScript.

RULES:
- Output ONLY valid HTML. No markdown, no code fences, no explanations, no comments before <!DOCTYPE html>.
- The HTML must be a complete document with <!DOCTYPE html>, <html>, <head>, <body>.
- Use modern, clean design with a sans-serif font (Inter from Google Fonts).
- Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>) for styling.
- Make the app fully mobile-responsive.
- Include realistic, professional placeholder content relevant to the business.
- Use a professional color scheme appropriate to the business type.
- Include smooth CSS transitions and hover effects.
- Add a sticky navigation bar with working mobile hamburger menu.
- Include hero section, about section, services/features, contact form, and footer.
- Use Font Awesome icons via CDN for visual appeal.
- All text content should be in Dutch (Netherlands).
- Include proper meta tags for SEO.
- The page should look like a real, professional website — not a template.
- If the user mentions uploading an image, use the placeholder exactly as provided (e.g. {{USER_IMAGE_1}}, {{USER_IMAGE_2}}) as the src attribute for <img> tags. The placeholder will be replaced with the actual image data automatically. Example: <img src="{{USER_IMAGE_1}}" alt="Logo" class="h-12" />

CRITICAL — FUNCTIONALITY RULES (MUST FOLLOW):
- Every button MUST have a working onclick handler or event listener.
- Every form MUST have working JavaScript: capture input values, validate, and show feedback.
- Every navigation link MUST work (smooth scroll to sections, open modals, toggle menus).
- NO fake or placeholder JavaScript. All code must actually execute and produce visible results.
- Use vanilla JavaScript with proper state management via variables and DOM manipulation.

REQUIRED INTERACTIVE PATTERNS:
- Forms: Use addEventListener('submit', ...) or onsubmit. Read input values with .value. Show a styled success message div (not alert()) after submission. Reset the form after success.
- Mobile menu: Toggle visibility with a hamburger button. Close on link click.
- Modals: Open/close with JavaScript. Close on backdrop click and close button.
- Tabs/Accordions: Toggle content visibility. Update active state styling.
- Counters/Quantities: Increment/decrement buttons that update displayed values.

FOR BOOKING/RESERVATION APPS:
- Include a working date picker (HTML date input or custom), time slot selection (clickable buttons that highlight when selected), and a form with name/email/phone fields.
- All inputs must be validated before submission.
- Show a styled confirmation modal/message with the booking details after submission.
- Allow the user to dismiss the confirmation and make another booking.

FOR CONTACT FORMS:
- Include name, email, phone, subject, and message fields.
- Validate all required fields (show inline error messages for empty/invalid fields).
- Show a styled success notification after successful submission.
- Reset form fields after successful submission.

FOR E-COMMERCE / PRODUCT PAGES:
- Add to cart button must update a cart counter.
- Quantity selectors must work.
- Show cart summary when clicking cart icon.

FOR PORTFOLIO / GALLERY:
- Clicking images must open a lightbox/modal with larger view.
- Include navigation between images in the lightbox.
- Filter/category buttons must filter displayed items.

GENERAL INTERACTIVITY TEMPLATE — add this pattern for ALL forms:
\`\`\`
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Form handling
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      let isValid = true;
      // Validate required fields
      this.querySelectorAll('[required]').forEach(input => {
        if (!input.value.trim()) {
          isValid = false;
          input.classList.add('border-red-500');
        } else {
          input.classList.remove('border-red-500');
        }
      });
      if (isValid) {
        // Show success message
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successDiv.textContent = 'Succesvol verstuurd!';
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
        this.reset();
      }
    });
  });
});
</script>
\`\`\`

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
- If the user mentions uploading an image, use the placeholder exactly as provided (e.g. {{USER_IMAGE_1}}, {{USER_IMAGE_2}}) as the src attribute for <img> tags.

FUNCTIONALITY RULE:
- If you add any new UI element (button, form, link, tab, modal), it MUST have working JavaScript.
- Never add a button without an onclick handler or event listener.
- Never add a form without submit handling, validation, and success feedback.
- Every visible interactive element must function correctly.

THINK OF IT AS A DIFF: What is the smallest possible change to the existing code that satisfies the user's request? Make exactly that change and nothing more.

IMPORTANT: Your entire response must be ONLY valid HTML starting with <!DOCTYPE html>. Nothing else.`;

// Convert a ChatMessage: strip images and replace with placeholder references in text
function toAiMessage(msg: { role: string; content: string; images?: string[] }) {
  let content = msg.content;
  if (msg.images && msg.images.length > 0) {
    const placeholderList = msg.images.map((_, i) => `{{USER_IMAGE_${i + 1}}}`).join(", ");
    content += `\n\n[De gebruiker heeft ${msg.images.length} afbeelding(en) geüpload. Gebruik deze placeholders als src in <img> tags: ${placeholderList}]`;
  }
  return { role: msg.role, content };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentHtml } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isUpdate = !!currentHtml;
    const aiMessages: any[] = [
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
      aiMessages.push(toAiMessage(msg));
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
