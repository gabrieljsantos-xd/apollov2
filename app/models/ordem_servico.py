from dataclasses import dataclass, field


@dataclass
class OrdemServicoItem:
    id: int
    ordem_servico_id: int
    descricao: str
    quantidade: float
    valor_unitario: float
    peca_id: int | None = None


@dataclass
class OrdemServico:
    id: int
    cliente_id: int
    veiculo_id: int
    status: str
    orcamento_id: int | None = None
    observacoes: str | None = None
    valor_total: float = 0.0
    data_abertura: str | None = None
    data_conclusao: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    cliente_nome: str | None = None
    veiculo_placa: str | None = None
    veiculo_descricao: str | None = None
    itens: list[OrdemServicoItem] = field(default_factory=list)
