import { useEffect, useState } from "react";
import ClientesPage from "./pages/ClientesPage";
import OrcamentosPage from "./pages/OrcamentosPage";
import OrdensServicoPage from "./pages/OrdensServicoPage";
import VeiculosPage from "./pages/VeiculosPage";

const menu = [
  ["⌂", "Dashboard"], ["▤", "Orçamentos"], ["▧", "Ordens de Serviço"],
  ["▱", "Veículos"], ["♙", "Clientes"], ["▦", "Agenda"], ["⚒", "Serviços"],
  ["▫", "Peças / Estoque"], ["♙", "Funcionários"], ["ⓢ", "Financeiro"],
  ["▥", "Relatórios"], ["⚙", "Configurações"],
];

const initialForm = {
  nome: "",
  codigo: "",
  sku: "",
  codigo_fabricante: "",
  descricao: "",
  categoria: "",
  fabricante: "",
  fornecedor: "",
  quantidade_estoque: 0,
  estoque_minimo: 0,
  preco_custo: 0,
  preco_venda: 0,
  localizacao: "",
  status: "ativo",
};

const initialFilters = {
  categoria: "",
  fabricante: "",
  status: "",
  disponibilidade: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Erro de comunicação com a API. A resposta recebida não é JSON válido (${response.status}).`
    );
  }
}

function App() {
  const [paginaAtual, setPaginaAtual] = useState("Peças / Estoque");
  const [pecas, setPecas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const fetchPecas = async (currentSearch = searchInput, currentFilters = filters) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (currentSearch.trim()) {
        params.set("search", currentSearch.trim());
      }

      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      params.set("per_page", "100");

      const response = await fetch(`/pecas?${params.toString()}`);
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || `Erro ao buscar peças (${response.status}).`);
      }

      setPecas(data.items || []);
    } catch (err) {
      setError(err.message);
      setPecas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchPecas(searchInput, filters);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [searchInput, filters]);

  useEffect(() => {
    if (!feedback.message) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setFeedback({ type: "", message: "" });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const payload = {
        ...form,
        nome: form.nome.trim(),
        codigo: form.codigo.trim(),
        sku: form.sku.trim(),
        codigo_fabricante: form.codigo_fabricante.trim() || null,
        descricao: form.descricao.trim() || null,
        categoria: form.categoria.trim() || null,
        fabricante: form.fabricante.trim() || null,
        fornecedor: form.fornecedor.trim() || null,
        localizacao: form.localizacao.trim() || null,
      };

      if (!payload.nome || !payload.codigo || !payload.sku) {
        throw new Error("Nome, código e SKU são obrigatórios.");
      }

      const url = editingId ? `/pecas/${editingId}` : "/pecas";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || `Erro ao salvar peça (${response.status}).`);
      }

      setFeedback({
        type: "sucesso",
        message: editingId ? "Peça atualizada com sucesso." : "Peça cadastrada com sucesso.",
      });
      closeForm();
      fetchPecas();
    } catch (err) {
      setFeedback({ type: "erro", message: err.message });
    }
  };

  const handleDelete = async (pecaId) => {
    if (!window.confirm("Deseja excluir esta peça do estoque?")) {
      return;
    }

    try {
      const response = await fetch(`/pecas/${pecaId}`, { method: "DELETE" });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || `Erro ao excluir peça (${response.status}).`);
      }

      setFeedback({ type: "sucesso", message: "Peça excluída com sucesso." });
      fetchPecas();
    } catch (err) {
      setFeedback({ type: "erro", message: err.message });
    }
  };

  const handleQuickUpdate = async (peca) => {
    const nextQuantity = window.prompt(
      `Informe a nova quantidade para ${peca.nome}:`,
      String(peca.quantidade_estoque)
    );

    if (nextQuantity === null) {
      return;
    }

    const quantidade = Number(nextQuantity);

    if (!Number.isInteger(quantidade) || quantidade < 0) {
      setFeedback({ type: "erro", message: "Quantidade inválida. Informe um valor inteiro maior ou igual a zero." });
      return;
    }

    try {
      const response = await fetch(`/pecas/${peca.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantidade_estoque: quantidade,
          motivo: "Atualização manual de estoque",
          usuario_responsavel: "Administrador",
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || `Erro ao atualizar estoque (${response.status}).`);
      }

      setFeedback({ type: "sucesso", message: "Quantidade em estoque atualizada." });
      fetchPecas();
    } catch (err) {
      setFeedback({ type: "erro", message: err.message });
    }
  };

  const openCreate = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEdit = (peca) => {
    setForm({
      ...initialForm,
      ...peca,
      quantidade_estoque: Number(peca.quantidade_estoque || 0),
      estoque_minimo: Number(peca.estoque_minimo || 0),
      preco_custo: Number(peca.preco_custo || 0),
      preco_venda: Number(peca.preco_venda || 0),
    });
    setEditingId(peca.id);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const totalEstoque = pecas.reduce((sum, peca) => sum + Number(peca.quantidade_estoque || 0), 0);
  const itensDisponiveis = pecas.filter((peca) => Number(peca.quantidade_estoque || 0) > 0).length;
  const estoqueBaixo = pecas.filter(
    (peca) => Number(peca.quantidade_estoque || 0) <= Number(peca.estoque_minimo || 0)
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">⚙</div>
          <div>
            <strong>
              Oficina<span>Pro</span>
            </strong>
            <small>Sistema Interno</small>
          </div>
        </div>
        <nav aria-label="Menu principal">
          {menu.map(([icone, nome]) => (
            <button
              className={paginaAtual === nome ? "ativo" : ""}
              onClick={() => setPaginaAtual(nome)}
              key={nome}
              type="button"
            >
              <i aria-hidden="true">{icone}</i>
              {nome}
            </button>
          ))}
        </nav>
        <div className="perfil">
          <div className="avatar">GJ</div>
          <div>
            <strong>Gabriel Jesus</strong>
            <small>Administrador</small>
          </div>
          <span>⌄</span>
        </div>
        <button className="sair" type="button">
          ↪ <span>Sair do sistema</span>
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <button className="menu-toggle" type="button" aria-label="Abrir menu">
            ☰
          </button>
          <div className="search">
            <input
              aria-label="Buscar peças"
              placeholder="Buscar peça, código, SKU ou fabricante..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <span>⌕</span>
          </div>
          <button className="bell" type="button" aria-label="Notificações">
            ♧<b>3</b>
          </button>
        </header>

        {paginaAtual === "Clientes" ? (
          <ClientesPage />
        ) : paginaAtual === "Veículos" ? (
          <VeiculosPage />
        ) : paginaAtual === "Orçamentos" ? (
          <OrcamentosPage />
        ) : paginaAtual === "Ordens de Serviço" ? (
          <OrdensServicoPage />
        ) : paginaAtual !== "Peças / Estoque" ? (
          <section className="empty-page">
            <div className="empty-icon">{menu.find(([_, nome]) => nome === paginaAtual)?.[0]}</div>
            <h1>Hello, {paginaAtual}</h1>
            <p>Esta é a página de {paginaAtual.toLowerCase()}.</p>
          </section>
        ) : (
          <section className="page stock-page">
            <div className="page-header">
              <div>
                <p className="eyebrow">Estoque</p>
                <h1>Peças e estoque</h1>
              </div>
              <button className="primary-button" type="button" onClick={openCreate}>
                + Adicionar peça
              </button>
            </div>

            {error && <div className="banner erro">{error}</div>}
            {feedback.message && <div className={`banner ${feedback.type}`}>{feedback.message}</div>}

            <div className="stats">
              <div className="stat">
                <div className="stat-icon blue">◫</div>
                <small>Total de peças</small>
                <strong>{pecas.length}</strong>
                <span>itens cadastrados</span>
              </div>
              <div className="stat">
                <div className="stat-icon green">✓</div>
                <small>Disponíveis</small>
                <strong>{itensDisponiveis}</strong>
                <span className="positive">em estoque</span>
              </div>
              <div className="stat">
                <div className="stat-icon orange">⚠</div>
                <small>Estoque baixo</small>
                <strong>{estoqueBaixo}</strong>
                <span>próximo do mínimo</span>
              </div>
              <div className="stat">
                <div className="stat-icon purple">⟳</div>
                <small>Quantidade total</small>
                <strong>{totalEstoque}</strong>
                <span>unidades</span>
              </div>
            </div>

            <div className="panel filters-panel">
              <div className="panel-heading">
                <h2>Filtros</h2>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setFilters(initialFilters);
                  }}
                >
                  Limpar filtros
                </button>
              </div>
              <div className="filters-grid">
                <label className="filter-field">
                  <span>Categoria</span>
                  <select
                    value={filters.categoria}
                    onChange={(event) => setFilters((current) => ({ ...current, categoria: event.target.value }))}
                  >
                    <option value="">Todas</option>
                    {Array.from(new Set(pecas.map((peca) => peca.categoria).filter(Boolean))).map((categoria) => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </label>

                <label className="filter-field">
                  <span>Fabricante</span>
                  <select
                    value={filters.fabricante}
                    onChange={(event) => setFilters((current) => ({ ...current, fabricante: event.target.value }))}
                  >
                    <option value="">Todos</option>
                    {Array.from(new Set(pecas.map((peca) => peca.fabricante).filter(Boolean))).map((fabricante) => (
                      <option key={fabricante} value={fabricante}>{fabricante}</option>
                    ))}
                  </select>
                </label>

                <label className="filter-field">
                  <span>Status</span>
                  <select
                    value={filters.status}
                    onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="">Todos</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </label>

                <label className="filter-field">
                  <span>Disponibilidade</span>
                  <select
                    value={filters.disponibilidade}
                    onChange={(event) => setFilters((current) => ({ ...current, disponibilidade: event.target.value }))}
                  >
                    <option value="">Todas</option>
                    <option value="disponivel">Disponível</option>
                    <option value="sem_estoque">Sem estoque</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="panel orders">
              <div className="panel-heading">
                <h2>Peças cadastradas</h2>
              </div>

              {loading ? (
                <div className="table-loading">Carregando peças...</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Peça</th>
                        <th>Código</th>
                        <th>SKU</th>
                        <th>Fabricante</th>
                        <th>Estoque</th>
                        <th>Preço de venda</th>
                        <th>Estoque mínimo</th>
                        <th>Status</th>
                        <th>Última atualização</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pecas.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="empty-state">
                            Nenhuma peça encontrada com os filtros atuais.
                          </td>
                        </tr>
                      ) : (
                        pecas.map((peca) => (
                          <tr key={peca.id}>
                            <td>
                              <div className="piece-name">
                                <strong>{peca.nome}</strong>
                                <small>{peca.localizacao || "Sem localização"}</small>
                              </div>
                            </td>
                            <td>{peca.codigo}</td>
                            <td>{peca.sku}</td>
                            <td>{peca.fabricante || "-"}</td>
                            <td>{peca.quantidade_estoque}</td>
                            <td>{formatCurrency(peca.preco_venda)}</td>
                            <td>{peca.estoque_minimo}</td>
                            <td>
                              <span className={`status-pill ${peca.status === "ativo" ? "ativo" : "inativo"}`}>
                                {peca.status}
                              </span>
                            </td>
                            <td>{formatDate(peca.ultima_atualizacao)}</td>
                            <td>
                              <div className="table-actions">
                                <button type="button" className="action primary" onClick={() => openEdit(peca)}>
                                  Editar
                                </button>
                                <button type="button" className="action secondary" onClick={() => handleQuickUpdate(peca)}>
                                  Estoque
                                </button>
                                <button type="button" className="action danger" onClick={() => handleDelete(peca.id)}>
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        <footer>© 2024 OficinaPro - Sistema Interno para Oficinas Mecânicas</footer>
      </main>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Cadastro</p>
                <h2>{editingId ? "Editar peça" : "Nova peça"}</h2>
              </div>
              <button type="button" className="close-button" onClick={closeForm}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <label className="field">
                <span>Nome</span>
                <input
                  value={form.nome}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  placeholder="Ex.: Filtro de óleo"
                />
              </label>

              <label className="field">
                <span>Código</span>
                <input
                  value={form.codigo}
                  onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value }))}
                  placeholder="Ex.: FIL-001"
                />
              </label>

              <label className="field">
                <span>SKU</span>
                <input
                  value={form.sku}
                  onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
                  placeholder="Ex.: SKU-001"
                />
              </label>

              <label className="field">
                <span>Código do fabricante</span>
                <input
                  value={form.codigo_fabricante}
                  onChange={(event) => setForm((current) => ({ ...current, codigo_fabricante: event.target.value }))}
                  placeholder="Ex.: BOS-FLT-001"
                />
              </label>

              <label className="field full-width">
                <span>Descrição</span>
                <textarea
                  rows="3"
                  value={form.descricao}
                  onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                  placeholder="Descreva a peça, aplicação e observações relevantes"
                />
              </label>

              <label className="field">
                <span>Categoria</span>
                <input
                  value={form.categoria}
                  onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))}
                  placeholder="Ex.: Motor"
                />
              </label>

              <label className="field">
                <span>Fabricante / marca</span>
                <input
                  value={form.fabricante}
                  onChange={(event) => setForm((current) => ({ ...current, fabricante: event.target.value }))}
                  placeholder="Ex.: Bosch"
                />
              </label>

              <label className="field">
                <span>Fornecedor</span>
                <input
                  value={form.fornecedor}
                  onChange={(event) => setForm((current) => ({ ...current, fornecedor: event.target.value }))}
                  placeholder="Ex.: AutoParts"
                />
              </label>

              <label className="field">
                <span>Quantidade em estoque</span>
                <input
                  type="number"
                  min="0"
                  value={form.quantidade_estoque}
                  onChange={(event) => setForm((current) => ({ ...current, quantidade_estoque: Number(event.target.value) }))}
                />
              </label>

              <label className="field">
                <span>Estoque mínimo</span>
                <input
                  type="number"
                  min="0"
                  value={form.estoque_minimo}
                  onChange={(event) => setForm((current) => ({ ...current, estoque_minimo: Number(event.target.value) }))}
                />
              </label>

              <label className="field">
                <span>Preço de custo</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.preco_custo}
                  onChange={(event) => setForm((current) => ({ ...current, preco_custo: Number(event.target.value) }))}
                />
              </label>

              <label className="field">
                <span>Preço de venda</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.preco_venda}
                  onChange={(event) => setForm((current) => ({ ...current, preco_venda: Number(event.target.value) }))}
                />
              </label>

              <label className="field">
                <span>Localização no estoque</span>
                <input
                  value={form.localizacao}
                  onChange={(event) => setForm((current) => ({ ...current, localizacao: event.target.value }))}
                  placeholder="Ex.: B2-01"
                />
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeForm}>
                  Cancelar
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? "Salvar alterações" : "Cadastrar peça"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
