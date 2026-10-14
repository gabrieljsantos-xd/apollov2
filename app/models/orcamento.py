from dataclasses import dataclass, field


@dataclass
class OrcamentoItem:
    id: int
    orcamento_id: int
    descricao: str
    quantidade: float
    valor_unitario: float
    peca_id: int | None = None


@dataclass
class Orcamento:
    id: int
    cliente_id: int
    veiculo_id: int
    status: str
    observacoes: str | None = None
    valor_total: float = 0.0
    created_at: str | None = None
    updated_at: str | None = None
    cliente_nome: str | None = None
    veiculo_placa: str | None = None
    veiculo_descricao: str | None = None
    itens: list[OrcamentoItem] = field(default_factory=list)
