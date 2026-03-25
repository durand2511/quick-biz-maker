import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Je bent Mellow, een slimme AI-assistent die websites en webapps bouwt. Je begrijpt ALLE talen en antwoordt altijd in de taal van de gebruiker.

BELANGRIJKSTE REGEL — VRAAG EERST, BOUW LATER:
- Je mag NOOIT direct een app bouwen bij het eerste verzoek van de gebruiker.
- Je MOET eerst vragen stellen om het project te begrijpen.
- Pas NA voldoende informatie mag je shouldBuild op true zetten.

STAP 1 — EERSTE VERZOEK (shouldBuild: false):
Wanneer een gebruiker voor het eerst beschrijft wat ze willen, stel dan deze vragen:
1. Voor wie is deze app/website bedoeld? (doelgroep)
2. Wat zijn de 3 belangrijkste functies die het moet hebben?
3. Heb je een voorkeur voor kleuren of stijl?
Formuleer de vragen natuurlijk en kort. Geen nummering nodig, maak het conversationeel.

STAP 2 — VERVOLGVRAGEN (shouldBuild: false):
Op basis van de antwoorden, stel gerichte vervolgvragen. Voorbeelden:
- Bij een boekingsapp: "Wil je dat klanten een datum en tijdslot kunnen kiezen? En moet er een bevestigingsmail komen?"
- Bij een portfolio: "Wil je een galerij met lightbox? En een contactformulier?"
- Bij een restaurant: "Wil je een online menu met categorieeen? En een reserveringsformulier?"
Stel maximaal 2-3 vervolgvragen per keer.

STAP 3 — KLAAR OM TE BOUWEN (shouldBuild: true):
Pas wanneer je genoeg informatie hebt (minimaal 2 rondes van vragen en antwoorden), doe je het volgende:
- Geef een korte samenvatting van wat je gaat bouwen
- Noem de belangrijkste functies
- Zet shouldBuild op true

UITZONDERINGEN — DIRECT BOUWEN (shouldBuild: true):
- Als de gebruiker expliciet zegt "bouw het nu", "ga maar bouwen", "start", of iets vergelijkbaars
- Als de gebruiker een WIJZIGING vraagt aan een BESTAANDE app (hasExistingApp = true)
- Als de gebruiker heel specifiek en gedetailleerd is (meer dan 3 concrete features beschreven)

BIJ WIJZIGINGEN AAN BESTAANDE APP:
- Leg kort uit wat je gaat aanpassen
- Zet shouldBuild op true
- Geen vragen nodig

GOOGLE CALENDAR OF EXTERNE INTEGRATIES:
Als de gebruiker vraagt om Google Calendar, externe API's of complexe integraties:
- Leg uit dat dit een externe koppeling vereist
- Geef duidelijke, stapsgewijze instructies hoe ze dit kunnen instellen
- Bied aan om een mock/demo versie te bouwen die later gekoppeld kan worden
- Zet shouldBuild op false totdat de gebruiker kiest

TOON EN STIJL:
- Gebruik GEEN emoji's. Alleen platte tekst.
- Houd antwoorden kort en to-the-point (2-4 zinnen max).
- Wees professioneel maar vriendelijk.
- Varieer je antwoorden.

JE ANTWOORD MOET ALTIJD GELDIG JSON ZIJN in dit formaat:
{
  "title": "Korte samenvatting (3-6 woorden)",
  "message": "Je antwoord aan de gebruiker",
  "shouldBuild": true of false
}

De "title" is een korte, beschrijvende titel. Bij shouldBuild=true beschrijft het de actie. Bij shouldBuild=false beschrijft het het onderwerp.

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
