import { useEffect, useMemo, useState } from "react";
import { apiRequest, formatCurrency, formatDate } from "../api";

const emptyItem = { descricao: "", quantidade: 1, valor_unitario: 0 };
const emptyForm = {
  cliente_id: "",
  veiculo_id: "",
  status: "aberta",
  observacoes: "",
  itens: [{ ...emptyItem }],
};

const statusLabels = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  aguardando_pecas: "Aguardando peças",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export default function OrdensServicoPage() {
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const veiculosDoCliente = useMemo(
    () => veiculos.filter((veiculo) => String(veiculo.cliente_id) === String(form.cliente_id)),
    [veiculos, form.cliente_id]
  );

  const totalForm = useMemo(
    () => form.itens.reduce(
      (sum, item) => sum + Number(item.quantidade || 0) * Number(item.valor_unitario || 0),
      0
    ),
    [form.itens]
  );

  const fetchData = async (currentSearch = search, currentStatus = statusFilter) => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (currentSearch.trim()) params.set("search", currentSearch.trim());
      if (currentStatus) params.set("status", currentStatus);
      const [ordensData, clientesData, veiculosData] = await Promise.all([
        apiRequest(`/ordens-servico?${params.toString()}`),
        apiRequest("/clientes"),
        apiRequest("/veiculos"),
      ]);
      setOrdens(ordensData);
      setClientes(clientesData);
      setVeiculos(veiculosData);
    } catch (err) {
      setError(err.message);
      setOrdens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => fetchData(search, statusFilter), 200);
    return () => window.clearTimeout(timer);
  }, [search, statusFilter]);

  useEffect(() => {
    if (!feedback.message) return undefined;
    const timer = window.setTimeout(() => setFeedback({ type: "", message: "" }), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEdit = (ordem) => {
    setForm({
      cliente_id: String(ordem.cliente_id),
      veiculo_id: String(ordem.veiculo_id),
      status: ordem.status,
      observacoes: ordem.observacoes || "",
      itens: (ordem.itens || []).map((item) => ({
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
      })),
    });
    setEditingId(ordem.id);
    setIsFormOpen(true);
  };

  const updateItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        cliente_id: Number(form.cliente_id),
        veiculo_id: Number(form.veiculo_id),
        status: form.status,
        observacoes: form.observacoes.trim() || null,
        itens: form.itens.map((item) => ({
          descricao: item.descricao.trim(),
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor_unitario),
        })),
      };
      const url = editingId ? `/ordens-servico/${editingId}` : "/ordens-servico";
      const method = editingId ? "PUT" : "POST";
      await apiRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setFeedback({
        type: "sucesso",
        message: editingId ? "Ordem de serviço atualizada." : "Ordem de serviço criada.",
      });
      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      setFeedback({ type: "erro", message: err.message });
    }
  };

  const handleDelete = async (ordemId) => {
    if (!window.confirm("Excluir esta ordem de serviço?")) return;
    try {
      await apiRequest(`/ordens-servico/${ordemId}`, { method: "DELETE" });
      setFeedback({ type: "sucesso", message: "Ordem de serviço excluída." });
      fetchData();
    } catch (err) {
      setFeedback({ type: "erro", message: err.message });
    }
  };

  return (
    <section className="page stock-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Oficina</p>
          <h1>Ordens de serviço</h1>
        </div>
        <button className="primary-button" type="button" onClick={openCreate}>+ Nova OS</button>
      </div>

      {error && <div className="banner erro">{error}</div>}
      {feedback.message && <div className={`banner ${feedback.type}`}>{feedback.message}</div>}

      <div className="panel filters-panel">
        <div className="panel-heading">
          <h2>Filtros</h2>
        </div>
        <div className="filters-grid">
          <label className="filter-field">
            <span>Busca</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, placa ou ID" />
          </label>
          <label className="filter-field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <h2>Lista de ordens</h2>
          <small>{ordens.length} registros</small>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Veículo</th>
                <th>Status</th>
                <th>Total</th>
                <th>Abertura</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7">Carregando...</td></tr>
              ) : ordens.length === 0 ? (
                <tr><td colSpan="7">Nenhuma ordem de serviço encontrada.</td></tr>
              ) : (
                ordens.map((ordem) => (
                  <tr key={ordem.id}>
                    <td>#{ordem.id}</td>
                    <td>{ordem.cliente_nome}</td>
                    <td>{ordem.veiculo_placa} · {ordem.veiculo_descricao}</td>
                    <td><span className={`status status-${ordem.status}`}>{statusLabels[ordem.status]}</span></td>
                    <td>{formatCurrency(ordem.valor_total)}</td>
                    <td>{formatDate(ordem.data_abertura)}</td>
                    <td>
                      <button className="action" type="button" onClick={() => openEdit(ordem)}>Editar</button>
                      <button className="action danger" type="button" onClick={() => handleDelete(ordem.id)}>Excluir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop">
          <form className="modal wide" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h2>{editingId ? `Editar OS #${editingId}` : "Nova ordem de serviço"}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)}>×</button>
            </div>
            <div className="modal-grid">
              <label>
                <span>Cliente *</span>
                <select
                  required
                  value={form.cliente_id}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    cliente_id: event.target.value,
                    veiculo_id: "",
                  }))}
                >
                  <option value="">Selecione</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Veículo *</span>
                <select
                  required
                  value={form.veiculo_id}
                  onChange={(event) => setForm((current) => ({ ...current, veiculo_id: event.target.value }))}
                >
                  <option value="">Selecione</option>
                  {veiculosDoCliente.map((veiculo) => (
                    <option key={veiculo.id} value={veiculo.id}>
                      {veiculo.placa} · {veiculo.marca} {veiculo.modelo}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="full">
                <span>Observações</span>
                <textarea
                  value={form.observacoes}
                  onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}
                />
              </label>
            </div>

            <div className="items-block">
              <div className="panel-heading">
                <h2>Itens</h2>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setForm((current) => ({
                    ...current,
                    itens: [...current.itens, { ...emptyItem }],
                  }))}
                >
                  + Item
                </button>
              </div>
              {form.itens.map((item, index) => (
                <div className="item-row" key={`item-${index}`}>
                  <input
                    required
                    placeholder="Descrição"
                    value={item.descricao}
                    onChange={(event) => updateItem(index, "descricao", event.target.value)}
                  />
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Qtd"
                    value={item.quantidade}
                    onChange={(event) => updateItem(index, "quantidade", event.target.value)}
                  />
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Valor unit."
                    value={item.valor_unitario}
                    onChange={(event) => updateItem(index, "valor_unitario", event.target.value)}
                  />
                  <strong>{formatCurrency(Number(item.quantidade || 0) * Number(item.valor_unitario || 0))}</strong>
                  <button
                    className="action danger"
                    type="button"
                    disabled={form.itens.length === 1}
                    onClick={() => setForm((current) => ({
                      ...current,
                      itens: current.itens.filter((_, itemIndex) => itemIndex !== index),
                    }))}
                  >
                    Remover
                  </button>
                </div>
              ))}
              <div className="items-total">Total: <strong>{formatCurrency(totalForm)}</strong></div>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setIsFormOpen(false)}>Cancelar</button>
              <button className="primary-button" type="submit">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
