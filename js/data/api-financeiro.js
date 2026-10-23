/* Regras de negócio: financeiro por projeto, fornecedores e compras (3 orçamentos), leitura de NF-e,
   depreciação, arrecadação online (campanhas + Pix) e acompanhamento social (PIA, encaminhamentos,
   pareceres e avaliações de evolução). */
(function () {
  const S = () => ICM.store;
  const u = () => ICM.util;
  const H = () => ICM.api._h;
  const need = p => H().need(p);
  const audit = (...a) => H().audit(...a);
  const me = () => H().me();
  const can = p => ICM.auth.can(p);
  const R2 = v => Math.round(Number(v || 0) * 100) / 100;
  async function seq(col, prefixo, campo) {
    const all = await S().list(col);
    const n = all.reduce((m, x) => Math.max(m, Number(((x[campo] || '').match(/(\d+)$/) || [0, 0])[1])), 0) + 1;
    return `${prefixo}${String(n).padStart(4, '0')}`;
  }

  // ======================= FINANCEIRO =======================
  // Rateio: uma despesa pode ser dividida entre projetos (percentuais somam 100)
  function partes(l) {
    if (l.rateio && l.rateio.length) return l.rateio.map(r => ({ projeto_id: r.projeto_id, valor: R2(l.valor * r.pct / 100) }));
    return [{ projeto_id: l.projeto_id || '', valor: R2(l.valor) }];
  }
  const efetivo = l => l.status === 'pago' || l.status === 'recebido';
  const financeiro = {
    partes,
    async contas() {
      need('financeiro.ver');
      const ls = await S().list('fin_lancamentos', efetivo);
      return (await S().list('fin_contas')).map(c => {
        const mov = ls.filter(l => l.conta_id === c.id && l.data && l.data >= c.data_saldo);
        const saldo = R2(Number(c.saldo_inicial || 0) + mov.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0));
        return { ...c, saldo, pendentes_conciliar: mov.filter(l => !l.conciliado).length };
      });
    },
    async salvarConta(c) { need('financeiro.lancar'); if (!c.nome) throw new Error('Informe o nome da conta.'); const x = c.id ? await S().update('fin_contas', c.id, c) : await S().insert('fin_contas', { ativa: true, saldo_inicial: 0, data_saldo: `${u().today().slice(0, 4)}-01-01`, ...c }); await audit(c.id ? 'editar' : 'criar', 'fin_contas', x.id, x.nome); return x; },
    async lancamentos({ tipo, status, projeto_id, conta_id, de, ate, q } = {}) {
      need('financeiro.ver');
      const hoje = u().today();
      let l = await S().list('fin_lancamentos');
      if (tipo) l = l.filter(x => x.tipo === tipo);
      if (conta_id) l = l.filter(x => x.conta_id === conta_id);
      if (projeto_id !== undefined && projeto_id !== null) l = l.filter(x => partes(x).some(p => p.projeto_id === projeto_id));
      if (de) l = l.filter(x => (x.data || x.vencimento) >= de);
      if (ate) l = l.filter(x => (x.data || x.vencimento) <= ate);
      if (q) { const s = q.toLowerCase(); l = l.filter(x => `${x.descricao} ${x.documento}`.toLowerCase().includes(s)); }
      l = l.map(x => ({ ...x, atrasado: !efetivo(x) && x.status !== 'previsto' && x.vencimento < hoje, situacao: efetivo(x) ? (x.tipo === 'receita' ? 'recebido' : 'pago') : x.status === 'previsto' ? 'previsto' : x.vencimento < hoje ? 'atrasado' : x.tipo === 'receita' ? 'a_receber' : 'a_pagar' }));
      if (status) l = l.filter(x => x.situacao === status || (status === 'aberto' && !efetivo(x)));
      return l.sort((a, b) => (b.data || b.vencimento).localeCompare(a.data || a.vencimento));
    },
    async salvar(l) {
      need('financeiro.lancar');
      l = { ...l, valor: R2(l.valor) };
      ['atrasado', 'situacao'].forEach(k => delete l[k]);
      if (!l.descricao) throw new Error('Informe a descrição.');
      if (!(l.valor > 0)) throw new Error('Informe um valor maior que zero.');
      if (!l.conta_id) throw new Error('Selecione a conta.');
      if (l.tipo === 'despesa' && !l.rubrica) throw new Error('Selecione a rubrica da despesa.');
      if (l.rateio && l.rateio.length) { const t = l.rateio.reduce((s, r) => s + Number(r.pct || 0), 0); if (Math.abs(t - 100) > .01) throw new Error(`O rateio precisa somar 100% (está em ${t}%).`); l.projeto_id = ''; }
      if (efetivo(l) && !l.data) l.data = l.vencimento || u().today();
      // Conta específica de parceria só movimenta recursos do próprio projeto (MROSC)
      const conta = await S().get('fin_contas', l.conta_id);
      if (conta && conta.tipo === 'especifica' && conta.projeto_id) { const ps = partes(l).map(p => p.projeto_id); if (ps.some(p => p && p !== conta.projeto_id)) throw new Error('Esta conta é exclusiva de um projeto: não pode pagar/receber de outros projetos.'); }
      const x = l.id ? await S().update('fin_lancamentos', l.id, l) : await S().insert('fin_lancamentos', l);
      await audit(l.id ? 'editar' : 'criar', 'fin_lancamentos', x.id, `${x.tipo === 'receita' ? '+' : '−'}${u().money(x.valor)} ${x.descricao}`);
      return x;
    },
    async baixar(id, { data, conta_id }) {
      need('financeiro.lancar');
      const l = await S().get('fin_lancamentos', id);
      const x = await S().update('fin_lancamentos', id, { status: l.tipo === 'receita' ? 'recebido' : 'pago', data: data || u().today(), conta_id: conta_id || l.conta_id });
      await audit('baixar', 'fin_lancamentos', id, `${l.tipo === 'receita' ? 'Recebido' : 'Pago'}: ${l.descricao}`); return x;
    },
    async remover(id) { need('financeiro.aprovar'); const l = await S().get('fin_lancamentos', id); if (l.conciliado) throw new Error('Lançamento conciliado com o extrato não pode ser excluído.'); await S().remove('fin_lancamentos', id); await audit('excluir', 'fin_lancamentos', id, `Excluído: ${l.descricao} ${u().money(l.valor)}`); },
    async orcamento(projeto_id) {
      need('financeiro.ver');
      const orc = await S().list('fin_orcamentos', o => o.projeto_id === projeto_id);
      const desp = (await S().list('fin_lancamentos', l => l.tipo === 'despesa')).flatMap(l => partes(l).filter(p => p.projeto_id === projeto_id).map(p => ({ ...l, valor_parte: p.valor })));
      const rubs = [...new Set([...orc.map(o => o.rubrica), ...desp.map(d => d.rubrica)])];
      const linhas = rubs.map(rb => {
        const previsto = orc.filter(o => o.rubrica === rb).reduce((s, o) => s + Number(o.valor), 0);
        const realizado = R2(desp.filter(d => d.rubrica === rb && efetivo(d)).reduce((s, d) => s + d.valor_parte, 0));
        const comprometido = R2(desp.filter(d => d.rubrica === rb && !efetivo(d)).reduce((s, d) => s + d.valor_parte, 0));
        return { rubrica: rb, nome: ICM.C.RUBRICAS[rb] || rb, previsto, realizado, comprometido, saldo: R2(previsto - realizado - comprometido), pct: previsto ? Math.round((realizado + comprometido) / previsto * 100) : null };
      }).sort((a, b) => b.previsto - a.previsto);
      const receitas = (await S().list('fin_lancamentos', l => l.tipo === 'receita')).flatMap(l => partes(l).filter(p => p.projeto_id === projeto_id).map(p => ({ ...l, valor_parte: p.valor })));
      return { linhas, previsto: linhas.reduce((s, x) => s + x.previsto, 0), realizado: R2(linhas.reduce((s, x) => s + x.realizado, 0)), comprometido: R2(linhas.reduce((s, x) => s + x.comprometido, 0)), recebido: R2(receitas.filter(efetivo).reduce((s, x) => s + x.valor_parte, 0)), a_receber: R2(receitas.filter(x => !efetivo(x)).reduce((s, x) => s + x.valor_parte, 0)), estourados: linhas.filter(x => x.saldo < 0) };
    },
    async salvarOrcamento(projeto_id, linhas) {
      need('financeiro.aprovar');
      for (const o of await S().list('fin_orcamentos', x => x.projeto_id === projeto_id)) await S().remove('fin_orcamentos', o.id);
      for (const l of linhas.filter(x => Number(x.valor) > 0)) await S().insert('fin_orcamentos', { projeto_id, rubrica: l.rubrica, valor: R2(l.valor), obs: '' });
      await audit('editar', 'fin_orcamentos', projeto_id, 'Orçamento do projeto atualizado');
    },
    async fluxo(meses = 6) {
      need('financeiro.ver');
      const ls = await S().list('fin_lancamentos'); const out = [];
      const d0 = new Date(); d0.setDate(1); d0.setMonth(d0.getMonth() - (meses - 3));
      for (let i = 0; i < meses; i++) { const d = new Date(d0); d.setMonth(d0.getMonth() + i); const k = u().iso(d).slice(0, 7); const doMes = ls.filter(l => (l.data || l.vencimento).startsWith(k)); out.push({ k, l: u().MESES_C[d.getMonth()], entradas: R2(doMes.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)), saidas: R2(doMes.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)), futuro: k > u().today().slice(0, 7) }); }
      return out;
    },
    // ----- Extrato e conciliação -----
    lerExtrato(texto, nome) {
      const linhas = [];
      if (/<OFX>|<STMTTRN>/i.test(texto)) {
        (texto.match(/<STMTTRN>[\s\S]*?(<\/STMTTRN>|(?=<STMTTRN>)|$)/gi) || []).forEach(b => {
          const g = t => ((b.match(new RegExp(`<${t}>([^<\\r\\n]*)`, 'i')) || [])[1] || '').trim();
          const dt = g('DTPOSTED'); const v = Number(g('TRNAMT').replace(',', '.'));
          if (dt && !isNaN(v)) linhas.push({ data: `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`, valor: v, descricao: g('MEMO') || g('NAME'), fitid: g('FITID') });
        });
      } else {
        texto.split(/\r?\n/).forEach(ln => {
          const c = ln.split(/[;\t]/).map(x => x.trim().replace(/^"|"$/g, ''));
          if (c.length < 3) return;
          const dm = c[0].match(/^(\d{2})\/(\d{2})\/(\d{4})$/) || c[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (!dm) return;
          const data = c[0].includes('/') ? `${dm[3]}-${dm[2]}-${dm[1]}` : c[0];
          const vs = c[c.length - 1].replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
          const valor = Number(vs); if (isNaN(valor) || !vs) return;
          linhas.push({ data, valor, descricao: c.slice(1, -1).join(' ').trim(), fitid: '' });
        });
      }
      if (!linhas.length) throw new Error(`Não reconheci movimentos em "${nome}". Use OFX do banco ou CSV com: data;descrição;valor`);
      return linhas;
    },
    async conciliar(conta_id, linhas) {
      need('financeiro.lancar');
      const lans = (await S().list('fin_lancamentos', l => l.conta_id === conta_id && !l.conciliado));
      const usados = new Set();
      return linhas.map(x => {
        const sinal = x.valor >= 0 ? 'receita' : 'despesa'; const v = Math.abs(x.valor);
        const cand = lans.filter(l => !usados.has(l.id) && l.tipo === sinal && Math.abs(l.valor - v) < .01)
          .map(l => ({ l, dist: Math.abs((u().parseD(l.data || l.vencimento) - u().parseD(x.data)) / 864e5) })).filter(c => c.dist <= 7).sort((a, b) => a.dist - b.dist)[0];
        if (cand) usados.add(cand.l.id);
        return { ...x, tipo: sinal, valor_abs: v, sugestao: cand ? { id: cand.l.id, descricao: cand.l.descricao, data: cand.l.data || cand.l.vencimento, status: cand.l.status } : null };
      });
    },
    async confirmarConciliacao(conta_id, itens) {
      need('financeiro.lancar');
      let n = 0, c = 0;
      for (const it of itens) {
        if (it.sugestao) { await S().update('fin_lancamentos', it.sugestao.id, { conciliado: true, status: it.tipo === 'receita' ? 'recebido' : 'pago', data: it.data, fitid: it.fitid || '' }); n++; }
        else if (it.criar) { await S().insert('fin_lancamentos', { tipo: it.tipo, data: it.data, vencimento: it.data, descricao: it.descricao || 'Movimento do extrato', valor: it.valor_abs, conta_id, status: it.tipo === 'receita' ? 'recebido' : 'pago', rubrica: it.tipo === 'despesa' ? (it.rubrica || 'outras') : undefined, categoria: it.tipo === 'receita' ? 'outra' : undefined, projeto_id: '', conciliado: true, fitid: it.fitid || '', obs: 'Criado pela conciliação bancária' }); c++; }
      }
      await audit('conciliar', 'fin_contas', conta_id, `Conciliação: ${n} lançamento(s) conferido(s), ${c} criado(s)`);
      return { conferidos: n, criados: c };
    }
  };

  // ======================= FORNECEDORES E COMPRAS =======================
  const fornecedores = {
    async list() { return (await S().list('fornecedores')).sort((a, b) => a.nome.localeCompare(b.nome)); },
    async save(f) { need('compras.cotar'); if (!f.nome) throw new Error('Informe o nome do fornecedor.'); const x = f.id ? await S().update('fornecedores', f.id, f) : await S().insert('fornecedores', f); await audit(f.id ? 'editar' : 'criar', 'fornecedores', x.id, x.nome); return x; }
  };
  const STATUS_COMPRA = { solicitada: ['Solicitada', 'neutral'], cotacao: ['Em cotação', 'warn'], aguardando_aprovacao: ['Aguardando aprovação', 'warn'], aprovada: ['Aprovada — comprar', ''], concluida: ['Concluída', 'ok'], reprovada: ['Reprovada', 'danger'] };
  const compras = {
    STATUS: STATUS_COMPRA,
    async list({ status } = {}) {
      need('compras.solicitar');
      let l = await S().list('compras');
      if (ICM.auth.user().papel === 'professor') l = l.filter(c => c.solicitante === me().nome);
      if (status) l = l.filter(c => c.status === status);
      const fs = await S().list('fornecedores');
      return l.map(c => ({ ...c, menor: c.cotacoes.length ? c.cotacoes.reduce((m, x) => x.valor < m.valor ? x : m) : null, fornecedor: (n => n && (fs.find(f => f.id === n.fornecedor_id) || {}).nome)(c.cotacoes.find(x => x.id === c.escolhida)) })).sort((a, b) => b.solicitado_em.localeCompare(a.solicitado_em));
    },
    async get(id) { return S().get('compras', id); },
    async solicitar(c) {
      need('compras.solicitar');
      if (!c.titulo || !(c.itens || []).length) throw new Error('Informe o que precisa comprar.');
      const x = await S().insert('compras', { cotacoes: [], escolhida: '', status: 'solicitada', ...c, solicitante: me().nome, solicitado_em: u().today(), numero: await seq('compras', `CMP-${u().today().slice(0, 4)}-`, 'numero') });
      await audit('solicitar', 'compras', x.id, `${x.numero}: ${x.titulo}`); return x;
    },
    async salvar(c) { need('compras.cotar'); const x = await S().update('compras', c.id, { ...c, menor: undefined, fornecedor: undefined, status: c.status === 'solicitada' && c.cotacoes.length ? 'cotacao' : c.status }); return x; },
    async enviarAprovacao(id) {
      need('compras.cotar');
      const c = await S().get('compras', id);
      if (c.cotacoes.length < 3 && !c.justificativa_menos_3) throw new Error('São necessários 3 orçamentos. Se não for possível, registre a justificativa (ex.: fornecedor exclusivo).');
      await S().update('compras', id, { status: 'aguardando_aprovacao' }); await audit('editar', 'compras', id, `${c.numero} enviada para aprovação`);
    },
    async aprovar(id, cotacao_id, justificativa) {
      need('compras.aprovar');
      const c = await S().get('compras', id);
      const esc = c.cotacoes.find(x => x.id === cotacao_id); if (!esc) throw new Error('Escolha uma cotação.');
      const menor = c.cotacoes.reduce((m, x) => x.valor < m.valor ? x : m);
      if (esc.id !== menor.id && !justificativa) throw new Error('A cotação escolhida não é a de menor preço: justifique a escolha (prazo, qualidade, garantia…).');
      await S().update('compras', id, { status: 'aprovada', escolhida: cotacao_id, justificativa_escolha: justificativa || 'Menor preço', aprovado_por: me().nome, aprovado_em: u().today() });
      await audit('aprovar', 'compras', id, `${c.numero} aprovada — ${u().money(esc.valor)}`);
    },
    async reprovar(id, motivo) { need('compras.aprovar'); await S().update('compras', id, { status: 'reprovada', motivo_reprovacao: motivo || '', aprovado_por: me().nome, aprovado_em: u().today() }); await audit('reprovar', 'compras', id, motivo || ''); },
    // Concluir: gera a conta a pagar no financeiro (e anexa a NF, se houver)
    async concluir(id, { conta_id, vencimento, nf }) {
      need('compras.cotar');
      const c = await S().get('compras', id); const esc = c.cotacoes.find(x => x.id === c.escolhida);
      const lan = await financeiro.salvar({ tipo: 'despesa', status: 'a_pagar', vencimento: vencimento || u().addDays(u().today(), 15), data: '', descricao: `${c.numero} — ${c.titulo}`, valor: nf && nf.valor ? nf.valor : esc.valor, rubrica: c.rubrica || 'material_consumo', projeto_id: c.projeto_id || '', conta_id, fornecedor_id: esc.fornecedor_id, documento: nf && nf.numero ? `NF ${nf.numero}` : '', comprovante: nf && nf.arquivo ? nf.arquivo : null, nfe: nf && nf.chave ? { chave: nf.chave, emitente: nf.emitente, data: nf.data } : null, compra_id: c.id });
      await S().update('compras', id, { status: 'concluida', lancamento_id: lan.id, nf: nf || null, concluida_em: u().today() });
      await audit('concluir', 'compras', id, `${c.numero} concluída → conta a pagar ${u().money(lan.valor)}`); return lan;
    }
  };

  // Lê o XML da NF-e (padrão SEFAZ) — chave, emitente, número, data, total e itens
  function lerNFe(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const t = (sel, el = doc) => { const n = el.getElementsByTagName(sel)[0]; return n ? n.textContent.trim() : ''; };
    const inf = doc.getElementsByTagName('infNFe')[0];
    if (!inf) throw new Error('Arquivo não é uma NF-e (XML) válida.');
    const emit = doc.getElementsByTagName('emit')[0];
    return {
      chave: (inf.getAttribute('Id') || '').replace(/^NFe/, ''), numero: t('nNF'), serie: t('serie'), data: (t('dhEmi') || t('dEmi')).slice(0, 10),
      emitente: emit ? t('xNome', emit) : '', cnpj: emit ? (t('CNPJ', emit) || t('CPF', emit)) : '', valor: Number(t('vNF')) || 0,
      itens: [...doc.getElementsByTagName('det')].map(d => ({ descricao: t('xProd', d), quantidade: Number(t('qCom', d)), unidade: t('uCom', d), valor_unit: Number(t('vUnCom', d)), total: Number(t('vProd', d)) }))
    };
  }

  // Depreciação linear: valor contábil hoje
  function depreciacao(item) {
    const vida = ICM.C.VIDA_UTIL[item.categoria] || 10;
    const total = Number(item.valor_unitario || 0) * Number(item.quantidade || 0);
    if (!item.data_aquisicao || !total) return { vida, total, anos: 0, depreciado: 0, contabil: total, pct: 0 };
    const anos = Math.max(0, (u().parseD(u().today()) - u().parseD(item.data_aquisicao)) / (365.25 * 864e5));
    const pct = Math.min(1, anos / vida);
    return { vida, total: R2(total), anos: Math.round(anos * 10) / 10, depreciado: R2(total * pct), contabil: R2(total * (1 - pct)), pct: Math.round(pct * 100) };
  }

  // ======================= ARRECADAÇÃO ONLINE (Pix) =======================
  // Pix "copia e cola" estático no padrão BR Code do Banco Central (EMV) — funciona em qualquer app de banco
  function crc16(s) { let c = 0xFFFF; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c.toString(16).toUpperCase().padStart(4, '0'); }
  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const tlv = (id, v) => `${id}${String(v.length).padStart(2, '0')}${v}`;
  function pixPayload({ chave, nome, cidade, valor, txid, descricao }) {
    const conta = tlv('00', 'br.gov.bcb.pix') + tlv('01', chave) + (descricao ? tlv('02', semAcento(descricao).slice(0, 40)) : '');
    let p = tlv('00', '01') + tlv('26', conta) + tlv('52', '0000') + tlv('53', '986') + (valor ? tlv('54', Number(valor).toFixed(2)) : '') + tlv('58', 'BR') + tlv('59', semAcento(nome).slice(0, 25)) + tlv('60', semAcento(cidade).slice(0, 15)) + tlv('62', tlv('05', (txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***')) + '6304';
    return p + crc16(p);
  }
  const captacao = {
    pixPayload,
    async configPix() { const c = await S().getConfig(); return c.pix || { chave: '', nome: ICM.C.ORG.nome, cidade: '' }; },
    async salvarPix(p) { need('campanhas.gerir'); if (!p.chave) throw new Error('Informe a chave Pix da instituição.'); await S().setConfig({ pix: p }); await audit('editar', 'config', 'pix', `Chave Pix: ${p.chave}`); },
    async campanhas({ publicas } = {}) {
      const dons = await S().list('doacoes_online', d => d.status === 'confirmada');
      let l = await S().list('campanhas');
      if (publicas) l = l.filter(c => c.ativa && c.fim >= u().today());
      return l.map(c => { const ds = dons.filter(d => d.campanha_id === c.id); const arrec = R2(ds.reduce((s, d) => s + d.valor, 0)); return { ...c, arrecadado: arrec, doadores: ds.length, pct: c.meta ? Math.min(100, Math.round(arrec / c.meta * 100)) : null }; });
    },
    async salvarCampanha(c) { need('campanhas.gerir'); if (!c.titulo) throw new Error('Informe o título.'); const x = c.id ? await S().update('campanhas', c.id, c) : await S().insert('campanhas', { ativa: true, ...c }); await audit(c.id ? 'editar' : 'criar', 'campanhas', x.id, x.titulo); return x; },
    // Público: registra a intenção e devolve o Pix para pagar
    async doar({ campanha_id, nome, email, telefone, valor, recorrente, aceita_comunicacao }) {
      valor = R2(valor);
      if (!nome || nome.trim().length < 3) throw new Error('Informe seu nome.');
      if (!(valor >= 5)) throw new Error('Valor mínimo: R$ 5,00.');
      if (!email && !telefone) throw new Error('Informe e-mail ou WhatsApp para enviarmos o recibo.');
      const camp = await S().get('campanhas', campanha_id);
      const txid = 'ICM' + Date.now().toString(36).toUpperCase();
      const x = await S().insert('doacoes_online', { campanha_id, nome: nome.trim(), email: email || '', telefone: telefone || '', valor, recorrente: !!recorrente, aceita_comunicacao: !!aceita_comunicacao, txid, status: 'aguardando' });
      const pix = await captacao.configPix();
      return { ...x, payload: pixPayload({ ...pix, valor, txid, descricao: camp ? camp.titulo : 'Doacao' }), pix };
    },
    async doacoesOnline({ status } = {}) { need('campanhas.gerir'); return (await S().list('doacoes_online', d => !status || d.status === status)).sort((a, b) => b.criado_em.localeCompare(a.criado_em)); },
    // Equipe confirma que o Pix caiu no extrato → cria doador, doação, recibo e receita no financeiro
    async confirmar(id) {
      need('campanhas.gerir');
      const d = await S().get('doacoes_online', id); if (d.status !== 'aguardando') throw new Error('Doação já processada.');
      const camp = await S().get('campanhas', d.campanha_id) || {};
      let doador = (await S().list('doadores')).find(x => (d.email && x.email === d.email) || (d.telefone && x.telefone === d.telefone));
      if (!doador) doador = await ICM.api.doadores.save({ tipo: 'PF', nome: d.nome, email: d.email, telefone: d.telefone, categoria: 'Pessoa física', aceita_comunicacao: d.aceita_comunicacao, observacoes: d.recorrente ? 'Doador(a) mensal pela página de doação' : 'Doação pela página online', recorrente: d.recorrente });
      const doc = await ICM.api.doadores.registrarDoacao({ doador_id: doador.id, data: u().today(), tipo: 'dinheiro', valor: d.valor, forma: 'PIX', projeto_id: camp.projeto_id || '', descricao: `Campanha: ${camp.titulo || 'Doação online'}` });
      await financeiro.salvar({ tipo: 'receita', status: 'recebido', data: u().today(), vencimento: u().today(), descricao: `Doação online ${doc.recibo} — ${d.nome}`, valor: d.valor, categoria: 'doacao_pf', projeto_id: camp.projeto_id || '', conta_id: 'cta_mov', documento: doc.recibo, doacao_id: doc.id }).catch(() => null);
      await S().update('doacoes_online', id, { status: 'confirmada', confirmado_em: u().today(), doador_id: doador.id, doacao_id: doc.id });
      return { doador, doacao: doc };
    },
    async cancelar(id) { need('campanhas.gerir'); await S().update('doacoes_online', id, { status: 'cancelada' }); }
  };

  // ======================= ACOMPANHAMENTO SOCIAL =======================
  async function podeVerAluno(aluno_id) { const vis = await H().alunosVisiveisIds(); if (vis && !vis.has(aluno_id)) H().deny('Aluno fora das suas turmas.'); }
  const social = {
    async pia(aluno_id) { need('social.gerir'); return (await S().list('pia', p => p.aluno_id === aluno_id))[0] || null; },
    async salvarPia(p) { need('social.gerir'); if (!p.aluno_id) throw new Error('Aluno não informado.'); const x = p.id ? await S().update('pia', p.id, p) : await S().insert('pia', { objetivos: [], elaborado_em: u().today(), responsavel: me().nome, ...p }); await audit(p.id ? 'editar' : 'criar', 'pia', x.aluno_id, 'Plano Individual de Atendimento'); return x; },
    async encaminhamentos({ aluno_id, abertos } = {}) {
      need('social.gerir');
      const al = await S().list('alunos'); const hoje = u().today();
      return (await S().list('encaminhamentos', e => (!aluno_id || e.aluno_id === aluno_id) && (!abertos || ['enviado', 'atendimento', 'sem_retorno'].includes(e.status))))
        .map(e => ({ ...e, aluno_nome: (al.find(a => a.id === e.aluno_id) || {}).nome, dias: Math.round((u().parseD(hoje) - u().parseD(e.data)) / 864e5) })).sort((a, b) => b.data.localeCompare(a.data));
    },
    async salvarEncaminhamento(e) { need('social.gerir'); if (!e.aluno_id || !e.orgao || !e.motivo) throw new Error('Informe aluno, órgão e motivo.'); const x = e.id ? await S().update('encaminhamentos', e.id, e) : await S().insert('encaminhamentos', { status: 'enviado', data: u().today(), responsavel: me().nome, ...e }); await audit(e.id ? 'editar' : 'criar', 'encaminhamentos', x.aluno_id, `${x.orgao}: ${x.motivo} (${x.status})`); return x; },
    async pareceres(aluno_id) { need('social.gerir'); return (await S().list('pareceres', p => p.aluno_id === aluno_id)).sort((a, b) => b.data.localeCompare(a.data)); },
    async salvarParecer(p) { need('social.gerir'); if (!p.texto) throw new Error('Escreva o parecer.'); const x = await S().insert('pareceres', { data: u().today(), autor: me().nome, ...p }); await audit('criar', 'pareceres', x.aluno_id, `Parecer ${x.tipo}`); return x; },
    // Avaliações de evolução: professor avalia os próprios alunos
    async avaliacoes({ aluno_id, turma_id } = {}) {
      if (aluno_id) await podeVerAluno(aluno_id);
      const tids = await H().minhasTurmasIds();
      return (await S().list('avaliacoes', a => (!aluno_id || a.aluno_id === aluno_id) && (!turma_id || a.turma_id === turma_id) && tids.includes(a.turma_id))).sort((a, b) => a.data.localeCompare(b.data));
    },
    async salvarAvaliacao(a) {
      need('avaliacoes.registrar');
      if (!(await H().podeTurma(a.turma_id))) H().deny('Turma fora do seu acesso.');
      if (!a.notas || !Object.keys(a.notas).length) throw new Error('Preencha as notas.');
      const ja = (await S().list('avaliacoes', x => x.aluno_id === a.aluno_id && x.turma_id === a.turma_id && x.momento === a.momento))[0];
      const x = ja ? await S().update('avaliacoes', ja.id, { ...a, avaliador: me().nome }) : await S().insert('avaliacoes', { data: u().today(), ...a, avaliador: me().nome });
      return x;
    },
    // Resultado por turma/projeto: média por competência no início e agora, e % de alunos que evoluíram
    async evolucao({ turma_ids }) {
      const avs = await S().list('avaliacoes', a => turma_ids.includes(a.turma_id));
      const comp = Object.keys(ICM.C.COMPETENCIAS);
      const porAluno = {};
      avs.forEach(a => { const k = a.aluno_id + '|' + a.turma_id; (porAluno[k] = porAluno[k] || []).push(a); });
      const pares = Object.values(porAluno).map(l => { l.sort((x, y) => x.data.localeCompare(y.data)); return { ini: l.find(x => x.momento === 'inicial') || l[0], atual: l[l.length - 1] }; }).filter(p => p.ini && p.atual && p.ini !== p.atual);
      const linhas = comp.map(c => {
        const ini = pares.map(p => p.ini.notas[c]).filter(Number.isFinite), at = pares.map(p => p.atual.notas[c]).filter(Number.isFinite);
        const melhorou = pares.filter(p => Number.isFinite(p.ini.notas[c]) && p.atual.notas[c] > p.ini.notas[c]).length;
        const media = a => a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length * 10) / 10 : null;
        return { competencia: c, nome: ICM.C.COMPETENCIAS[c], inicial: media(ini), atual: media(at), melhorou, pct: pares.length ? Math.round(melhorou / pares.length * 100) : 0 };
      });
      const algum = pares.filter(p => comp.some(c => p.atual.notas[c] > p.ini.notas[c])).length;
      return { alunos: pares.length, linhas, pct_geral: pares.length ? Math.round(algum / pares.length * 100) : 0 };
    },
    async painel() {
      need('social.gerir');
      const enc = await social.encaminhamentos({ abertos: true });
      const pias = await S().list('pia'); const al = await S().list('alunos');
      return { encSemRetorno: enc.filter(e => e.status === 'sem_retorno' || (e.status === 'enviado' && e.dias > 30)), encAbertos: enc, piasRevisar: pias.filter(p => p.revisar_em && p.revisar_em <= u().addDays(u().today(), 7)).map(p => ({ ...p, aluno_nome: (al.find(a => a.id === p.aluno_id) || {}).nome })), totalPia: pias.length };
    }
  };

  Object.assign(ICM.api, { financeiro, fornecedores, compras, lerNFe, depreciacao, captacao, social });
})();
