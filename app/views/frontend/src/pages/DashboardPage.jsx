import { useEffect, useMemo, useState } from "react";
import { apiRequest, formatCurrency, formatDate } from "../api";
import {
  buildFinanceiroMetrics,
  buildOrcamentoMetrics,
  orcamentoStatusLabels,
  ordemStatusLabels,
} from "../reportUtils";

export default function DashboardPage({ onNavigate }) {
  const [orcamentos, setOrcamentos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [orcamentosData, ordensData, clientesData] = await Promise.all([
          apiRequest("/orcamentos"),
          apiRequest("/ordens-servico"),
          apiRequest("/clientes"),
        ]);
        setOrcamentos(orcamentosData);
        setOrdens(ordensData);
        setClientes(clientesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const orcamentoMetrics = useMemo(() => buildOrcamentoMetrics(orcamentos), [orcamentos]);
  const financeiroMetrics = useMemo(() => buildFinanceiroMetrics(ordens), [ordens]);

  return (
    <section className="page stock-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1>Dashboard</h1>
        </div>
      </div>

      {error && <div className="banner erro">{error}</div>}

      {loading ? (
        <div className="table-loading">Carregando indicadores...</div>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-icon blue">▤</div>
              <small>Orçamentos</small>
              <strong>{orcamentoMetrics.total}</strong>
              <span>{formatCurrency(orcamentoMetrics.pipelineValor)} em pipeline</span>
            </div>
            <div className="stat">
              <div className="stat-icon green">✓</div>
              <small>Receita (OS concluídas)</small>
              <strong>{formatCurrency(financeiroMetrics.receita)}</strong>
              <span>{financeiroMetrics.concluidasQtd} ordens finalizadas</span>
            </div>
            <div className="stat">
              <div className="stat-icon orange">▧</div>
              <small>OS em aberto</small>
              <strong>{financeiroMetrics.backlogQtd}</strong>
              <span>{formatCurrency(financeiroMetrics.backlogValor)} pendente</span>
            </div>
            <div className="stat">
              <div className="stat-icon purple">♙</div>
              <small>Clientes</small>
              <strong>{clientes.length}</strong>
              <span>taxa conversão {orcamentoMetrics.taxaConversao.toFixed(0)}%</span>
            </div>
          </div>

          <div className="split">
            <div className="panel">
              <div className="panel-heading">
                <h2>Orçamentos recentes</h2>
                {onNavigate && (
                  <button type="button" onClick={() => onNavigate("Orçamentos")}>
                    Ver todos
                  </button>
                )}
              </div>
              {orcamentoMetrics.recentes.length === 0 ? (
                <div className="table-loading">Nenhum orçamento cadastrado.</div>
              ) : (
                orcamentoMetrics.recentes.map((orcamento) => (
                  <div className="quote" key={orcamento.id}>
                    <div>
                      <strong>#{orcamento.id} · {orcamento.cliente_nome}</strong>
                      <span>{orcamento.veiculo_placa} · {formatDate(orcamento.created_at)}</span>
                    </div>
                    <strong>{formatCurrency(orcamento.valor_total)}</strong>
                    <span className={`status status-${orcamento.status}`}>
                      {orcamentoStatusLabels[orcamento.status] || orcamento.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="panel">
              <div className="panel-heading">
                <h2>Ordens de serviço recentes</h2>
                {onNavigate && (
                  <button type="button" onClick={() => onNavigate("Ordens de Serviço")}>
                    Ver todas
                  </button>
                )}
              </div>
              {financeiroMetrics.recentes.length === 0 ? (
                <div className="table-loading">Nenhuma ordem cadastrada.</div>
              ) : (
                financeiroMetrics.recentes.map((ordem) => (
                  <div className="quote" key={ordem.id}>
                    <div>
                      <strong>#{ordem.id} · {ordem.cliente_nome}</strong>
                      <span>{ordem.veiculo_placa} · {formatDate(ordem.data_abertura || ordem.created_at)}</span>
                    </div>
                    <strong>{formatCurrency(ordem.valor_total)}</strong>
                    <span className={`status status-${ordem.status}`}>
                      {ordemStatusLabels[ordem.status] || ordem.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bottom-grid">
            <div className="panel shortcuts">
              <h2>Atalhos</h2>
              <button className="shortcut blue" type="button" onClick={() => onNavigate?.("Orçamentos")}>
                Gerenciar orçamentos
              </button>
              <button className="shortcut green" type="button" onClick={() => onNavigate?.("Financeiro")}>
                Abrir financeiro
              </button>
              <button className="shortcut purple" type="button" onClick={() => onNavigate?.("Relatórios")}>
                Ver relatórios detalhados
              </button>
            </div>

            <div className="panel">
              <div className="panel-heading">
                <h2>Resumo rápido</h2>
              </div>
              <div className="summary-list">
                <div className="summary-row">
                  <span>Ticket médio orçamento</span>
                  <strong>{formatCurrency(orcamentoMetrics.ticketMedio)}</strong>
                </div>
                <div className="summary-row">
                  <span>Ticket médio OS concluída</span>
                  <strong>{formatCurrency(financeiroMetrics.ticketMedio)}</strong>
                </div>
                <div className="summary-row">
                  <span>Taxa de aprovação</span>
                  <strong>{orcamentoMetrics.taxaAprovacao.toFixed(1)}%</strong>
                </div>
                <div className="summary-row">
                  <span>Valor cancelado em OS</span>
                  <strong>{formatCurrency(financeiroMetrics.canceladoValor)}</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
