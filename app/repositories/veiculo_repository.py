import os

import psycopg

from app.models.veiculo import Veiculo


class VeiculoRepository:
    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.getenv("DATABASE_URL", "")

    def create(self, data: dict) -> Veiculo:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO veiculos (
                        cliente_id, placa, marca, modelo, ano, cor, observacoes, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING id, cliente_id, placa, marca, modelo, ano, cor, observacoes,
                              created_at, updated_at
                    """,
                    (
                        data["cliente_id"],
                        data["placa"],
                        data["marca"],
                        data["modelo"],
                        data.get("ano"),
                        data.get("cor"),
                        data.get("observacoes"),
                    ),
                )
                row = cursor.fetchone()
        return self.get_by_id(row[0])  # type: ignore[arg-type]

    def list_all(
        self,
        search: str | None = None,
        cliente_id: int | None = None,
    ) -> list[Veiculo]:
        where_clauses: list[str] = []
        params: list = []

        if search:
            where_clauses.append(
                "(LOWER(v.placa) LIKE %s OR LOWER(v.marca) LIKE %s OR LOWER(v.modelo) LIKE %s OR LOWER(c.nome) LIKE %s)"
            )
            term = f"%{search.lower()}%"
            params.extend([term, term, term, term])

        if cliente_id is not None:
            where_clauses.append("v.cliente_id = %s")
            params.append(cliente_id)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT v.id, v.cliente_id, v.placa, v.marca, v.modelo, v.ano, v.cor,
                           v.observacoes, v.created_at, v.updated_at, c.nome
                    FROM veiculos v
                    JOIN clientes c ON c.id = v.cliente_id
                    {where_sql}
                    ORDER BY v.id DESC
                    """,
                    params,
                )
                rows = cursor.fetchall()
        return [self._row_to_model(row) for row in rows]

    def get_by_id(self, veiculo_id: int) -> Veiculo | None:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT v.id, v.cliente_id, v.placa, v.marca, v.modelo, v.ano, v.cor,
                           v.observacoes, v.created_at, v.updated_at, c.nome
                    FROM veiculos v
                    JOIN clientes c ON c.id = v.cliente_id
                    WHERE v.id = %s
                    """,
                    (veiculo_id,),
                )
                row = cursor.fetchone()
        if row is None:
            return None
        return self._row_to_model(row)

    def update(self, veiculo_id: int, data: dict) -> Veiculo | None:
        if not data:
            return self.get_by_id(veiculo_id)

        fields = []
        params: list = []
        for key in ("cliente_id", "placa", "marca", "modelo", "ano", "cor", "observacoes"):
            if key in data:
                fields.append(f"{key} = %s")
                params.append(data[key])

        if not fields:
            return self.get_by_id(veiculo_id)

        fields.append("updated_at = NOW()")
        params.append(veiculo_id)

        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"UPDATE veiculos SET {', '.join(fields)} WHERE id = %s",
                    params,
                )
                if cursor.rowcount == 0:
                    return None
        return self.get_by_id(veiculo_id)

    def delete(self, veiculo_id: int) -> bool:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM veiculos WHERE id = %s", (veiculo_id,))
                return cursor.rowcount > 0

    def _row_to_model(self, row) -> Veiculo:
        return Veiculo(
            id=row[0],
            cliente_id=row[1],
            placa=row[2],
            marca=row[3],
            modelo=row[4],
            ano=row[5],
            cor=row[6],
            observacoes=row[7],
            created_at=row[8].isoformat() if row[8] else None,
            updated_at=row[9].isoformat() if row[9] else None,
            cliente_nome=row[10] if len(row) > 10 else None,
        )
