import unittest

from app.controllers.peca_controller import PecaController
from app.models.peca import Peca


class FakePecaRepository:
    def __init__(self) -> None:
        self.pecas = {}
        self.next_id = 1

    def create(self, peca_data: dict) -> Peca:
        peca = Peca(id=self.next_id, **peca_data)
        self.pecas[peca.id] = peca
        self.next_id += 1
        return peca

    def list_all(self, filters: dict | None = None, search: str | None = None, page: int = 1, per_page: int = 20):
        return list(self.pecas.values())

    def get_by_id(self, peca_id: int) -> Peca | None:
        return self.pecas.get(peca_id)

    def update(self, peca_id: int, peca_data: dict) -> Peca | None:
        peca = self.pecas.get(peca_id)
        if peca is None:
            return None
        for key, value in peca_data.items():
            if hasattr(peca, key):
                setattr(peca, key, value)
        return peca

    def delete(self, peca_id: int) -> bool:
        return self.pecas.pop(peca_id, None) is not None


class PecaControllerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.controller = PecaController(FakePecaRepository())

    def test_cria_lista_busca_e_exclui_peca(self) -> None:
        peca = self.controller.create(
            {
                "nome": "Filtro de Óleo",
                "codigo": "FILT-001",
                "sku": "SKU-001",
                "descricao": "Filtro de óleo para veículo leve",
                "categoria": "Motor",
                "fabricante": "Bosch",
                "fornecedor": "AutoParts",
                "quantidade_estoque": 12,
                "estoque_minimo": 5,
                "preco_custo": 25.0,
                "preco_venda": 40.0,
                "localizacao": "B2-01",
                "status": "ativo",
            }
        )

        self.assertEqual(peca.nome, "Filtro de Óleo")
        self.assertEqual(self.controller.list_all()[0].sku, "SKU-001")
        self.assertEqual(self.controller.get(peca.id).codigo, "FILT-001")
        self.assertTrue(self.controller.delete(peca.id))
        self.assertIsNone(self.controller.get(peca.id))

    def test_nome_codigo_e_sku_sao_obrigatorios(self) -> None:
        with self.assertRaises(ValueError):
            self.controller.create({"nome": "   ", "codigo": "FILT-001", "sku": "SKU-001"})

        with self.assertRaises(ValueError):
            self.controller.create({"nome": "Filtro", "codigo": "   ", "sku": "SKU-001"})

        with self.assertRaises(ValueError):
            self.controller.create({"nome": "Filtro", "codigo": "FILT-001", "sku": "   "})


if __name__ == "__main__":
    unittest.main()
