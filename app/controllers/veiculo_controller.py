from app.models.veiculo import Veiculo
from app.repositories.veiculo_repository import VeiculoRepository


class VeiculoController:
    def __init__(self, repository: VeiculoRepository) -> None:
        self.repository = repository

    def create(self, data: dict) -> Veiculo:
        return self.repository.create(self._normalize_data(data, require_required=True))

    def list_all(self, search: str | None = None, cliente_id: int | None = None) -> list[Veiculo]:
        return self.repository.list_all(search, cliente_id)

    def get(self, veiculo_id: int) -> Veiculo | None:
        return self.repository.get_by_id(veiculo_id)

    def update(self, veiculo_id: int, data: dict) -> Veiculo | None:
        return self.repository.update(veiculo_id, self._normalize_data(data, require_required=False))

    def delete(self, veiculo_id: int) -> bool:
        return self.repository.delete(veiculo_id)

    def _normalize_data(self, data: dict, require_required: bool) -> dict:
        if not isinstance(data, dict):
            raise ValueError("Os dados do veiculo devem ser enviados em formato JSON.")

        normalized: dict[str, object] = {}

        if require_required or "cliente_id" in data:
            normalized["cliente_id"] = self._integer_value(
                data.get("cliente_id"),
                "O cliente do veiculo e obrigatorio.",
                required=require_required or "cliente_id" in data,
            )
        if require_required or "placa" in data:
            placa = self._required_text(data.get("placa"), "A placa do veiculo e obrigatoria.")
            normalized["placa"] = placa.upper().replace(" ", "").replace("-", "")
        if require_required or "marca" in data:
            normalized["marca"] = self._required_text(data.get("marca"), "A marca do veiculo e obrigatoria.")
        if require_required or "modelo" in data:
            normalized["modelo"] = self._required_text(data.get("modelo"), "O modelo do veiculo e obrigatorio.")

        if "ano" in data:
            ano = data.get("ano")
            if ano in (None, ""):
                normalized["ano"] = None
            else:
                normalized["ano"] = self._integer_value(ano, "O ano do veiculo deve ser um numero inteiro.")
                if normalized["ano"] < 1900 or normalized["ano"] > 2100:
                    raise ValueError("O ano do veiculo e invalido.")
        if "cor" in data:
            normalized["cor"] = self._optional_text(data.get("cor"))
        if "observacoes" in data:
            normalized["observacoes"] = self._optional_text(data.get("observacoes"))

        return normalized

    def _required_text(self, value: str | None, message: str) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError(message)
        return value.strip()

    def _optional_text(self, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("Os campos textuais devem ser enviados como texto.")
        value = value.strip()
        return value or None

    def _integer_value(self, value, message: str, required: bool = True) -> int:
        if value is None or value == "":
            if required:
                raise ValueError(message)
            return 0
        try:
            return int(value)
        except (TypeError, ValueError):
            raise ValueError(message) from None
