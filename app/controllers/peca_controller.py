from app.models.peca import Peca
from app.repositories.peca_repository import PecaRepository


class PecaController:
    def __init__(self, repository: PecaRepository) -> None:
        self.repository = repository

    def create(self, data: dict) -> Peca:
        normalized = self._normalize_data(data, require_required=True)
        return self.repository.create(normalized)

    def list_all(
        self,
        filters: dict | None = None,
        search: str | None = None,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[Peca], int]:
        return self.repository.list_all(filters or {}, search, page, per_page)

    def get(self, peca_id: int) -> Peca | None:
        return self.repository.get_by_id(peca_id)

    def update(self, peca_id: int, data: dict) -> Peca | None:
        normalized = self._normalize_data(data, require_required=False)
        return self.repository.update(peca_id, normalized)

    def delete(self, peca_id: int) -> bool:
        return self.repository.delete(peca_id)

    def _normalize_data(self, data: dict, require_required: bool) -> dict:
        if not isinstance(data, dict):
            raise ValueError("Os dados da peça devem ser enviados em formato JSON.")

        normalized: dict[str, object] = {}

        if require_required:
            normalized["nome"] = self._required_text(data.get("nome"), "O nome da peça e obrigatorio.")
            normalized["codigo"] = self._required_text(data.get("codigo"), "O codigo da peça e obrigatorio.")
            normalized["sku"] = self._required_text(data.get("sku"), "O SKU da peça e obrigatorio.")
        else:
            if "nome" in data:
                normalized["nome"] = self._required_text(data.get("nome"), "O nome da peça e obrigatorio.")
            if "codigo" in data:
                normalized["codigo"] = self._required_text(data.get("codigo"), "O codigo da peça e obrigatorio.")
            if "sku" in data:
                normalized["sku"] = self._required_text(data.get("sku"), "O SKU da peça e obrigatorio.")

        if "codigo_fabricante" in data:
            normalized["codigo_fabricante"] = self._optional_text(data.get("codigo_fabricante"))
        if "descricao" in data:
            normalized["descricao"] = self._optional_text(data.get("descricao"))
        if "categoria" in data:
            normalized["categoria"] = self._optional_text(data.get("categoria"))
        if "fabricante" in data:
            normalized["fabricante"] = self._optional_text(data.get("fabricante"))
        if "fornecedor" in data:
            normalized["fornecedor"] = self._optional_text(data.get("fornecedor"))
        if "localizacao" in data:
            normalized["localizacao"] = self._optional_text(data.get("localizacao"))
        if "motivo" in data:
            normalized["motivo"] = self._optional_text(data.get("motivo"))
        if "usuario_responsavel" in data:
            normalized["usuario_responsavel"] = self._optional_text(data.get("usuario_responsavel"))

        if "quantidade_estoque" in data:
            normalized["quantidade_estoque"] = self._integer_value(
                data.get("quantidade_estoque"),
                "A quantidade em estoque deve ser um numero inteiro.",
            )
        if require_required or "estoque_minimo" in data:
            normalized["estoque_minimo"] = self._integer_value(
                data.get("estoque_minimo", 0),
                "O estoque minimo deve ser um numero inteiro.",
            )
        if require_required or "preco_custo" in data:
            normalized["preco_custo"] = self._float_value(
                data.get("preco_custo", 0),
                "O preco de custo deve ser numerico.",
            )
        if require_required or "preco_venda" in data:
            normalized["preco_venda"] = self._float_value(
                data.get("preco_venda", 0),
                "O preco de venda deve ser numerico.",
            )

        if "status" in data:
            status = (data.get("status") or "ativo").strip().lower()
            if status not in {"ativo", "inativo"}:
                raise ValueError("O status deve ser ativo ou inativo.")
            normalized["status"] = status
        elif require_required:
            normalized["status"] = "ativo"

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

    def _integer_value(self, value: int | str | None, message: str) -> int:
        if value is None:
            return 0
        try:
            integer_value = int(value)
        except (TypeError, ValueError):
            raise ValueError(message) from None
        if integer_value < 0:
            raise ValueError("Os valores numericos nao podem ser negativos.")
        return integer_value

    def _float_value(self, value: int | float | str | None, message: str) -> float:
        if value is None:
            return 0.0
        try:
            float_value = float(value)
        except (TypeError, ValueError):
            raise ValueError(message) from None
        if float_value < 0:
            raise ValueError("Os valores numericos nao podem ser negativos.")
        return float_value
