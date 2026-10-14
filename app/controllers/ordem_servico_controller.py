from app.models.ordem_servico import OrdemServico
from app.repositories.ordem_servico_repository import OrdemServicoRepository


ORDEM_STATUS = {"aberta", "em_andamento", "aguardando_pecas", "concluida", "cancelada"}


class OrdemServicoController:
    def __init__(self, repository: OrdemServicoRepository) -> None:
        self.repository = repository

    def create(self, data: dict) -> OrdemServico:
        return self.repository.create(self._normalize_data(data, require_required=True))

    def list_all(self, search: str | None = None, status: str | None = None) -> list[OrdemServico]:
        if status:
            status = status.strip().lower()
            if status not in ORDEM_STATUS:
                raise ValueError("Status de ordem de servico invalido.")
        return self.repository.list_all(search, status)

    def get(self, ordem_id: int) -> OrdemServico | None:
        return self.repository.get_by_id(ordem_id)

    def update(self, ordem_id: int, data: dict) -> OrdemServico | None:
        return self.repository.update(ordem_id, self._normalize_data(data, require_required=False))

    def delete(self, ordem_id: int) -> bool:
        return self.repository.delete(ordem_id)

    def _normalize_data(self, data: dict, require_required: bool) -> dict:
        if not isinstance(data, dict):
            raise ValueError("Os dados da ordem de servico devem ser enviados em formato JSON.")

        normalized: dict[str, object] = {}

        if require_required or "cliente_id" in data:
            normalized["cliente_id"] = self._integer_value(
                data.get("cliente_id"),
                "O cliente da ordem de servico e obrigatorio.",
            )
        if require_required or "veiculo_id" in data:
            normalized["veiculo_id"] = self._integer_value(
                data.get("veiculo_id"),
                "O veiculo da ordem de servico e obrigatorio.",
            )
        if "orcamento_id" in data:
            value = data.get("orcamento_id")
            normalized["orcamento_id"] = (
                None if value in (None, "") else self._integer_value(value, "orcamento_id invalido.")
            )
        if "observacoes" in data:
            normalized["observacoes"] = self._optional_text(data.get("observacoes"))
        if "status" in data:
            status = (data.get("status") or "").strip().lower()
            if status not in ORDEM_STATUS:
                raise ValueError("Status de ordem de servico invalido.")
            normalized["status"] = status
        elif require_required:
            normalized["status"] = "aberta"

        if require_required or "itens" in data:
            itens = data.get("itens")
            if require_required and not itens:
                raise ValueError("A ordem de servico precisa de ao menos um item.")
            if itens is not None:
                normalized["itens"] = self._normalize_itens(itens)

        return normalized

    def _normalize_itens(self, itens) -> list[dict]:
        if not isinstance(itens, list):
            raise ValueError("Os itens devem ser enviados como lista.")
        if not itens:
            raise ValueError("Informe ao menos um item.")

        normalized_itens = []
        for item in itens:
            if not isinstance(item, dict):
                raise ValueError("Cada item deve ser um objeto JSON.")
            descricao = self._required_text(item.get("descricao"), "A descricao do item e obrigatoria.")
            quantidade = self._float_value(item.get("quantidade", 1), "A quantidade do item deve ser numerica.")
            if quantidade <= 0:
                raise ValueError("A quantidade do item deve ser maior que zero.")
            valor_unitario = self._float_value(
                item.get("valor_unitario", 0),
                "O valor unitario do item deve ser numerico.",
            )
            peca_id = item.get("peca_id")
            normalized_itens.append(
                {
                    "descricao": descricao,
                    "quantidade": quantidade,
                    "valor_unitario": valor_unitario,
                    "peca_id": int(peca_id) if peca_id not in (None, "") else None,
                }
            )
        return normalized_itens

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

    def _integer_value(self, value, message: str) -> int:
        if value is None or value == "":
            raise ValueError(message)
        try:
            return int(value)
        except (TypeError, ValueError):
            raise ValueError(message) from None

    def _float_value(self, value, message: str) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise ValueError(message) from None
        if number < 0:
            raise ValueError("Os valores numericos nao podem ser negativos.")
        return number
