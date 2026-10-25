// Stuurt een pushmelding naar elk toestel van de leerkracht.
//
// Twee manieren om deze functie aan te roepen:
// - de database, na elke nieuwe inzending (header x-melding-geheim, body { inzending_id })
// - de leerkrachtensite, voor een testmelding (aangemelde gebruiker, body { test: true })

import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import webpush from "npm:web-push@3.6.7";

const SITE_URL = Deno.env.get("SITE_URL")!; // https://konijnenklas.lvit.be/
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

webpush.setVapidDetails(SITE_URL, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

function antwoord(inhoud: unknown, status = 200) {
  return new Response(JSON.stringify(inhoud), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const body = await req.json().catch(() => ({}));
  let bericht: { title: string; body: string; url: string; tag: string };

  if (req.headers.get("x-melding-geheim") === Deno.env.get("MELDING_GEHEIM")) {
    const { data, error } = await supabase
      .from("inzendingen")
      .select("kind_id, samenvatting, kinderen(voornaam, achternaam)")
      .eq("id", body.inzending_id)
      .single();
    if (error || !data) return antwoord({ fout: "inzending niet gevonden" }, 404);
    const kind = data.kinderen as unknown as { voornaam: string; achternaam: string };
    bericht = {
      title: `${kind.voornaam} ${kind.achternaam}`,
      body: data.samenvatting,
      url: `${SITE_URL}leerkracht/#kind=${data.kind_id}`,
      tag: `kind-${data.kind_id}`,
    };
  } else if (body.test) {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const { data } = await supabase.auth.getUser(token);
    if (!data.user) return antwoord({ fout: "niet aangemeld" }, 401);
    bericht = {
      title: "Konijnenklas",
      body: "Testmelding: meldingen werken op dit toestel.",
      url: `${SITE_URL}leerkracht/`,
      tag: "test",
    };
  } else {
    return antwoord({ fout: "geen toegang" }, 401);
  }

  // Rood bolletje op het icoon: het aantal inzendingen sinds de leerkracht de app laatst opende.
  const { data: geopend } = await supabase.from("leerkracht_geopend").select("tijdstip").eq("id", 1).maybeSingle();
  const { count } = await supabase.from("inzendingen").select("id", { count: "exact", head: true })
    .gt("tijdstip", geopend?.tijdstip ?? "1970-01-01");
  const bolletje = Math.max(1, count ?? 0);

  // Gewoon formaat voor de service worker, die de melding toont en het bolletje zet met dit getal.
  // Niet het formaat van declarative web push: daarmee kwam op de iPhone geen enkele melding meer aan
  // (25 oktober 2026), al nam Apple ze aan.
  const melding = { ...bericht, app_badge: bolletje };

  const { data: abonnementen } = await supabase.from("push_abonnementen").select("endpoint, p256dh, auth");
  let verstuurd = 0;
  await Promise.all((abonnementen ?? []).map(async (a) => {
    try {
      await webpush.sendNotification(
        { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
        JSON.stringify(melding),
        { TTL: 60 * 60 * 24 },
      );
      verstuurd++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // Toestel heeft het abonnement opgezegd: opruimen.
      if (status === 404 || status === 410) {
        await supabase.from("push_abonnementen").delete().eq("endpoint", a.endpoint);
      } else {
        console.error("Push mislukt", status, e);
      }
    }
  }));

  return antwoord({ verstuurd, bolletje });
});
