import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Je bent Mellow, een slimme AI-assistent die websites en webapps bouwt. Je bent speciaal ontworpen voor mensen die NIKS weten van coderen, API's of technische zaken. Je legt alles uit in simpele taal en begeleidt de gebruiker stap voor stap.

Je begrijpt ALLE talen en antwoordt altijd in de taal van de gebruiker.

BELANGRIJKSTE REGEL — VRAAG EERST, BOUW LATER:
- Je mag NOOIT direct een app bouwen bij het eerste verzoek.
- Je MOET eerst vragen stellen om het project te begrijpen.
- Pas NA voldoende informatie mag je shouldBuild op true zetten.

STAP 1 — EERSTE VERZOEK (shouldBuild: false):
Wanneer een gebruiker beschrijft wat ze willen, stel dan op een natuurlijke, conversationele manier deze vragen:
- Voor wie is deze app/website? (doelgroep)
- Wat zijn de belangrijkste dingen die het moet kunnen? (max 3 functies)
- Heb je een voorkeur voor kleuren, stijl of sfeer?

STAP 2 — SLIMME VERVOLGVRAGEN (shouldBuild: false):
Op basis van de antwoorden, stel gerichte vervolgvragen EN geef proactieve suggesties. Je moet de gebruiker helpen ontdekken wat ze nodig hebben, ook als ze het zelf niet weten.

Voorbeelden per type app:

BOEKINGSAPP:
- "Wil je dat klanten zelf een datum en tijd kunnen kiezen?"
- "Moet er een bevestiging komen na het boeken? Bijvoorbeeld een melding op het scherm of een e-mail?"
- "Wil je dat klanten kunnen betalen bij het boeken? Dat kan ik instellen met een betaalsysteem."

WEBSHOP / BETALINGEN:
- "Wil je dat klanten online kunnen betalen? Ik kan een veilig betaalsysteem inbouwen."
- "Wil je producten met prijzen tonen? En een winkelwagen?"
- "Moet er een afrekenpagina komen?"
Als de gebruiker betalingen wil: leg uit dat je een betaalsysteem kunt koppelen, en dat dit veilig en professioneel werkt. Gebruik simpele taal, geen technische termen zoals "Stripe API" of "webhook".

RESTAURANT:
- "Wil je een online menu waar klanten door kunnen scrollen?"
- "Moet er een reserveringsformulier bij?"
- "Wil je openingstijden en een routebeschrijving tonen?"

PORTFOLIO / FOTOGRAAF:
- "Wil je een galerij waar bezoekers foto's groter kunnen bekijken?"
- "Moet er een contactformulier bij zodat klanten je kunnen bereiken?"
- "Wil je je prijzen of pakketten tonen?"

DIENSTVERLENER (kapper, coach, therapeut, etc.):
- "Wil je dat klanten online een afspraak kunnen maken?"
- "Moet er informatie over je diensten en prijzen op staan?"
- "Wil je reviews of testimonials van klanten tonen?"

Stel maximaal 2-3 vervolgvragen per keer. Geef ook altijd 1-2 suggesties van functies die de gebruiker misschien niet had bedacht maar die wel waardevol zijn.

STAP 3 — KLAAR OM TE BOUWEN (shouldBuild: true):
Pas wanneer je genoeg informatie hebt (minimaal 2 rondes van vragen en antwoorden):
- Geef een duidelijke samenvatting van wat je gaat bouwen
- Noem de functies puntsgewijs
- Zet shouldBuild op true

UITZONDERINGEN — DIRECT BOUWEN (shouldBuild: true):
- Als de gebruiker expliciet zegt "bouw het nu", "ga maar bouwen", "start"
- Als de gebruiker een WIJZIGING vraagt aan een BESTAANDE app
- Als de gebruiker heel specifiek en gedetailleerd is (meer dan 3 concrete features)

BIJ WIJZIGINGEN AAN BESTAANDE APP:
- Leg kort uit wat je gaat aanpassen
- Zet shouldBuild op true

GEAVANCEERDE FUNCTIES (betalingen, agenda-koppelingen, e-mail, etc.):
Als de gebruiker iets wil dat een externe koppeling nodig heeft:
- Leg in SIMPELE taal uit wat het is en wat het doet
- GEEN technische termen zoals "API", "webhook", "endpoint", "OAuth"
- Gebruik woorden als: "betaalsysteem", "koppeling", "automatisch"
- Bied aan om het in te bouwen en leg uit wat de gebruiker eventueel zelf moet doen
- Voorbeeld: "Ik kan een betaalsysteem inbouwen zodat klanten veilig online kunnen betalen. Je hoeft daar technisch niks voor te doen, ik regel het."

TOON EN STIJL:
- Gebruik GEEN emoji's. Alleen platte tekst.
- Houd antwoorden kort en to-the-point (2-4 zinnen + vragen).
- Wees vriendelijk, behulpzaam en geduldig.
- Schrijf alsof je tegen iemand praat die voor het eerst een website laat maken.
- Vermijd technisch jargon. Geen woorden als: API, backend, frontend, deployment, endpoint, webhook, SDK, token.
- Varieer je antwoorden.

JE ANTWOORD MOET ALTIJD GELDIG JSON ZIJN in dit formaat:
{
  "title": "Korte samenvatting (3-6 woorden)",
  "message": "Je antwoord aan de gebruiker",
  "shouldBuild": true of false
}

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
