import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
import psycopg
from werkzeug.exceptions import HTTPException

from app.controllers.cliente_controller import ClienteController
from app.controllers.orcamento_controller import OrcamentoController
from app.controllers.ordem_servico_controller import OrdemServicoController
from app.controllers.peca_controller import PecaController
from app.controllers.veiculo_controller import VeiculoController
from app.repositories.cliente_repository import ClienteRepository
from app.repositories.orcamento_repository import OrcamentoRepository
from app.repositories.ordem_servico_repository import OrdemServicoRepository
from app.repositories.peca_repository import PecaRepository
from app.repositories.veiculo_repository import VeiculoRepository


app = Flask(
    __name__,
    static_folder="app/views/static",
)
cliente_controller = ClienteController(ClienteRepository())
peca_controller = PecaController(PecaRepository())
veiculo_controller = VeiculoController(VeiculoRepository())
ordem_repository = OrdemServicoRepository()
ordem_servico_controller = OrdemServicoController(ordem_repository)
orcamento_controller = OrcamentoController(OrcamentoRepository(), ordem_repository)

API_PREFIXES = (
    "/pecas",
    "/clientes",
    "/veiculos",
    "/orcamentos",
    "/ordens-servico",
    "/health",
)


def is_api_request() -> bool:
    return any(request.path.startswith(prefix) for prefix in API_PREFIXES)


@app.errorhandler(HTTPException)
def handle_http_exception(error):
    if is_api_request():
        return jsonify(
            error=f"{type(error).__name__}: {error.description or 'Erro na requisicao.'}"
        ), error.code or 500
    return error


@app.errorhandler(Exception)
def handle_unexpected_exception(error):
    if is_api_request():
        return jsonify(
            error=f"{type(error).__name__}: {error}"
        ), 500
    return error


@app.get("/")
def home():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/clientes")
def create_cliente():
    try:
        data = request.get_json(silent=True) or {}
        cliente = cliente_controller.create(data.get("nome", ""))
        return jsonify({"id": cliente.id, "nome": cliente.nome}), 201
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400


@app.get("/clientes")
def list_clientes():
    clientes = cliente_controller.list_all()
    return jsonify([{"id": cliente.id, "nome": cliente.nome} for cliente in clientes])


@app.get("/clientes/<int:cliente_id>")
def get_cliente(cliente_id: int):
    cliente = cliente_controller.get(cliente_id)
    if cliente is None:
        return jsonify(error="Cliente nao encontrado"), 404
    return jsonify({"id": cliente.id, "nome": cliente.nome})


@app.delete("/clientes/<int:cliente_id>")
def delete_cliente(cliente_id: int):
    if not cliente_controller.delete(cliente_id):
        return jsonify(error="Cliente nao encontrado"), 404
    return "", 204


@app.get("/veiculos")
def list_veiculos():
    try:
        search = request.args.get("search") or None
        cliente_id = request.args.get("cliente_id")
        cliente_id_value = int(cliente_id) if cliente_id else None
        veiculos = veiculo_controller.list_all(search, cliente_id_value)
        return jsonify([serialize_veiculo(veiculo) for veiculo in veiculos])
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400


@app.post("/veiculos")
def create_veiculo():
    try:
        data = request.get_json(silent=True) or {}
        veiculo = veiculo_controller.create(data)
        return jsonify(serialize_veiculo(veiculo)), 201
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400
    except psycopg.errors.UniqueViolation:
        return jsonify(error="Placa ja cadastrada."), 409
    except psycopg.errors.ForeignKeyViolation:
        return jsonify(error="Cliente informado nao existe."), 400


@app.get("/veiculos/<int:veiculo_id>")
def get_veiculo(veiculo_id: int):
    veiculo = veiculo_controller.get(veiculo_id)
    if veiculo is None:
        return jsonify(error="Veiculo nao encontrado"), 404
    return jsonify(serialize_veiculo(veiculo))


@app.route("/veiculos/<int:veiculo_id>", methods=["PUT", "PATCH"])
def update_veiculo(veiculo_id: int):
    try:
        data = request.get_json(silent=True) or {}
        veiculo = veiculo_controller.update(veiculo_id, data)
        if veiculo is None:
            return jsonify(error="Veiculo nao encontrado"), 404
        return jsonify(serialize_veiculo(veiculo))
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400
    except psycopg.errors.UniqueViolation:
        return jsonify(error="Placa ja cadastrada."), 409
    except psycopg.errors.ForeignKeyViolation:
        return jsonify(error="Cliente informado nao existe."), 400


@app.delete("/veiculos/<int:veiculo_id>")
def delete_veiculo(veiculo_id: int):
    try:
        if not veiculo_controller.delete(veiculo_id):
            return jsonify(error="Veiculo nao encontrado"), 404
        return "", 204
    except psycopg.errors.ForeignKeyViolation:
        return jsonify(error="Veiculo possui orcamentos ou ordens vinculadas."), 409


@app.get("/orcamentos")
def list_orcamentos():
    try:
        search = request.args.get("search") or None
        status = request.args.get("status") or None
        orcamentos = orcamento_controller.list_all(search, status)
        return jsonify([serialize_orcamento(orcamento) for orcamento in orcamentos])
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400


@app.post("/orcamentos")
def create_orcamento():
    try:
        data = request.get_json(silent=True) or {}
        orcamento = orcamento_controller.create(data)
        return jsonify(serialize_orcamento(orcamento)), 201
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400
    except psycopg.errors.ForeignKeyViolation:
        return jsonify(error="Cliente ou veiculo informado nao existe."), 400


@app.get("/orcamentos/<int:orcamento_id>")
def get_orcamento(orcamento_id: int):
    orcamento = orcamento_controller.get(orcamento_id)
    if orcamento is None:
        return jsonify(error="Orcamento nao encontrado"), 404
    return jsonify(serialize_orcamento(orcamento))


@app.route("/orcamentos/<int:orcamento_id>", methods=["PUT", "PATCH"])
def update_orcamento(orcamento_id: int):
    try:
        data = request.get_json(silent=True) or {}
        orcamento = orcamento_controller.update(orcamento_id, data)
        if orcamento is None:
            return jsonify(error="Orcamento nao encontrado"), 404
        return jsonify(serialize_orcamento(orcamento))
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400
    except psycopg.errors.ForeignKeyViolation:
        return jsonify(error="Cliente ou veiculo informado nao existe."), 400


@app.delete("/orcamentos/<int:orcamento_id>")
def delete_orcamento(orcamento_id: int):
    try:
        if not orcamento_controller.delete(orcamento_id):
            return jsonify(error="Orcamento nao encontrado"), 404
        return "", 204
    except ValueError as error:
        return jsonify(error=str(error)), 400


@app.post("/orcamentos/<int:orcamento_id>/converter")
def converter_orcamento(orcamento_id: int):
    try:
        ordem = orcamento_controller.converter_para_os(orcamento_id)
        return jsonify(serialize_ordem_servico(ordem)), 201
    except LookupError as error:
        return jsonify(error=str(error)), 404
    except ValueError as error:
        return jsonify(error=str(error)), 400
    except psycopg.errors.UniqueViolation:
        return jsonify(error="Este orcamento ja possui ordem de servico."), 409


@app.get("/ordens-servico")
def list_ordens_servico():
    try:
        search = request.args.get("search") or None
        status = request.args.get("status") or None
        ordens = ordem_servico_controller.list_all(search, status)
        return jsonify([serialize_ordem_servico(ordem) for ordem in ordens])
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400


@app.post("/ordens-servico")
def create_ordem_servico():
    try:
        data = request.get_json(silent=True) or {}
        ordem = ordem_servico_controller.create(data)
        return jsonify(serialize_ordem_servico(ordem)), 201
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400
    except psycopg.errors.ForeignKeyViolation:
        return jsonify(error="Cliente, veiculo ou orcamento informado nao existe."), 400


@app.get("/ordens-servico/<int:ordem_id>")
def get_ordem_servico(ordem_id: int):
    ordem = ordem_servico_controller.get(ordem_id)
    if ordem is None:
        return jsonify(error="Ordem de servico nao encontrada"), 404
    return jsonify(serialize_ordem_servico(ordem))


@app.route("/ordens-servico/<int:ordem_id>", methods=["PUT", "PATCH"])
def update_ordem_servico(ordem_id: int):
    try:
        data = request.get_json(silent=True) or {}
        ordem = ordem_servico_controller.update(ordem_id, data)
        if ordem is None:
            return jsonify(error="Ordem de servico nao encontrada"), 404
        return jsonify(serialize_ordem_servico(ordem))
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400
    except psycopg.errors.ForeignKeyViolation:
        return jsonify(error="Cliente, veiculo ou orcamento informado nao existe."), 400


@app.delete("/ordens-servico/<int:ordem_id>")
def delete_ordem_servico(ordem_id: int):
    if not ordem_servico_controller.delete(ordem_id):
        return jsonify(error="Ordem de servico nao encontrada"), 404
    return "", 204


@app.get("/pecas")
def list_pecas():
    try:
        filters = {
            "categoria": request.args.get("categoria") or None,
            "fabricante": request.args.get("fabricante") or None,
            "status": request.args.get("status") or None,
            "disponibilidade": request.args.get("disponibilidade") or None,
        }
        search = request.args.get("search") or None
        page = max(int(request.args.get("page", 1)), 1)
        per_page = max(int(request.args.get("per_page", 20)), 1)

        pecas, total = peca_controller.list_all(filters, search, page, per_page)
        return jsonify(
            {
                "items": [serialize_peca(peca) for peca in pecas],
                "total": total,
                "page": page,
                "per_page": per_page,
            }
        )
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400
    except Exception as error:
        return jsonify(error=f"Erro ao listar peças: {error}"), 500


@app.post("/pecas")
def create_peca():
    try:
        data = request.get_json(silent=True) or {}
        peca = peca_controller.create(data)
        return jsonify(serialize_peca(peca)), 201
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400
    except psycopg.errors.UniqueViolation:
        return jsonify(error="Codigo ou SKU duplicado."), 409
    except Exception as error:
        return jsonify(error=f"Erro ao criar peça: {error}"), 500


@app.get("/pecas/<int:peca_id>")
def get_peca(peca_id: int):
    try:
        peca = peca_controller.get(peca_id)
        if peca is None:
            return jsonify(error="Peca nao encontrada"), 404
        return jsonify(serialize_peca(peca))
    except Exception as error:
        return jsonify(error=f"Erro ao buscar peça: {error}"), 500


@app.route("/pecas/<int:peca_id>", methods=["PUT", "PATCH"])
def update_peca(peca_id: int):
    try:
        data = request.get_json(silent=True) or {}
        peca = peca_controller.update(peca_id, data)
        if peca is None:
            return jsonify(error="Peca nao encontrada"), 404
        return jsonify(serialize_peca(peca))
    except (TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400
    except psycopg.errors.UniqueViolation:
        return jsonify(error="Codigo ou SKU duplicado."), 409
    except Exception as error:
        return jsonify(error=f"Erro ao atualizar peça: {error}"), 500


@app.delete("/pecas/<int:peca_id>")
def delete_peca(peca_id: int):
    try:
        if not peca_controller.delete(peca_id):
            return jsonify(error="Peca nao encontrada"), 404
        return "", 204
    except Exception as error:
        return jsonify(error=f"Erro ao excluir peça: {error}"), 500


def serialize_peca(peca):
    return {
        "id": peca.id,
        "nome": peca.nome,
        "codigo": peca.codigo,
        "sku": peca.sku,
        "codigo_fabricante": peca.codigo_fabricante,
        "descricao": peca.descricao,
        "categoria": peca.categoria,
        "fabricante": peca.fabricante,
        "fornecedor": peca.fornecedor,
        "quantidade_estoque": peca.quantidade_estoque,
        "estoque_minimo": peca.estoque_minimo,
        "preco_custo": float(peca.preco_custo),
        "preco_venda": float(peca.preco_venda),
        "localizacao": peca.localizacao,
        "status": peca.status,
        "ultima_atualizacao": peca.ultima_atualizacao,
        "created_at": peca.created_at,
    }


def serialize_veiculo(veiculo):
    return {
        "id": veiculo.id,
        "cliente_id": veiculo.cliente_id,
        "cliente_nome": veiculo.cliente_nome,
        "placa": veiculo.placa,
        "marca": veiculo.marca,
        "modelo": veiculo.modelo,
        "ano": veiculo.ano,
        "cor": veiculo.cor,
        "observacoes": veiculo.observacoes,
        "created_at": veiculo.created_at,
        "updated_at": veiculo.updated_at,
    }


def serialize_item(item):
    return {
        "id": item.id,
        "descricao": item.descricao,
        "quantidade": float(item.quantidade),
        "valor_unitario": float(item.valor_unitario),
        "peca_id": item.peca_id,
        "subtotal": round(float(item.quantidade) * float(item.valor_unitario), 2),
    }


def serialize_orcamento(orcamento):
    return {
        "id": orcamento.id,
        "cliente_id": orcamento.cliente_id,
        "cliente_nome": orcamento.cliente_nome,
        "veiculo_id": orcamento.veiculo_id,
        "veiculo_placa": orcamento.veiculo_placa,
        "veiculo_descricao": orcamento.veiculo_descricao,
        "status": orcamento.status,
        "observacoes": orcamento.observacoes,
        "valor_total": float(orcamento.valor_total),
        "itens": [serialize_item(item) for item in orcamento.itens],
        "created_at": orcamento.created_at,
        "updated_at": orcamento.updated_at,
    }


def serialize_ordem_servico(ordem):
    return {
        "id": ordem.id,
        "cliente_id": ordem.cliente_id,
        "cliente_nome": ordem.cliente_nome,
        "veiculo_id": ordem.veiculo_id,
        "veiculo_placa": ordem.veiculo_placa,
        "veiculo_descricao": ordem.veiculo_descricao,
        "orcamento_id": ordem.orcamento_id,
        "status": ordem.status,
        "observacoes": ordem.observacoes,
        "valor_total": float(ordem.valor_total),
        "itens": [serialize_item(item) for item in ordem.itens],
        "data_abertura": ordem.data_abertura,
        "data_conclusao": ordem.data_conclusao,
        "created_at": ordem.created_at,
        "updated_at": ordem.updated_at,
    }


def ensure_database_schema() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return

    init_sql_path = Path(__file__).resolve().parent / "database" / "init.sql"
    if not init_sql_path.exists():
        return

    sql_script = init_sql_path.read_text(encoding="utf-8")
    statements = [statement.strip() for statement in sql_script.split(";") if statement.strip()]

    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)


if __name__ == "__main__":
    ensure_database_schema()
    app.run(host="0.0.0.0", port=8000)
