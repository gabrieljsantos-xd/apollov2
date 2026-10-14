from dataclasses import dataclass


@dataclass
class MovimentacaoEstoque:
    id: int
    peca_id: int
    tipo: str
    quantidade_anterior: int
    quantidade_movimentada: int
    quantidade_final: int
    motivo: str | None = None
    usuario_responsavel: str | None = None
    created_at: str | None = None
