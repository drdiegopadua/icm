/*
 * O app usa o MESMO banco do Sistema ICM (ver ../supabase/icm_v5_app.sql).
 * Só a chave pública entra aqui: visitante e família não leem nenhuma tabela,
 * apenas chamam as funções do banco que devolvem o mínimo necessário.
 * NUNCA coloque a chave "service_role" aqui.
 * Abrir com ?demo no endereço = modo demonstração (dados fictícios, nada sai do aparelho).
 */
const APP_CONFIG = {
  usarSupabase: !/[?&]demo\b/.test(location.search),
  supabaseUrl: "https://syzqaxqwzgcjompqlhjg.supabase.co",
  supabaseAnonKey: "sb_publishable_csL0JsrIatdgCivnI6L58A_T9jFbGQS",
};
