from dataclasses import dataclass


@dataclass
class Peca:
    id: int
    nome: str
    codigo: str
    sku: str
    codigo_fabricante: str | None = None
    descricao: str | None = None
    categoria_id: int | None = None
    categoria: str | None = None
    fabricante_id: int | None = None
    fabricante: str | None = None
    fornecedor_id: int | None = None
    fornecedor: str | None = None
    quantidade_estoque: int = 0
    estoque_minimo: int = 0
    preco_custo: float = 0.0
    preco_venda: float = 0.0
    localizacao: str | None = None
    status: str = "ativo"
    ultima_atualizacao: str | None = None
    created_at: str | None = None
    deleted_at: str | None = None
