import { useEffect, useMemo, useState } from "react";
import { apiRequest, formatCurrency, formatDate } from "../api";
import {
  buildFinanceiroMetrics,
  filterByPeriod,
  ordemStatusLabels,
  statusBreakdownRows,
} from "../reportUtils";

export default function FinanceiroPage() {
  const [ordens, setOrdens] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [period, setPeriod] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [ordensData, pecasData] = await Promise.all([
          apiRequest("/ordens-servico"),
          apiRequest("/pecas?per_page=100"),
        ]);
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

  const filteredOrdens = useMemo(
    () => filterByPeriod(ordens, period, "data_abertura"),
    [ordens, period]
  );
  const metrics = useMemo(
    () => buildFinanceiroMetrics(filteredOrdens, pecas),
    [filteredOrdens, pecas]
  );
  const breakdown = useMemo(
    () => statusBreakdownRows(metrics.porStatus, metrics.valorPorStatus, ordemStatusLabels),
    [metrics]
  );

  return (
    <section className="page stock-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Financeiro</p>
          <h1>Dashboard financeiro</h1>
        </div>
      </div>

      {error && <div className="banner erro">{error}</div>}

      <div className="panel filters-panel">
        <div className="panel-heading">
          <h2>Período</h2>
          <small>Baseado na abertura das OS</small>
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
        <div className="table-loading">Carregando dados financeiros...</div>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-icon green">$</div>
              <small>Receita realizada</small>
              <strong>{formatCurrency(metrics.receita)}</strong>
              <span className="positive">{metrics.concluidasQtd} OS concluídas</span>
            </div>
            <div className="stat">
              <div className="stat-icon orange">◷</div>
              <small>Backlog em aberto</small>
              <strong>{formatCurrency(metrics.backlogValor)}</strong>
              <span>{metrics.backlogQtd} ordens ativas</span>
            </div>
            <div className="stat">
              <div className="stat-icon blue">⌀</div>
              <small>Ticket médio</small>
              <strong>{formatCurrency(metrics.ticketMedio)}</strong>
              <span>por OS concluída</span>
            </div>
            <div className="stat">
              <div className="stat-icon purple">↻</div>
              <small>Cancelado</small>
              <strong>{formatCurrency(metrics.canceladoValor)}</strong>
              <span>{metrics.porStatus.cancelada || 0} ordens</span>
            </div>
          </div>

          <div className="stats stock-finance-stats">
            <div className="stat">
              <div className="stat-icon blue">◫</div>
              <small>Estoque a custo</small>
              <strong>{formatCurrency(metrics.estoqueCusto)}</strong>
              <span>capital imobilizado</span>
            </div>
            <div className="stat">
              <div className="stat-icon green">↗</div>
              <small>Estoque a venda</small>
              <strong>{formatCurrency(metrics.estoqueVenda)}</strong>
              <span>potencial de faturamento</span>
            </div>
            <div className="stat">
              <div className="stat-icon purple">Δ</div>
              <small>Margem potencial</small>
              <strong>{formatCurrency(metrics.margemPotencial)}</strong>
              <span className="positive">venda − custo</span>
            </div>
            <div className="stat">
              <div className="stat-icon orange">⚠</div>
              <small>Estoque baixo</small>
              <strong>{metrics.estoqueBaixo}</strong>
              <span>itens no mínimo</span>
            </div>
          </div>

          <div className="split">
            <div className="panel">
              <div className="panel-heading">
                <h2>Distribuição por status</h2>
                <small>{filteredOrdens.length} OS no período</small>
              </div>
              <div className="breakdown-list">
                {breakdown.map((row) => (
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
                <h2>Top clientes por receita</h2>
              </div>
              {metrics.topClientes.length === 0 ? (
                <div className="table-loading">Sem OS concluídas no período.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>OS</th>
                        <th>Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.topClientes.map((cliente) => (
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
              <h2>Últimas ordens do período</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>OS</th>
                    <th>Cliente</th>
                    <th>Veículo</th>
                    <th>Status</th>
                    <th>Abertura</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentes.length === 0 ? (
                    <tr>
                      <td colSpan="6">Nenhuma ordem no período selecionado.</td>
                    </tr>
                  ) : (
                    metrics.recentes.map((ordem) => (
                      <tr key={ordem.id}>
                        <td>#{ordem.id}</td>
                        <td>{ordem.cliente_nome}</td>
                        <td>{ordem.veiculo_placa}</td>
                        <td>
                          <span className={`status status-${ordem.status}`}>
                            {ordemStatusLabels[ordem.status] || ordem.status}
                          </span>
                        </td>
                        <td>{formatDate(ordem.data_abertura || ordem.created_at)}</td>
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
