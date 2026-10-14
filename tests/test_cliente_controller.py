import unittest

from app.controllers.cliente_controller import ClienteController
from app.models.cliente import Cliente


class FakeClienteRepository:
    def __init__(self) -> None:
        self.clientes = {}
        self.next_id = 1

    def create(self, nome: str) -> Cliente:
        cliente = Cliente(self.next_id, nome)
        self.clientes[cliente.id] = cliente
        self.next_id += 1
        return cliente

    def list_all(self) -> list[Cliente]:
        return list(self.clientes.values())

    def get_by_id(self, cliente_id: int) -> Cliente | None:
        return self.clientes.get(cliente_id)

    def delete(self, cliente_id: int) -> bool:
        return self.clientes.pop(cliente_id, None) is not None


class ClienteControllerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.controller = ClienteController(FakeClienteRepository())

    def test_cria_lista_busca_e_exclui_cliente(self) -> None:
        cliente = self.controller.create(" Carlos Souza ")
        self.assertEqual(cliente.nome, "Carlos Souza")
        self.assertEqual(self.controller.list_all(), [cliente])
        self.assertEqual(self.controller.get(cliente.id), cliente)
        self.assertTrue(self.controller.delete(cliente.id))
        self.assertIsNone(self.controller.get(cliente.id))

    def test_nome_e_obrigatorio(self) -> None:
        with self.assertRaises(ValueError):
            self.controller.create("   ")


if __name__ == "__main__":
    unittest.main()
