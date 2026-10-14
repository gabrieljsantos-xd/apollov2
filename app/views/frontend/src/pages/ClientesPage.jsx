import { useEffect, useState } from "react";
import { apiRequest } from "../api";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [nome, setNome] = useState("");

  const fetchClientes = async () => {
    try {
      setLoading(true);
      setError("");
      setClientes(await apiRequest("/clientes"));
    } catch (err) {
      setError(err.message);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (!feedback.message) return undefined;
    const timer = window.setTimeout(() => setFeedback({ type: "", message: "" }), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await apiRequest("/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      setNome("");
      setFeedback({ type: "sucesso", message: "Cliente cadastrado." });
      fetchClientes();
    } catch (err) {
      setFeedback({ type: "erro", message: err.message });
    }
  };

  const handleDelete = async (clienteId) => {
    if (!window.confirm("Excluir este cliente?")) return;
    try {
      await apiRequest(`/clientes/${clienteId}`, { method: "DELETE" });
      setFeedback({ type: "sucesso", message: "Cliente excluído." });
      fetchClientes();
    } catch (err) {
      setFeedback({ type: "erro", message: err.message });
    }
  };

  return (
    <section className="page stock-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Cadastros</p>
          <h1>Clientes</h1>
        </div>
      </div>

      {error && <div className="banner erro">{error}</div>}
      {feedback.message && <div className={`banner ${feedback.type}`}>{feedback.message}</div>}

      <div className="panel filters-panel">
        <div className="panel-heading">
          <h2>Novo cliente</h2>
        </div>
        <form className="inline-form" onSubmit={handleSubmit}>
          <label className="filter-field grow">
            <span>Nome</span>
            <input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome do cliente" />
          </label>
          <button className="primary-button" type="submit">Salvar</button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <h2>Lista de clientes</h2>
          <small>{clientes.length} registros</small>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3">Carregando...</td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan="3">Nenhum cliente cadastrado.</td></tr>
              ) : (
                clientes.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>{cliente.id}</td>
                    <td>{cliente.nome}</td>
                    <td>
                      <button className="action danger" type="button" onClick={() => handleDelete(cliente.id)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
