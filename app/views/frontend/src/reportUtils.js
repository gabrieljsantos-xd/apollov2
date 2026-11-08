export const orcamentoStatusLabels = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  convertido: "Convertido",
};

export const ordemStatusLabels = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  aguardando_pecas: "Aguardando peças",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const ORDEM_ABERTA = new Set(["aberta", "em_andamento", "aguardando_pecas"]);

export function sumValor(items) {
  return items.reduce((sum, item) => sum + Number(item.valor_total || 0), 0);
}

export function countByStatus(items) {
  return items.reduce((acc, item) => {
    const key = item.status || "desconhecido";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function sumByStatus(items) {
  return items.reduce((acc, item) => {
    const key = item.status || "desconhecido";
    acc[key] = (acc[key] || 0) + Number(item.valor_total || 0);
    return acc;
  }, {});
}

export function averageTicket(items) {
  if (!items.length) return 0;
  return sumValor(items) / items.length;
}

export function filterByPeriod(items, period, dateField = "created_at") {
  if (!period || period === "todos") return items;

  const now = new Date();
  const start = new Date(now);

  if (period === "7d") {
    start.setDate(now.getDate() - 7);
  } else if (period === "30d") {
    start.setDate(now.getDate() - 30);
  } else if (period === "mes") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    return items;
  }

  return items.filter((item) => {
    const raw = item[dateField] || item.created_at;
    if (!raw) return false;
    return new Date(raw) >= start;
  });
}

export function topClientesByValor(items, limit = 5) {
  const map = new Map();

  items.forEach((item) => {
    const key = item.cliente_id || item.cliente_nome || "sem-cliente";
    const current = map.get(key) || {
      cliente_id: item.cliente_id,
      cliente_nome: item.cliente_nome || "Cliente",
      quantidade: 0,
      valor_total: 0,
    };
    current.quantidade += 1;
    current.valor_total += Number(item.valor_total || 0);
    map.set(key, current);
  });

  return Array.from(map.values())
    .sort((a, b) => b.valor_total - a.valor_total)
    .slice(0, limit);
}

export function buildOrcamentoMetrics(orcamentos) {
  const porStatus = countByStatus(orcamentos);
  const valorPorStatus = sumByStatus(orcamentos);
  const convertidos = porStatus.convertido || 0;
  const aprovados = porStatus.aprovado || 0;
  const rejeitados = porStatus.rejeitado || 0;
  const decisao = convertidos + aprovados + rejeitados;
  const pipelineStatuses = ["rascunho", "enviado", "aprovado"];
  const pipeline = orcamentos.filter((item) => pipelineStatuses.includes(item.status));

  return {
    total: orcamentos.length,
    valorTotal: sumValor(orcamentos),
    ticketMedio: averageTicket(orcamentos),
    porStatus,
    valorPorStatus,
    pipelineQtd: pipeline.length,
    pipelineValor: sumValor(pipeline),
    taxaConversao: decisao ? (convertidos / decisao) * 100 : 0,
    taxaAprovacao: decisao ? ((convertidos + aprovados) / decisao) * 100 : 0,
    recentes: [...orcamentos]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 6),
    topClientes: topClientesByValor(orcamentos),
  };
}

export function buildFinanceiroMetrics(ordens, pecas = []) {
  const concluidas = ordens.filter((item) => item.status === "concluida");
  const abertas = ordens.filter((item) => ORDEM_ABERTA.has(item.status));
  const canceladas = ordens.filter((item) => item.status === "cancelada");
  const estoqueCusto = pecas.reduce(
    (sum, peca) => sum + Number(peca.quantidade_estoque || 0) * Number(peca.preco_custo || 0),
    0
  );
  const estoqueVenda = pecas.reduce(
    (sum, peca) => sum + Number(peca.quantidade_estoque || 0) * Number(peca.preco_venda || 0),
    0
  );
  const estoqueBaixo = pecas.filter(
    (peca) => Number(peca.quantidade_estoque || 0) <= Number(peca.estoque_minimo || 0)
  ).length;

  return {
    totalOrdens: ordens.length,
    receita: sumValor(concluidas),
    backlogValor: sumValor(abertas),
    backlogQtd: abertas.length,
    canceladoValor: sumValor(canceladas),
    ticketMedio: averageTicket(concluidas),
    concluidasQtd: concluidas.length,
    porStatus: countByStatus(ordens),
    valorPorStatus: sumByStatus(ordens),
    estoqueCusto,
    estoqueVenda,
    margemPotencial: estoqueVenda - estoqueCusto,
    estoqueBaixo,
    recentes: [...ordens]
      .sort((a, b) => new Date(b.data_abertura || b.created_at || 0) - new Date(a.data_abertura || a.created_at || 0))
      .slice(0, 6),
    topClientes: topClientesByValor(concluidas),
  };
}

export function statusBreakdownRows(porStatus, valorPorStatus, labels) {
  const total = Object.values(porStatus).reduce((sum, value) => sum + value, 0) || 1;

  return Object.keys(labels).map((status) => {
    const quantidade = porStatus[status] || 0;
    return {
      status,
      label: labels[status],
      quantidade,
      valor: valorPorStatus[status] || 0,
      percentual: (quantidade / total) * 100,
    };
  });
}
