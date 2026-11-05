// Recebe o GPS da van (protocolo OsmAnd, usado pelo app gratuito Traccar Client).
// Publicada no Supabase como "swift-api":  https://lfobxtowakiwaxdkwuhe.supabase.co/functions/v1/swift-api
// - <CODIGO> é o código do aparelho gerado por criar_dispositivo_van(); só o hash fica no banco.
// - Recusa coordenadas fora da região, leituras velhas e envios em rajada.
// - Grava só a posição ATUAL (sem histórico).
// Publicar com "Verify JWT" DESLIGADO (o Traccar não envia login); a proteção é o código do aparelho.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // disponível só no servidor, nunca no app
  { auth: { persistSession: false } },
);

const REGIAO = { latMin: -20.4, latMax: -19.8, lngMin: -41.4, lngMax: -40.8 };

async function sha256(texto: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const resposta = (status: number, msg = "") => new Response(msg, { status });

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") return resposta(405);

  // Traccar Client antigo: dados na URL (ou formulário). Traccar Client 9+: JSON no corpo
  // { device_id, location: { timestamp, coords: { latitude, longitude } } }.
  const params = new URL(req.url).searchParams;
  const tipo = req.headers.get("content-type") || "";
  if (req.method === "POST" && tipo.includes("form")) {
    new URLSearchParams(await req.text()).forEach((v, k) => params.set(k, v));
  } else if (req.method === "POST" && tipo.includes("json")) {
    try {
      const j = JSON.parse(await req.text());
      const loc = Array.isArray(j.location) ? j.location[0] : j.location;
      if (j.device_id) params.set("id", String(j.device_id));
      if (loc?.coords) {
        params.set("lat", String(loc.coords.latitude));
        params.set("lon", String(loc.coords.longitude));
      }
      if (loc?.timestamp) params.set("timestamp", String(Date.parse(loc.timestamp)));
    } catch {
      return resposta(400);
    }
  }

  const codigo = params.get("id") || "";
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lon"));
  if (!/^[0-9a-f]{48}$/.test(codigo)) return resposta(401);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return resposta(400);
  if (lat < REGIAO.latMin || lat > REGIAO.latMax || lng < REGIAO.lngMin || lng > REGIAO.lngMax) return resposta(422);

  // Leitura com mais de 2 minutos (ex.: celular sem sinal reenviando fila) não move a van.
  const ts = Number(params.get("timestamp"));
  if (Number.isFinite(ts) && ts > 0) {
    const ms = ts > 1e12 ? ts : ts * 1000;
    if (Date.now() - ms > 120_000) return resposta(200, "antiga");
  }

  const { data: disp } = await supabase
    .from("van_dispositivos").select("id").eq("token_hash", await sha256(codigo)).eq("ativo", true).maybeSingle();
  if (!disp) return resposta(401);

  // Só grava se o transporte iniciou uma rota no app. Sem rota em andamento, ignora
  // (ex.: Traccar esquecido ligado depois de encerrar a rota). Uma van por vez.
  const { data: rota } = await supabase
    .from("rotas").select("id").eq("em_andamento", true).order("iniciada_em", { ascending: false }).limit(1).maybeSingle();
  if (!rota) return resposta(200, "fora de rota");

  // No máximo uma gravação a cada 3 segundos.
  const { data: atual } = await supabase
    .from("van_posicao_atual").select("atualizado_em").eq("rota_id", rota.id).maybeSingle();
  if (atual && Date.now() - new Date(atual.atualizado_em).getTime() < 3000) return resposta(200, "ok");

  const { error } = await supabase.from("van_posicao_atual").upsert({
    rota_id: rota.id, lat, lng, em_rota: true, atualizado_em: new Date().toISOString(),
  });
  return error ? resposta(500) : resposta(200, "ok");
});
