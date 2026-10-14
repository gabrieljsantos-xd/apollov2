import os

import psycopg

from app.models.orcamento import Orcamento, OrcamentoItem


class OrcamentoRepository:
    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.getenv("DATABASE_URL", "")

    def create(self, data: dict) -> Orcamento:
        itens = data.get("itens") or []
        valor_total = self._calc_total(itens)

        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO orcamentos (
                        cliente_id, veiculo_id, status, observacoes, valor_total, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    RETURNING id
                    """,
                    (
                        data["cliente_id"],
                        data["veiculo_id"],
                        data.get("status", "rascunho"),
                        data.get("observacoes"),
                        valor_total,
                    ),
                )
                orcamento_id = cursor.fetchone()[0]
                self._replace_itens(cursor, orcamento_id, itens)
        return self.get_by_id(orcamento_id)  # type: ignore[arg-type]

    def list_all(self, search: str | None = None, status: str | None = None) -> list[Orcamento]:
        where_clauses: list[str] = []
        params: list = []

        if search:
            where_clauses.append(
                "(LOWER(c.nome) LIKE %s OR LOWER(v.placa) LIKE %s OR CAST(o.id AS TEXT) LIKE %s)"
            )
            term = f"%{search.lower()}%"
            params.extend([term, term, term])

        if status:
            where_clauses.append("o.status = %s")
            params.append(status)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT o.id, o.cliente_id, o.veiculo_id, o.status, o.observacoes, o.valor_total,
                           o.created_at, o.updated_at, c.nome, v.placa, v.marca, v.modelo
                    FROM orcamentos o
                    JOIN clientes c ON c.id = o.cliente_id
                    JOIN veiculos v ON v.id = o.veiculo_id
                    {where_sql}
                    ORDER BY o.id DESC
                    """,
                    params,
                )
                rows = cursor.fetchall()
                orcamentos = [self._row_to_model(row) for row in rows]
                for orcamento in orcamentos:
                    orcamento.itens = self._list_itens(cursor, orcamento.id)
        return orcamentos

    def get_by_id(self, orcamento_id: int) -> Orcamento | None:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT o.id, o.cliente_id, o.veiculo_id, o.status, o.observacoes, o.valor_total,
                           o.created_at, o.updated_at, c.nome, v.placa, v.marca, v.modelo
                    FROM orcamentos o
                    JOIN clientes c ON c.id = o.cliente_id
                    JOIN veiculos v ON v.id = o.veiculo_id
                    WHERE o.id = %s
                    """,
                    (orcamento_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    return None
                orcamento = self._row_to_model(row)
                orcamento.itens = self._list_itens(cursor, orcamento.id)
                return orcamento

    def update(self, orcamento_id: int, data: dict) -> Orcamento | None:
        current = self.get_by_id(orcamento_id)
        if current is None:
            return None

        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                fields = []
                params: list = []

                for key in ("cliente_id", "veiculo_id", "status", "observacoes"):
                    if key in data:
                        fields.append(f"{key} = %s")
                        params.append(data[key])

                if "itens" in data:
                    itens = data["itens"] or []
                    self._replace_itens(cursor, orcamento_id, itens)
                    fields.append("valor_total = %s")
                    params.append(self._calc_total(itens))

                if fields:
                    fields.append("updated_at = NOW()")
                    params.append(orcamento_id)
                    cursor.execute(
                        f"UPDATE orcamentos SET {', '.join(fields)} WHERE id = %s",
                        params,
                    )

        return self.get_by_id(orcamento_id)

    def delete(self, orcamento_id: int) -> bool:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM orcamentos WHERE id = %s", (orcamento_id,))
                return cursor.rowcount > 0

    def _replace_itens(self, cursor, orcamento_id: int, itens: list[dict]) -> None:
        cursor.execute("DELETE FROM orcamento_itens WHERE orcamento_id = %s", (orcamento_id,))
        for item in itens:
            cursor.execute(
                """
                INSERT INTO orcamento_itens (
                    orcamento_id, descricao, quantidade, valor_unitario, peca_id
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    orcamento_id,
                    item["descricao"],
                    item["quantidade"],
                    item["valor_unitario"],
                    item.get("peca_id"),
                ),
            )

    def _list_itens(self, cursor, orcamento_id: int) -> list[OrcamentoItem]:
        cursor.execute(
            """
            SELECT id, orcamento_id, descricao, quantidade, valor_unitario, peca_id
            FROM orcamento_itens
            WHERE orcamento_id = %s
            ORDER BY id
            """,
            (orcamento_id,),
        )
        return [
            OrcamentoItem(
                id=row[0],
                orcamento_id=row[1],
                descricao=row[2],
                quantidade=float(row[3]),
                valor_unitario=float(row[4]),
                peca_id=row[5],
            )
            for row in cursor.fetchall()
        ]

    def _calc_total(self, itens: list[dict]) -> float:
        return round(
            sum(float(item["quantidade"]) * float(item["valor_unitario"]) for item in itens),
            2,
        )

    def _row_to_model(self, row) -> Orcamento:
        marca = row[10]
        modelo = row[11]
        return Orcamento(
            id=row[0],
            cliente_id=row[1],
            veiculo_id=row[2],
            status=row[3],
            observacoes=row[4],
            valor_total=float(row[5] or 0),
            created_at=row[6].isoformat() if row[6] else None,
            updated_at=row[7].isoformat() if row[7] else None,
            cliente_nome=row[8],
            veiculo_placa=row[9],
            veiculo_descricao=f"{marca} {modelo}".strip(),
        )
