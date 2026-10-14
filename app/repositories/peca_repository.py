import os

import psycopg

from app.models.peca import Peca


class PecaRepository:
    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.getenv("DATABASE_URL", "")

    def create(self, peca_data: dict) -> Peca:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO pecas (
                        nome,
                        codigo,
                        sku,
                        codigo_fabricante,
                        descricao,
                        categoria,
                        fabricante,
                        fornecedor,
                        quantidade_estoque,
                        estoque_minimo,
                        preco_custo,
                        preco_venda,
                        localizacao,
                        status,
                        ultima_atualizacao
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING
                        id,
                        nome,
                        codigo,
                        sku,
                        codigo_fabricante,
                        descricao,
                        categoria,
                        fabricante,
                        fornecedor,
                        quantidade_estoque,
                        estoque_minimo,
                        preco_custo,
                        preco_venda,
                        localizacao,
                        status,
                        created_at,
                        ultima_atualizacao,
                        deleted_at
                    """,
                    (
                        peca_data.get("nome"),
                        peca_data.get("codigo"),
                        peca_data.get("sku"),
                        peca_data.get("codigo_fabricante"),
                        peca_data.get("descricao"),
                        peca_data.get("categoria"),
                        peca_data.get("fabricante"),
                        peca_data.get("fornecedor"),
                        peca_data.get("quantidade_estoque", 0),
                        peca_data.get("estoque_minimo", 0),
                        peca_data.get("preco_custo", 0.0),
                        peca_data.get("preco_venda", 0.0),
                        peca_data.get("localizacao"),
                        peca_data.get("status", "ativo"),
                    ),
                )
                row = cursor.fetchone()

        peca = self._row_to_model(row)
        if peca.quantidade_estoque > 0:
            self._register_movement(
                peca_id=peca.id,
                tipo="entrada",
                quantidade_anterior=0,
                quantidade_movimentada=peca.quantidade_estoque,
                quantidade_final=peca.quantidade_estoque,
                motivo="Estoque inicial",
                usuario_responsavel="sistema",
            )
        return peca

    def list_all(
        self,
        filters: dict | None = None,
        search: str | None = None,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[Peca], int]:
        filters = filters or {}
        search = (search or "").strip()

        where_clauses = ["deleted_at IS NULL"]
        params: list = []

        if search:
            where_clauses.append(
                "(LOWER(nome) LIKE LOWER(%s) OR LOWER(codigo) LIKE LOWER(%s) OR LOWER(sku) LIKE LOWER(%s) OR LOWER(COALESCE(codigo_fabricante, '')) LIKE LOWER(%s) OR LOWER(COALESCE(fabricante, '')) LIKE LOWER(%s))"
            )
            pattern = f"%{search}%"
            params.extend([pattern] * 5)

        if filters.get("categoria"):
            where_clauses.append("categoria = %s")
            params.append(filters["categoria"])

        if filters.get("fabricante"):
            where_clauses.append("fabricante = %s")
            params.append(filters["fabricante"])

        if filters.get("status"):
            where_clauses.append("status = %s")
            params.append(filters["status"])

        if filters.get("disponibilidade"):
            if filters["disponibilidade"] == "disponivel":
                where_clauses.append("quantidade_estoque > 0")
            elif filters["disponibilidade"] == "sem_estoque":
                where_clauses.append("quantidade_estoque = 0")

        where_sql = " AND ".join(where_clauses)

        count_query = f"SELECT COUNT(*) FROM pecas WHERE {where_sql}"
        list_query = f"""
            SELECT
                id,
                nome,
                codigo,
                sku,
                codigo_fabricante,
                descricao,
                categoria,
                fabricante,
                fornecedor,
                quantidade_estoque,
                estoque_minimo,
                preco_custo,
                preco_venda,
                localizacao,
                status,
                created_at,
                ultima_atualizacao,
                deleted_at
            FROM pecas
            WHERE {where_sql}
            ORDER BY ultima_atualizacao DESC, id DESC
            LIMIT %s OFFSET %s
        """

        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(count_query, params)
                total = cursor.fetchone()[0]

                query_params = params + [per_page, (page - 1) * per_page]
                cursor.execute(list_query, query_params)
                rows = cursor.fetchall()

        return [self._row_to_model(row) for row in rows], total

    def get_by_id(self, peca_id: int) -> Peca | None:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        id,
                        nome,
                        codigo,
                        sku,
                        codigo_fabricante,
                        descricao,
                        categoria,
                        fabricante,
                        fornecedor,
                        quantidade_estoque,
                        estoque_minimo,
                        preco_custo,
                        preco_venda,
                        localizacao,
                        status,
                        created_at,
                        ultima_atualizacao,
                        deleted_at
                    FROM pecas
                    WHERE id = %s AND deleted_at IS NULL
                    """,
                    (peca_id,),
                )
                row = cursor.fetchone()

        if row is None:
            return None
        return self._row_to_model(row)

    def update(self, peca_id: int, peca_data: dict) -> Peca | None:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                existing = self.get_by_id(peca_id)
                if existing is None:
                    return None

                if "quantidade_estoque" in peca_data and peca_data["quantidade_estoque"] != existing.quantidade_estoque:
                    quantidade_anterior = existing.quantidade_estoque
                    quantidade_final = peca_data["quantidade_estoque"]
                    quantidade_movimentada = quantidade_final - quantidade_anterior
                    tipo = "entrada" if quantidade_movimentada >= 0 else "saida"
                    self._register_movement(
                        cursor=cursor,
                        peca_id=peca_id,
                        tipo=tipo,
                        quantidade_anterior=quantidade_anterior,
                        quantidade_movimentada=abs(quantidade_movimentada),
                        quantidade_final=quantidade_final,
                        motivo=peca_data.get("motivo") or "Ajuste de estoque",
                        usuario_responsavel=peca_data.get("usuario_responsavel") or "sistema",
                    )

                columns = []
                values = []
                for field in [
                    "nome",
                    "codigo",
                    "sku",
                    "codigo_fabricante",
                    "descricao",
                    "categoria",
                    "fabricante",
                    "fornecedor",
                    "estoque_minimo",
                    "preco_custo",
                    "preco_venda",
                    "localizacao",
                    "status",
                ]:
                    if field in peca_data:
                        columns.append(f"{field} = %s")
                        values.append(peca_data[field])

                if "quantidade_estoque" in peca_data:
                    columns.append("quantidade_estoque = %s")
                    values.append(peca_data["quantidade_estoque"])

                if columns:
                    columns.append("ultima_atualizacao = NOW()")
                    values.append(peca_id)
                    cursor.execute(
                        f"UPDATE pecas SET {', '.join(columns)} WHERE id = %s AND deleted_at IS NULL",
                        values,
                    )

                cursor.execute(
                    """
                    SELECT
                        id,
                        nome,
                        codigo,
                        sku,
                        codigo_fabricante,
                        descricao,
                        categoria,
                        fabricante,
                        fornecedor,
                        quantidade_estoque,
                        estoque_minimo,
                        preco_custo,
                        preco_venda,
                        localizacao,
                        status,
                        created_at,
                        ultima_atualizacao,
                        deleted_at
                    FROM pecas
                    WHERE id = %s AND deleted_at IS NULL
                    """,
                    (peca_id,),
                )
                row = cursor.fetchone()

        return self._row_to_model(row)

    def delete(self, peca_id: int) -> bool:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE pecas SET deleted_at = NOW() WHERE id = %s AND deleted_at IS NULL RETURNING id",
                    (peca_id,),
                )
                return cursor.fetchone() is not None

    def _register_movement(
        self,
        peca_id: int,
        tipo: str,
        quantidade_anterior: int,
        quantidade_movimentada: int,
        quantidade_final: int,
        motivo: str | None,
        usuario_responsavel: str | None,
        cursor=None,
    ) -> None:
        if cursor is None:
            with psycopg.connect(self.database_url) as connection:
                with connection.cursor() as movement_cursor:
                    self._register_movement(
                        peca_id,
                        tipo,
                        quantidade_anterior,
                        quantidade_movimentada,
                        quantidade_final,
                        motivo,
                        usuario_responsavel,
                        movement_cursor,
                    )
            return

        cursor.execute(
            """
            INSERT INTO movimentacoes_estoque (
                peca_id,
                tipo,
                quantidade_anterior,
                quantidade_movimentada,
                quantidade_final,
                motivo,
                usuario_responsavel
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                peca_id,
                tipo,
                quantidade_anterior,
                quantidade_movimentada,
                quantidade_final,
                motivo,
                usuario_responsavel or "sistema",
            ),
        )

    def _row_to_model(self, row: tuple) -> Peca:
        if row is None:
            raise ValueError("Peca nao encontrada.")

        return Peca(
            id=row[0],
            nome=row[1],
            codigo=row[2],
            sku=row[3],
            codigo_fabricante=row[4],
            descricao=row[5],
            categoria_id=None,
            categoria=row[6],
            fabricante_id=None,
            fabricante=row[7],
            fornecedor_id=None,
            fornecedor=row[8],
            quantidade_estoque=row[9],
            estoque_minimo=row[10],
            preco_custo=float(row[11]),
            preco_venda=float(row[12]),
            localizacao=row[13],
            status=row[14],
            created_at=row[15].isoformat() if row[15] else None,
            ultima_atualizacao=row[16].isoformat() if row[16] else None,
            deleted_at=row[17].isoformat() if row[17] else None,
        )
