/* Aviso automático de faltas: logo depois de salvar uma chamada, se algum aluno que faltou
   chegou a 2 faltas no mês (alerta) ou 3 (pode perder a vaga), a tela já mostra a mensagem
   pronta para o WhatsApp do responsável. Usa a mesma regra e os mesmos modelos da tela Avisos. */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc } = ICM.util;

  ICM.pages._avisosFaltas = async function (turmaId, presencas) {
    try {
      if (!ICM.auth.can('avisos.enviar') || !navigator.onLine) return;
      const faltaram = Object.entries(presencas || {}).filter(([, v]) => v === 'F').map(([id]) => id);
      if (!faltaram.length) return;
      const pend = await ICM.api.avisos.pendentes();
      const itens = pend.filter(p => p.tipo.startsWith('falta') && !p.enviado && faltaram.includes(p.aluno_id) && String(p.key).includes(`:${turmaId}:`));
      if (!itens.length) return;
      const m = ICM.ui.modal({
        title: 'Avisar a família sobre as faltas', size: 'sm',
        body: `<p class="small muted mb-4">${itens.length === 1 ? 'Este aluno chegou' : 'Estes alunos chegaram'} ao limite de faltas do mês. A mensagem já está pronta — é só abrir no WhatsApp e enviar.</p>
          <div class="col">${itens.map(it => `<div class="list-item"><span class="badge ${it.tipo === 'falta_desligamento' ? 'danger' : 'warn'}">${it.tipo === 'falta_desligamento' ? 'Pode perder a vaga' : 'Alerta'}</span>
            <div class="grow"><b>${esc(it.aluno)}</b><div class="xs muted">${esc(it.contexto || '')} · ${esc(it.responsavel || 'responsável sem nome')}</div></div>${ICM.wa.btn(it, { label: 'Enviar' })}</div>`).join('')}</div>
          <p class="xs muted mt-4">${I('info', 13)} Se preferir enviar depois, eles continuam em Comunidade → Avisos e na Rotina do dia.</p>`,
        foot: '<button class="btn" data-close>Depois</button>'
      });
      // Ao enviar um, marca na lista
      const marcar = e => {
        if (!document.body.contains(m.el)) { document.removeEventListener('icm:wa-enviado', marcar); return; }
        const i = itens.findIndex(x => x.key === (e.detail || {}).key); if (i < 0) return;
        const b = m.el.querySelectorAll('.list-item')[i].querySelector('.btn-wa');
        if (b) b.replaceWith(Object.assign(document.createElement('span'), { className: 'badge ok', textContent: 'Enviado' }));
      };
      document.addEventListener('icm:wa-enviado', marcar);
    } catch (e) { /* aviso é um extra: nunca atrapalha o salvamento da chamada */ }
  };
})();
