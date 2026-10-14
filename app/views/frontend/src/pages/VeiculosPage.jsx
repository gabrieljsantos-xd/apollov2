import { useEffect, useState } from "react";
import { apiRequest, formatDate } from "../api";

const emptyForm = {
  cliente_id: "",
  placa: "",
  marca: "",
  modelo: "",
  ano: "",
  cor: "",
  observacoes: "",
};

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async (currentSearch = search) => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (currentSearch.trim()) params.set("search", currentSearch.trim());
      const [veiculosData, clientesData] = await Promise.all([
        apiRequest(`/veiculos?${params.toString()}`),
        apiRequest("/clientes"),
      ]);
      setVeiculos(veiculosData);
      setClientes(clientesData);
    } catch (err) {
      setError(err.message);
      setVeiculos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => fetchData(search), 200);
    return () => window.clearTimeout(timer);
  }, [search]);

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

  const openEdit = (veiculo) => {
    setForm({
      cliente_id: String(veiculo.cliente_id),
      placa: veiculo.placa || "",
      marca: veiculo.marca || "",
      modelo: veiculo.modelo || "",
      ano: veiculo.ano ?? "",
      cor: veiculo.cor || "",
      observacoes: veiculo.observacoes || "",
    });
    setEditingId(veiculo.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        cliente_id: Number(form.cliente_id),
        ano: form.ano === "" ? null : Number(form.ano),
        cor: form.cor.trim() || null,
        observacoes: form.observacoes.trim() || null,
      };
      const url = editingId ? `/veiculos/${editingId}` : "/veiculos";
      const method = editingId ? "PUT" : "POST";
      await apiRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setFeedback({
        type: "sucesso",
        message: editingId ? "Veículo atualizado." : "Veículo cadastrado.",
      });
      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      setFeedback({ type: "erro", message: err.message });
    }
  };

  const handleDelete = async (veiculoId) => {
    if (!window.confirm("Excluir este veículo?")) return;
    try {
      await apiRequest(`/veiculos/${veiculoId}`, { method: "DELETE" });
      setFeedback({ type: "sucesso", message: "Veículo excluído." });
      fetchData();
    } catch (err) {
      setFeedback({ type: "erro", message: err.message });
    }
  };

  return (
    <section className="page stock-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Frota</p>
          <h1>Veículos</h1>
        </div>
        <button className="primary-button" type="button" onClick={openCreate}>+ Adicionar veículo</button>
      </div>

      {error && <div className="banner erro">{error}</div>}
      {feedback.message && <div className={`banner ${feedback.type}`}>{feedback.message}</div>}

      <div className="panel filters-panel">
        <div className="panel-heading">
          <h2>Busca</h2>
        </div>
        <div className="filters-grid">
          <label className="filter-field">
            <span>Placa, marca, modelo ou cliente</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar..." />
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <h2>Veículos cadastrados</h2>
          <small>{veiculos.length} registros</small>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Cliente</th>
                <th>Veículo</th>
                <th>Ano</th>
                <th>Cor</th>
                <th>Atualizado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7">Carregando...</td></tr>
              ) : veiculos.length === 0 ? (
                <tr><td colSpan="7">Nenhum veículo cadastrado.</td></tr>
              ) : (
                veiculos.map((veiculo) => (
                  <tr key={veiculo.id}>
                    <td><strong>{veiculo.placa}</strong></td>
                    <td>{veiculo.cliente_nome}</td>
                    <td>{veiculo.marca} {veiculo.modelo}</td>
                    <td>{veiculo.ano || "-"}</td>
                    <td>{veiculo.cor || "-"}</td>
                    <td>{formatDate(veiculo.updated_at)}</td>
                    <td>
                      <button className="action" type="button" onClick={() => openEdit(veiculo)}>Editar</button>
                      <button className="action danger" type="button" onClick={() => handleDelete(veiculo.id)}>Excluir</button>
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
          <form className="modal" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h2>{editingId ? "Editar veículo" : "Novo veículo"}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)}>×</button>
            </div>
            <div className="modal-grid">
              <label>
                <span>Cliente *</span>
                <select
                  required
                  value={form.cliente_id}
                  onChange={(event) => setForm((current) => ({ ...current, cliente_id: event.target.value }))}
                >
                  <option value="">Selecione</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Placa *</span>
                <input required value={form.placa} onChange={(event) => setForm((current) => ({ ...current, placa: event.target.value }))} />
              </label>
              <label>
                <span>Marca *</span>
                <input required value={form.marca} onChange={(event) => setForm((current) => ({ ...current, marca: event.target.value }))} />
              </label>
              <label>
                <span>Modelo *</span>
                <input required value={form.modelo} onChange={(event) => setForm((current) => ({ ...current, modelo: event.target.value }))} />
              </label>
              <label>
                <span>Ano</span>
                <input type="number" value={form.ano} onChange={(event) => setForm((current) => ({ ...current, ano: event.target.value }))} />
              </label>
              <label>
                <span>Cor</span>
                <input value={form.cor} onChange={(event) => setForm((current) => ({ ...current, cor: event.target.value }))} />
              </label>
              <label className="full">
                <span>Observações</span>
                <textarea value={form.observacoes} onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))} />
              </label>
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
