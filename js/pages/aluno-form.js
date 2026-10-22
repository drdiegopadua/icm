/* Matrícula / edição de aluno — formulário em etapas */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc } = ICM.util;
  const F = o => ICM.ui.field(o);

  const STEPS = [
    { k: 'pessoal', t: 'Dados do aluno', icon: 'user' },
    { k: 'familia', t: 'Responsável e endereço', icon: 'home' },
    { k: 'social', t: 'Social e financeiro', icon: 'wallet' },
    { k: 'saude', t: 'Saúde', icon: 'heartPulse' },
    { k: 'escola', t: 'Escolaridade', icon: 'school' },
    { k: 'final', t: 'Turmas e termos', icon: 'clipboardCheck' }
  ];

  ICM.pages.alunoForm = async function (el, params) {
    if (!ICM.auth.can('alunos.editar')) { el.innerHTML = ICM.ui.empty('Seu perfil não pode cadastrar alunos.', 'lock'); return; }
    const editing = !!params.id;
    const a = editing ? await ICM.api.alunos.get(params.id) : { endereco: {}, responsavel: {}, social: { beneficios: [] }, financeiro: { isencao: true }, saude: { apto_atividade_fisica: true, plano_saude: 'SUS' }, escolaridade: {}, autorizacoes: { lgpd: false, imagem: false } };
    const turmas = await ICM.api.turmas.list();
    const projetos = await ICM.api.projetos.list();
    ICM.app.setCrumbs([['Alunos', '#/alunos'], [editing ? a.nome : 'Nova matrícula']]);
    let foto = a.foto || '';
    let step = 0;

    const s = a.social || {}, fi = a.financeiro || {}, sa = a.saude || {}, es = a.escolaridade || {}, en = a.endereco || {}, re = a.responsavel || {}, au = a.autorizacoes || {};
    const BENEF = ['Bolsa Família', 'BPC', 'Tarifa Social', 'Auxílio municipal', 'Pé-de-Meia', 'Outro'];

    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">${editing ? 'Editar cadastro' : 'Nova matrícula'}</h1><div class="page-sub">${editing ? esc(a.matricula) : 'O número de matrícula é gerado automaticamente ao salvar'}</div></div>
        <a class="btn" href="${editing ? `#/alunos/${esc(a.id)}` : '#/alunos'}">${I('x', 18)} Cancelar</a></div>

      <div class="steps card flat mb-4">${STEPS.map((st, i) => `<button type="button" class="step" data-step="${i}"><span class="step-n">${I(st.icon, 16)}</span><span class="step-t">${esc(st.t)}</span></button>`).join('')}<div class="step-bar"><span></span></div></div>

      <form class="card" novalidate>
        <section data-sec="0" class="grid grid-3">
          <div class="span-all row" style="gap:20px">
            <label class="avatar-pick" title="Foto do aluno">${ICM.util.avatar(a.nome || '?', foto, 'lg')}<span class="pick">${I('camera', 16)}</span><input type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
            <div class="grow grid grid-2">
              ${F({ name: 'nome', label: 'Nome completo', value: a.nome, required: true, cls: 'span-2' })}
              ${F({ name: 'nome_social', label: 'Nome social', value: a.nome_social })}
              ${F({ name: 'nascimento', label: 'Data de nascimento', type: 'date', value: a.nascimento, required: true })}
            </div>
          </div>
          ${F({ name: 'sexo', label: 'Sexo', type: 'select', value: a.sexo, options: [['', 'Selecione'], ['F', 'Feminino'], ['M', 'Masculino'], ['O', 'Outro / prefere não informar']] })}
          ${F({ name: 'cor_raca', label: 'Cor / raça (IBGE)', type: 'select', value: a.cor_raca, options: ['', 'Branca', 'Preta', 'Parda', 'Amarela', 'Indígena', 'Não declarada'] })}
          ${F({ name: 'cpf', label: 'CPF', value: a.cpf, placeholder: '000.000.000-00', attrs: 'inputmode="numeric" maxlength="14"' })}
          ${F({ name: 'rg', label: 'RG / certidão', value: a.rg })}
          ${F({ name: 'nis', label: 'NIS (CadÚnico)', value: a.nis })}
          ${F({ name: 'telefone', label: 'Telefone do aluno', value: a.telefone, placeholder: '(00) 00000-0000' })}
          ${F({ name: 'email', label: 'E-mail', type: 'email', value: a.email })}
          ${F({ name: 'status', label: 'Situação', type: 'select', value: a.status || 'ativo', options: Object.entries(ICM.C.STATUS_ALUNO).map(([k, v]) => [k, v.nome]) })}
          ${F({ name: 'data_matricula', label: 'Data da matrícula', type: 'date', value: a.data_matricula || ICM.util.today() })}
        </section>

        <section data-sec="1" class="grid grid-3" hidden>
          <div class="span-all section-title">${I('users', 18)} Responsável legal</div>
          ${F({ name: 'responsavel.nome', label: 'Nome do responsável', value: re.nome, required: true, cls: 'span-2' })}
          ${F({ name: 'responsavel.parentesco', label: 'Parentesco', type: 'select', value: re.parentesco, options: ['', 'Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Irmã(o)', 'Tutor(a) legal', 'Outro'] })}
          ${F({ name: 'responsavel.telefone', label: 'Telefone / WhatsApp', value: re.telefone, required: true })}
          ${F({ name: 'responsavel.cpf', label: 'CPF do responsável', value: re.cpf })}
          ${F({ name: 'responsavel.profissao', label: 'Profissão / ocupação', value: re.profissao })}
          <div class="span-all section-title mt-4">${I('pin', 18)} Endereço</div>
          ${F({ name: 'endereco.cep', label: 'CEP', value: en.cep })}
          ${F({ name: 'endereco.logradouro', label: 'Logradouro', value: en.logradouro, cls: 'span-2' })}
          ${F({ name: 'endereco.numero', label: 'Número', value: en.numero })}
          ${F({ name: 'endereco.bairro', label: 'Bairro', value: en.bairro })}
          ${F({ name: 'endereco.cidade', label: 'Cidade', value: en.cidade })}
        </section>

        <section data-sec="2" class="grid grid-3" hidden>
          <div class="span-all sens-lock">${I('lock', 18)} Dados sensíveis — visíveis apenas para coordenação, secretaria e direção (LGPD).</div>
          <div class="span-all section-title">${I('home', 18)} Situação social</div>
          ${F({ name: 'social.pessoas_casa', label: 'Pessoas na residência', type: 'number', value: s.pessoas_casa, attrs: 'min="1" max="30"' })}
          ${F({ name: 'social.moradia', label: 'Moradia', type: 'select', value: s.moradia, options: ['', 'Própria', 'Alugada', 'Cedida', 'Ocupação', 'Abrigo', 'Outra'] })}
          ${F({ name: 'social.cras', label: 'Acompanhado(a) pelo CRAS/CREAS?', type: 'select', value: s.cras, options: ['', 'Sim', 'Não', 'Não sabe'] })}
          ${F({ name: 'social.cadunico', label: 'Família inscrita no CadÚnico', type: 'toggle', value: s.cadunico, hint: 'Alunos fora do CadÚnico participam como associados (mensalidade).', cls: 'span-2' })}          <div class="field span-all"><span class="label">Benefícios sociais</span><div class="row wrap">${BENEF.map(b => `<label class="check"><input type="checkbox" name="social.beneficios" value="${esc(b)}" data-multi ${(s.beneficios || []).includes(b) ? 'checked' : ''}> ${esc(b)}</label>`).join('')}</div></div>
          ${F({ name: 'social.vulnerabilidades', label: 'Situações de vulnerabilidade', type: 'textarea', value: s.vulnerabilidades, cls: 'span-all', rows: 3 })}
          <div class="span-all section-title mt-4">${I('wallet', 18)} Situação financeira</div>
          ${F({ name: 'financeiro.renda_familiar', label: 'Renda familiar mensal (R$)', type: 'number', value: fi.renda_familiar, attrs: 'min="0" step="0.01"' })}
          ${F({ name: 'financeiro.fonte_renda', label: 'Principal fonte de renda', type: 'select', value: fi.fonte_renda, options: ['', 'Trabalho formal', 'Trabalho informal', 'Benefícios', 'Aposentadoria/pensão', 'Sem renda'] })}
          <div class="field"><span class="label">Renda per capita</span><div class="input" data-percapita style="display:flex;align-items:center">—</div></div>
          ${F({ name: 'financeiro.isencao', label: 'Isento(a) de contribuição', type: 'toggle', value: fi.isencao })}
          ${F({ name: 'financeiro.contribuicao_mensal', label: 'Contribuição mensal (R$)', type: 'number', value: fi.contribuicao_mensal, attrs: 'min="0" step="0.01"' })}
          ${F({ name: 'financeiro.observacoes', label: 'Observações financeiras', value: fi.observacoes })}
        </section>

        <section data-sec="3" class="grid grid-3" hidden>
          <div class="span-all sens-lock">${I('lock', 18)} Professores veem apenas alergias, medicamentos, condições e contato de emergência.</div>
          ${F({ name: 'saude.tipo_sanguineo', label: 'Tipo sanguíneo', type: 'select', value: sa.tipo_sanguineo, options: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não informado'] })}
          ${F({ name: 'saude.plano_saude', label: 'Plano de saúde', value: sa.plano_saude })}
          ${F({ name: 'saude.ubs', label: 'UBS de referência', value: sa.ubs })}
          ${F({ name: 'saude.alergias', label: 'Alergias', value: sa.alergias, placeholder: 'Medicamentos, alimentos, picadas…' })}
          ${F({ name: 'saude.medicamentos', label: 'Medicamentos de uso contínuo', value: sa.medicamentos })}
          ${F({ name: 'saude.condicoes', label: 'Condições de saúde / diagnósticos', value: sa.condicoes, placeholder: 'Asma, TDAH, TEA, diabetes…' })}
          ${F({ name: 'saude.deficiencia', label: 'Deficiência (PcD)', value: sa.deficiencia })}
          ${F({ name: 'saude.contato_emergencia', label: 'Contato de emergência', value: sa.contato_emergencia, placeholder: 'Nome e telefone' })}
          ${F({ name: 'saude.apto_atividade_fisica', label: 'Apto(a) para atividade física', type: 'toggle', value: sa.apto_atividade_fisica })}
          ${F({ name: 'saude.observacoes', label: 'Observações de saúde', type: 'textarea', value: sa.observacoes, cls: 'span-all', rows: 3 })}
        </section>

        <section data-sec="4" class="grid grid-3" hidden>
          ${F({ name: 'escolaridade.escola', label: 'Escola', value: es.escola, cls: 'span-2' })}
          ${F({ name: 'escolaridade.rede', label: 'Rede', type: 'select', value: es.rede, options: ['', 'Municipal', 'Estadual', 'Federal', 'Particular', 'Não estuda'] })}
          ${F({ name: 'escolaridade.serie', label: 'Ano / série', value: es.serie })}
          ${F({ name: 'escolaridade.turno', label: 'Turno escolar', type: 'select', value: es.turno, options: ['', 'Manhã', 'Tarde', 'Integral', 'Noite'] })}
          ${F({ name: 'escolaridade.desempenho', label: 'Desempenho escolar', type: 'select', value: es.desempenho, options: ['', 'Ótimo', 'Bom', 'Regular', 'Precisa de apoio'] })}
          ${F({ name: 'escolaridade.observacoes', label: 'Observações escolares', type: 'textarea', value: es.observacoes, cls: 'span-all', rows: 3 })}
        </section>

        <section data-sec="5" class="grid grid-2" hidden>
          ${editing ? `<div class="span-all sens-lock" style="background:var(--primary-soft);color:var(--primary)">${I('info', 18)} Para incluir ou retirar o aluno de turmas, use a aba "Turmas" na ficha do aluno ou a página da turma.</div>` : `
          <div class="span-all"><div class="section-title">${I('layers', 18)} Incluir nas turmas</div>
            <div class="grid grid-2">${turmas.map(t => { const p = projetos.find(x => x.id === t.projeto_id) || {}; return `<label class="check card flat" style="padding:14px"><input type="checkbox" name="_turmas" value="${esc(t.id)}" data-multi><span><b>${esc(t.nome)}</b><br><span class="xs muted">${esc(p.nome || '')} · ${esc(t.faixa || '')}</span></span></label>`; }).join('')}</div></div>`}
          <div class="span-all section-title mt-4">${I('shield', 18)} Termos e autorizações</div>
          ${F({ name: 'autorizacoes.lgpd', label: 'Termo de consentimento LGPD assinado pelo responsável', type: 'toggle', value: au.lgpd })}
          ${F({ name: 'autorizacoes.imagem', label: 'Autoriza uso de imagem (fotos em relatórios e redes)', type: 'toggle', value: au.imagem })}
          ${F({ name: 'autorizacoes.saida_sozinho', label: 'Autorizado(a) a sair sozinho(a)', type: 'toggle', value: au.saida_sozinho })}
          ${F({ name: 'autorizacoes.data_termo', label: 'Data de assinatura dos termos', type: 'date', value: au.data_termo || ICM.util.today() })}
        </section>

        <div class="row between mt-6">
          <button type="button" class="btn" data-prev>${I('chevronLeft', 18)} Voltar</button>
          <div class="row"><span class="xs muted" data-stepinfo></span>
            <button type="button" class="btn btn-primary" data-next>Avançar ${I('chevronRight', 18)}</button>
            <button type="submit" class="btn btn-primary" data-save hidden>${I('check', 18)} ${editing ? 'Salvar alterações' : 'Concluir matrícula'}</button>
          </div>
        </div>
      </form>
    </div>`;

    const form = el.querySelector('form');
    const secs = el.querySelectorAll('[data-sec]');
    const stepsBtns = el.querySelectorAll('[data-step]');

    function go(i) {
      step = Math.max(0, Math.min(STEPS.length - 1, i));
      secs.forEach(sx => { const on = +sx.dataset.sec === step; sx.hidden = !on; if (on) { sx.classList.remove('tab-panel'); void sx.offsetWidth; sx.classList.add('tab-panel'); } });
      stepsBtns.forEach((b, k) => { b.classList.toggle('active', k === step); b.classList.toggle('done', k < step); });
      el.querySelector('.step-bar span').style.width = `${(step / (STEPS.length - 1)) * 100}%`;
      el.querySelector('[data-prev]').disabled = step === 0;
      el.querySelector('[data-next]').hidden = step === STEPS.length - 1;
      el.querySelector('[data-save]').hidden = step !== STEPS.length - 1 && !editing;
      el.querySelector('[data-stepinfo]').textContent = `Etapa ${step + 1} de ${STEPS.length}`;
    }
    stepsBtns.forEach(b => b.addEventListener('click', () => go(+b.dataset.step)));
    el.querySelector('[data-prev]').addEventListener('click', () => go(step - 1));
    el.querySelector('[data-next]').addEventListener('click', () => { if (validate(step)) go(step + 1); });

    // Renda per capita automática
    const pc = () => { const r = Number(form['financeiro.renda_familiar'].value || 0), p = Number(form['social.pessoas_casa'].value || 0); el.querySelector('[data-percapita]').textContent = r && p ? ICM.util.money(r / p) : '—'; };
    form['financeiro.renda_familiar'].addEventListener('input', pc); form['social.pessoas_casa'].addEventListener('input', pc); pc();

    // Máscara CPF
    ['cpf', 'responsavel.cpf'].forEach(n => form[n].addEventListener('input', e => {
      const d = e.target.value.replace(/\D/g, '').slice(0, 11);
      e.target.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }));

    // Foto
    const pick = el.querySelector('.avatar-pick input');
    pick.addEventListener('change', async () => {
      try { foto = await ICM.util.compressImage(pick.files[0], 400, .82); el.querySelector('.avatar-pick .avatar').innerHTML = `<img src="${esc(foto)}" alt="">`; }
      catch (e) { ICM.ui.toast(e.message, 'danger'); }
    });

    function validate(i) {
      const sec = secs[i]; let ok = true;
      sec.querySelectorAll('[required]').forEach(inp => {
        const f = inp.closest('.field'); const bad = !inp.value.trim();
        f.classList.toggle('invalid', bad); if (bad) ok = false;
      });
      if (i === 0 && form.cpf.value && !ICM.util.cpfValido(form.cpf.value)) { form.cpf.closest('.field').classList.add('invalid'); ICM.ui.toast('CPF inválido.', 'danger'); return false; }
      if (!ok) ICM.ui.toast('Preencha os campos obrigatórios.', 'warn');
      return ok;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      for (let i = 0; i < STEPS.length; i++) if (!validate(i)) { go(i); return; }
      const data = ICM.util.formData(form);
      const turmasSel = data._turmas || []; delete data._turmas;
      if (!data.autorizacoes.lgpd && !(await ICM.ui.confirm({ title: 'Termo LGPD não assinado', text: 'O termo de consentimento LGPD ainda não foi marcado como assinado. Deseja salvar mesmo assim? Ele deverá ser coletado o quanto antes.', ok: 'Salvar mesmo assim' }))) return;
      data.foto = foto;
      if (data.financeiro && data.social) data.financeiro.renda_per_capita = data.social.pessoas_casa ? Math.round((data.financeiro.renda_familiar || 0) / data.social.pessoas_casa) : null;
      if (editing) data.id = a.id;
      const btn = el.querySelector('[data-save]');
      await ICM.ui.busy(btn, () => ICM.ui.run(async () => {
        const r = await ICM.api.alunos.save(editing ? { ...mergeFull(a, data) } : data);
        for (const t of turmasSel) { try { await ICM.api.turmas.incluirAluno(t, r.id, r.data_matricula); } catch (er) { ICM.ui.toast(er.message, 'warn'); } }
        ICM.ui.toast(editing ? 'Cadastro atualizado!' : `Matrícula ${r.matricula} concluída!`, 'ok');
        location.hash = `#/alunos/${r.id}`;
      }));
    });

    // Preserva subcampos não presentes no formulário
    function mergeFull(orig, data) {
      const out = { ...orig, ...data };
      ['endereco', 'responsavel', 'social', 'financeiro', 'saude', 'escolaridade', 'autorizacoes'].forEach(k => { out[k] = { ...(orig[k] || {}), ...(data[k] || {}) }; });
      delete out._restrito; return out;
    }

    go(0);
    if (editing) el.querySelector('[data-save]').hidden = false;
  };
})();
