/* Calendário letivo: feriados, recessos e marcos. Alimenta o App do Instituto. */
(function () {
  const S = () => ICM.store;
  const { need, audit } = ICM.api._h;

  const calendario = {
    async list(ano) {
      const l = await S().list('calendario');
      return l.filter(e => !ano || String(e.inicio).startsWith(ano) || String(e.fim || '').startsWith(ano)).sort((a, b) => a.inicio.localeCompare(b.inicio));
    },
    async save(e) {
      need('calendario.editar');
      if (!e.titulo) throw new Error('Informe o título.');
      if (!e.inicio) throw new Error('Informe a data.');
      if (e.fim && e.fim < e.inicio) throw new Error('O fim não pode ser antes do início.');
      if (!e.fim) e = { ...e, fim: null };
      const r = e.id ? await S().update('calendario', e.id, e) : await S().insert('calendario', e);
      await audit(e.id ? 'editar' : 'criar', 'calendario', r.id, `Calendário: ${r.titulo}`);
      return r;
    },
    async remove(id) {
      need('calendario.editar');
      await S().remove('calendario', id);
      await audit('excluir', 'calendario', id, 'Item do calendário excluído');
    }
  };

  Object.assign(ICM.api, { calendario });
})();
