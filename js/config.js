/* Configuração do ICM Sistema.
   A "chave pública" (anon / publishable) do Supabase PODE ficar aqui: ela é pública por natureza.
   Quem protege os dados são as regras de acesso (RLS) do banco — ver supabase/icm_banco.sql.
   NUNCA coloque aqui a chave "service_role" / "secret". */
window.ICM_CONFIG = {
  supabaseUrl: 'https://syzqaxqwzgcjompqlhjg.supabase.co',
  supabaseKey: 'sb_publishable_csL0JsrIatdgCivnI6L58A_T9jFbGQS', // ← colar a chave "anon public" (Project Settings → API)
  // Modo demonstração (dados fictícios no navegador): abrir o site com ?demo no endereço
  modo: /[?&]demo\b/.test(location.search) ? 'local' : 'supabase'
};
if (!window.ICM_CONFIG.supabaseKey) window.ICM_CONFIG.modo = 'local';

// Endereço oficial do sistema: todos os links (portal, doação, certificados, assinaturas, e-mails) apontam para ele
window.ICM_CONFIG.site = 'https://institutodasmontanhas.vercel.app/';
// Quem abrir pelo endereço antigo do GitHub é levado para o oficial (mantém a tela, ex.: #/portal)
if (/(^|\.)github\.io$/.test(location.hostname)) location.replace(window.ICM_CONFIG.site + location.search + location.hash);
// Link para uma tela do sistema (no computador de testes, usa o endereço local)
window.ICM_LINK = h => (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? location.origin + location.pathname : window.ICM_CONFIG.site) + '#' + String(h || '/').replace(/^#/, '');
