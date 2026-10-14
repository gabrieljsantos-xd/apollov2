export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Erro de comunicação com a API. A resposta recebida não é JSON válido (${response.status}).`
    );
  }
}

export async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.error || `Erro na requisição (${response.status}).`);
  }
  return data;
}
