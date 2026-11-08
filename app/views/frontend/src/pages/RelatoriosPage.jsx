import { useEffect, useMemo, useState } from "react";
import { apiRequest, formatCurrency, formatDate } from "../api";
import {
  buildFinanceiroMetrics,
  buildOrcamentoMetrics,
  filterByPeriod,
  orcamentoStatusLabels,
  ordemStatusLabels,
  statusBreakdownRows,
} from "../reportUtils";

const tabs = [
  { id: "orcamento", label: "Dash orçamento" },
  { id: "financeiro", label: "Dash financeiro" },
];

export default function RelatoriosPage() {
  const [tab, setTab] = useState("orcamento");
  const [period, setPeriod] = useState("30d");
  const [orcamentos, setOrcamentos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [orcamentosData, ordensData, pecasData] = await Promise.all([
          apiRequest("/orcamentos"),
          apiRequest("/ordens-servico"),
          apiRequest("/pecas?per_page=100"),
        ]);
        setOrcamentos(orcamentosData);
        setOrdens(ordensData);
        setPecas(pecasData.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredOrcamentos = useMemo(
    () => filterByPeriod(orcamentos, period, "created_at"),
    [orcamentos, period]
  );
  const filteredOrdens = useMemo(
    () => filterByPeriod(ordens, period, "data_abertura"),
    [ordens, period]
  );

  const orcamentoMetrics = useMemo(
    () => buildOrcamentoMetrics(filteredOrcamentos),
    [filteredOrcamentos]
  );
  const financeiroMetrics = useMemo(
    () => buildFinanceiroMetrics(filteredOrdens, pecas),
    [filteredOrdens, pecas]
  );

  const orcamentoBreakdown = useMemo(
    () => statusBreakdownRows(
      orcamentoMetrics.porStatus,
      orcamentoMetrics.valorPorStatus,
      orcamentoStatusLabels
    ),
    [orcamentoMetrics]
  );
  const financeiroBreakdown = useMemo(
    () => statusBreakdownRows(
      financeiroMetrics.porStatus,
      financeiroMetrics.valorPorStatus,
      ordemStatusLabels
    ),
    [financeiroMetrics]
  );

  return (
    <section className="page stock-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Análises</p>
          <h1>Relatórios</h1>
        </div>
      </div>

      {error && <div className="banner erro">{error}</div>}

      <div className="report-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "ativo" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="panel filters-panel">
        <div className="panel-heading">
          <h2>Filtro de período</h2>
          <small>
            {tab === "orcamento"
              ? "Baseado na criação do orçamento"
              : "Baseado na abertura da OS"}
          </small>
        </div>
        <div className="filters-grid">
          <label className="filter-field">
            <span>Intervalo</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="todos">Todo o período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="mes">Mês atual</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="table-loading">Carregando relatórios...</div>
      ) : tab === "orcamento" ? (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-icon blue">▤</div>
              <small>Total de orçamentos</small>
              <strong>{orcamentoMetrics.total}</strong>
              <span>{formatCurrency(orcamentoMetrics.valorTotal)} no período</span>
            </div>
            <div className="stat">
              <div className="stat-icon orange">◷</div>
              <small>Pipeline comercial</small>
              <strong>{formatCurrency(orcamentoMetrics.pipelineValor)}</strong>
              <span>{orcamentoMetrics.pipelineQtd} em andamento</span>
            </div>
            <div className="stat">
              <div className="stat-icon green">✓</div>
              <small>Taxa de conversão</small>
              <strong>{orcamentoMetrics.taxaConversao.toFixed(1)}%</strong>
              <span>aprovação {orcamentoMetrics.taxaAprovacao.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <div className="stat-icon purple">⌀</div>
              <small>Ticket médio</small>
              <strong>{formatCurrency(orcamentoMetrics.ticketMedio)}</strong>
              <span>por orçamento</span>
            </div>
          </div>

          <div className="split">
            <div className="panel">
              <div className="panel-heading">
                <h2>Funil por status</h2>
              </div>
              <div className="breakdown-list">
                {orcamentoBreakdown.map((row) => (
                  <div className="breakdown-row" key={row.status}>
                    <div className="breakdown-meta">
                      <span className={`status status-${row.status}`}>{row.label}</span>
                      <strong>{formatCurrency(row.valor)}</strong>
                    </div>
                    <div className="breakdown-bar">
                      <i style={{ width: `${Math.max(row.percentual, row.quantidade ? 4 : 0)}%` }} />
                    </div>
                    <small>{row.quantidade} orçamentos · {row.percentual.toFixed(0)}%</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-heading">
                <h2>Top clientes por valor</h2>
              </div>
              {orcamentoMetrics.topClientes.length === 0 ? (
                <div className="table-loading">Sem dados no período.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Qtd</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orcamentoMetrics.topClientes.map((cliente) => (
                        <tr key={`${cliente.cliente_id}-${cliente.cliente_nome}`}>
                          <td>{cliente.cliente_nome}</td>
                          <td>{cliente.quantidade}</td>
                          <td>{formatCurrency(cliente.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="panel orders">
            <div className="panel-heading">
              <h2>Detalhamento de orçamentos</h2>
              <small>{filteredOrcamentos.length} registros</small>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Veículo</th>
                    <th>Status</th>
                    <th>Criado em</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrcamentos.length === 0 ? (
                    <tr>
                      <td colSpan="6">Nenhum orçamento no período.</td>
                    </tr>
                  ) : (
                    filteredOrcamentos.map((orcamento) => (
                      <tr key={orcamento.id}>
                        <td>#{orcamento.id}</td>
                        <td>{orcamento.cliente_nome}</td>
                        <td>{orcamento.veiculo_placa}</td>
                        <td>
                          <span className={`status status-${orcamento.status}`}>
                            {orcamentoStatusLabels[orcamento.status] || orcamento.status}
                          </span>
                        </td>
                        <td>{formatDate(orcamento.created_at)}</td>
                        <td>{formatCurrency(orcamento.valor_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-icon green">$</div>
              <small>Receita realizada</small>
              <strong>{formatCurrency(financeiroMetrics.receita)}</strong>
              <span>{financeiroMetrics.concluidasQtd} OS concluídas</span>
            </div>
            <div className="stat">
              <div className="stat-icon orange">◷</div>
              <small>Valor em aberto</small>
              <strong>{formatCurrency(financeiroMetrics.backlogValor)}</strong>
              <span>{financeiroMetrics.backlogQtd} ordens ativas</span>
            </div>
            <div className="stat">
              <div className="stat-icon blue">⌀</div>
              <small>Ticket médio</small>
              <strong>{formatCurrency(financeiroMetrics.ticketMedio)}</strong>
              <span>por OS concluída</span>
            </div>
            <div className="stat">
              <div className="stat-icon purple">Δ</div>
              <small>Margem do estoque</small>
              <strong>{formatCurrency(financeiroMetrics.margemPotencial)}</strong>
              <span>venda − custo</span>
            </div>
          </div>

          <div className="split">
            <div className="panel">
              <div className="panel-heading">
                <h2>OS por status</h2>
              </div>
              <div className="breakdown-list">
                {financeiroBreakdown.map((row) => (
                  <div className="breakdown-row" key={row.status}>
                    <div className="breakdown-meta">
                      <span className={`status status-${row.status}`}>{row.label}</span>
                      <strong>{formatCurrency(row.valor)}</strong>
                    </div>
                    <div className="breakdown-bar">
                      <i style={{ width: `${Math.max(row.percentual, row.quantidade ? 4 : 0)}%` }} />
                    </div>
                    <small>{row.quantidade} ordens · {row.percentual.toFixed(0)}%</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-heading">
                <h2>Capital em estoque</h2>
              </div>
              <div className="summary-list">
                <div className="summary-row">
                  <span>Valor a custo</span>
                  <strong>{formatCurrency(financeiroMetrics.estoqueCusto)}</strong>
                </div>
                <div className="summary-row">
                  <span>Valor a venda</span>
                  <strong>{formatCurrency(financeiroMetrics.estoqueVenda)}</strong>
                </div>
                <div className="summary-row">
                  <span>Margem potencial</span>
                  <strong>{formatCurrency(financeiroMetrics.margemPotencial)}</strong>
                </div>
                <div className="summary-row">
                  <span>Itens com estoque baixo</span>
                  <strong>{financeiroMetrics.estoqueBaixo}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="panel orders">
            <div className="panel-heading">
              <h2>Detalhamento financeiro das OS</h2>
              <small>{filteredOrdens.length} registros</small>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>OS</th>
                    <th>Cliente</th>
                    <th>Status</th>
                    <th>Abertura</th>
                    <th>Conclusão</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrdens.length === 0 ? (
                    <tr>
                      <td colSpan="6">Nenhuma ordem no período.</td>
                    </tr>
                  ) : (
                    filteredOrdens.map((ordem) => (
                      <tr key={ordem.id}>
                        <td>#{ordem.id}</td>
                        <td>{ordem.cliente_nome}</td>
                        <td>
                          <span className={`status status-${ordem.status}`}>
                            {ordemStatusLabels[ordem.status] || ordem.status}
                          </span>
                        </td>
                        <td>{formatDate(ordem.data_abertura || ordem.created_at)}</td>
                        <td>{formatDate(ordem.data_conclusao)}</td>
                        <td>{formatCurrency(ordem.valor_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}