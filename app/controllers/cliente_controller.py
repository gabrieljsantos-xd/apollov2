from app.models.cliente import Cliente
from app.repositories.cliente_repository import ClienteRepository


class ClienteController:
    def __init__(self, repository: ClienteRepository) -> None:
        self.repository = repository

    def create(self, nome: str) -> Cliente:
        if not isinstance(nome, str) or not nome.strip():
            raise ValueError("O nome do cliente e obrigatorio.")
        return self.repository.create(nome.strip())

    def list_all(self) -> list[Cliente]:
        return self.repository.list_all()

    def get(self, cliente_id: int) -> Cliente | None:
        return self.repository.get_by_id(cliente_id)

    def delete(self, cliente_id: int) -> bool:
        return self.repository.delete(cliente_id)
