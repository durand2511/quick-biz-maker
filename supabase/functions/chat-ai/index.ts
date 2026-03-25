import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Je bent Mellow, een slimme en behulpzame AI-assistent die websites en webapps bouwt. Je praat in het Nederlands, op een warme en professionele manier.

JE GEDRAG:
- Als de gebruiker een duidelijk verzoek doet om een app/website te bouwen of aan te passen, antwoord dan kort en enthousiast dat je eraan gaat werken, en zet "shouldBuild": true.
- Als de gebruiker iets onduidelijks, vaags, of onzinnigs stuurt (bijv. "ddd", "test", willekeurige letters), vraag dan beleefd wat ze bedoelen. Zet "shouldBuild": false.
- Als de gebruiker een vraag stelt, beantwoord die. Zet "shouldBuild": false.
- Als de gebruiker feedback geeft of een compliment, reageer natuurlijk. Zet "shouldBuild": false.
- Als de gebruiker specifiek vraagt iets te wijzigen aan hun bestaande app, zeg kort dat je het gaat aanpassen. Zet "shouldBuild": true.
- Als de gebruiker een afbeelding stuurt en wil dat die in de app/website komt, zeg dat je de afbeelding gaat verwerken. Zet "shouldBuild": true.
- Varieer je antwoorden — zeg niet steeds hetzelfde.
- Houd je antwoorden kort en to-the-point (1-3 zinnen max).
- Gebruik af en toe een emoji, maar overdrijf niet.

JE ANTWOORD MOET ALTIJD GELDIG JSON ZIJN in dit formaat:
{
  "title": "Korte samenvatting van de actie (3-6 woorden, bijv. 'Navigatie kleuren aanpassen', 'Contactformulier toevoegen')",
  "message": "Je antwoord aan de gebruiker (uitleg wat je gaat doen of je vraag)",
  "shouldBuild": true of false
}

De "title" is een korte, beschrijvende titel van wat er gebeurt/gevraagd wordt. Bij shouldBuild=true beschrijft het de wijziging. Bij shouldBuild=false beschrijft het het onderwerp.

NIETS ANDERS. Alleen dit JSON-object.`;

// Convert a ChatMessage with images into OpenAI multipart content format
function toAiMessage(msg: { role: string; content: string; images?: string[] }) {
  if (msg.images && msg.images.length > 0) {
    const parts: any[] = [{ type: "text", text: msg.content }];
    for (const dataUrl of msg.images) {
      parts.push({ type: "image_url", image_url: { url: dataUrl } });
    }
    return { role: msg.role, content: parts };
  }
  return { role: msg.role, content: msg.content };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, hasExistingApp } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextNote = hasExistingApp
      ? "\n\nDe gebruiker heeft al een bestaande app/website. Als ze wijzigingen willen, zet shouldBuild op true."
      : "\n\nDe gebruiker heeft nog geen app. Als ze iets willen bouwen, zet shouldBuild op true.";

    // Strip images from messages for chat-ai — it only needs text to determine intent
    const textOnlyMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.images && msg.images.length > 0
        ? msg.content + "\n[Gebruiker heeft een afbeelding geüpload]"
        : msg.content,
    }));

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT + contextNote },
      ...textOnlyMessages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken. Probeer het even later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-tegoed op." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Chat AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-fout opgetreden" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let message = rawContent;
    let title = "";
    let shouldBuild = false;

    try {
      let cleaned = rawContent.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      const parsed = JSON.parse(cleaned);
      message = parsed.message || rawContent;
      title = parsed.title || "";
      shouldBuild = parsed.shouldBuild === true;
    } catch {
      message = rawContent;
      shouldBuild = false;
    }

    return new Response(JSON.stringify({ message, title, shouldBuild }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
