import os

import psycopg

from app.models.ordem_servico import OrdemServico, OrdemServicoItem


class OrdemServicoRepository:
    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.getenv("DATABASE_URL", "")

    def create(self, data: dict) -> OrdemServico:
        itens = data.get("itens") or []
        valor_total = self._calc_total(itens)
        status = data.get("status", "aberta")

        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO ordens_servico (
                        cliente_id, veiculo_id, orcamento_id, status, observacoes,
                        valor_total, data_conclusao, updated_at
                    )
                    VALUES (
                        %s, %s, %s, %s, %s, %s,
                        CASE WHEN %s = 'concluida' THEN NOW() ELSE NULL END,
                        NOW()
                    )
                    RETURNING id
                    """,
                    (
                        data["cliente_id"],
                        data["veiculo_id"],
                        data.get("orcamento_id"),
                        status,
                        data.get("observacoes"),
                        valor_total,
                        status,
                    ),
                )
                ordem_id = cursor.fetchone()[0]
                self._replace_itens(cursor, ordem_id, itens)
        return self.get_by_id(ordem_id)  # type: ignore[arg-type]

    def list_all(self, search: str | None = None, status: str | None = None) -> list[OrdemServico]:
        where_clauses: list[str] = []
        params: list = []

        if search:
            where_clauses.append(
                "(LOWER(c.nome) LIKE %s OR LOWER(v.placa) LIKE %s OR CAST(os.id AS TEXT) LIKE %s)"
            )
            term = f"%{search.lower()}%"
            params.extend([term, term, term])

        if status:
            where_clauses.append("os.status = %s")
            params.append(status)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT os.id, os.cliente_id, os.veiculo_id, os.orcamento_id, os.status,
                           os.observacoes, os.valor_total, os.data_abertura, os.data_conclusao,
                           os.created_at, os.updated_at, c.nome, v.placa, v.marca, v.modelo
                    FROM ordens_servico os
                    JOIN clientes c ON c.id = os.cliente_id
                    JOIN veiculos v ON v.id = os.veiculo_id
                    {where_sql}
                    ORDER BY os.id DESC
                    """,
                    params,
                )
                rows = cursor.fetchall()
                ordens = [self._row_to_model(row) for row in rows]
                for ordem in ordens:
                    ordem.itens = self._list_itens(cursor, ordem.id)
        return ordens

    def get_by_id(self, ordem_id: int) -> OrdemServico | None:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT os.id, os.cliente_id, os.veiculo_id, os.orcamento_id, os.status,
                           os.observacoes, os.valor_total, os.data_abertura, os.data_conclusao,
                           os.created_at, os.updated_at, c.nome, v.placa, v.marca, v.modelo
                    FROM ordens_servico os
                    JOIN clientes c ON c.id = os.cliente_id
                    JOIN veiculos v ON v.id = os.veiculo_id
                    WHERE os.id = %s
                    """,
                    (ordem_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    return None
                ordem = self._row_to_model(row)
                ordem.itens = self._list_itens(cursor, ordem.id)
                return ordem

    def update(self, ordem_id: int, data: dict) -> OrdemServico | None:
        current = self.get_by_id(ordem_id)
        if current is None:
            return None

        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                fields = []
                params: list = []

                for key in ("cliente_id", "veiculo_id", "orcamento_id", "observacoes"):
                    if key in data:
                        fields.append(f"{key} = %s")
                        params.append(data[key])

                if "status" in data:
                    fields.append("status = %s")
                    params.append(data["status"])
                    if data["status"] == "concluida" and current.status != "concluida":
                        fields.append("data_conclusao = NOW()")
                    elif data["status"] != "concluida":
                        fields.append("data_conclusao = NULL")

                if "itens" in data:
                    itens = data["itens"] or []
                    self._replace_itens(cursor, ordem_id, itens)
                    fields.append("valor_total = %s")
                    params.append(self._calc_total(itens))

                if fields:
                    fields.append("updated_at = NOW()")
                    params.append(ordem_id)
                    cursor.execute(
                        f"UPDATE ordens_servico SET {', '.join(fields)} WHERE id = %s",
                        params,
                    )

        return self.get_by_id(ordem_id)

    def delete(self, ordem_id: int) -> bool:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM ordens_servico WHERE id = %s", (ordem_id,))
                return cursor.rowcount > 0

    def _replace_itens(self, cursor, ordem_id: int, itens: list[dict]) -> None:
        cursor.execute("DELETE FROM ordem_servico_itens WHERE ordem_servico_id = %s", (ordem_id,))
        for item in itens:
            cursor.execute(
                """
                INSERT INTO ordem_servico_itens (
                    ordem_servico_id, descricao, quantidade, valor_unitario, peca_id
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    ordem_id,
                    item["descricao"],
                    item["quantidade"],
                    item["valor_unitario"],
                    item.get("peca_id"),
                ),
            )

    def _list_itens(self, cursor, ordem_id: int) -> list[OrdemServicoItem]:
        cursor.execute(
            """
            SELECT id, ordem_servico_id, descricao, quantidade, valor_unitario, peca_id
            FROM ordem_servico_itens
            WHERE ordem_servico_id = %s
            ORDER BY id
            """,
            (ordem_id,),
        )
        return [
            OrdemServicoItem(
                id=row[0],
                ordem_servico_id=row[1],
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

    def _row_to_model(self, row) -> OrdemServico:
        return OrdemServico(
            id=row[0],
            cliente_id=row[1],
            veiculo_id=row[2],
            orcamento_id=row[3],
            status=row[4],
            observacoes=row[5],
            valor_total=float(row[6] or 0),
            data_abertura=row[7].isoformat() if row[7] else None,
            data_conclusao=row[8].isoformat() if row[8] else None,
            created_at=row[9].isoformat() if row[9] else None,
            updated_at=row[10].isoformat() if row[10] else None,
            cliente_nome=row[11],
            veiculo_placa=row[12],
            veiculo_descricao=f"{row[13]} {row[14]}".strip(),
        )
