from dataclasses import dataclass


@dataclass
class Veiculo:
    id: int
    cliente_id: int
    placa: str
    marca: str
    modelo: str
    ano: int | None = None
    cor: str | None = None
    observacoes: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    cliente_nome: str | None = None
