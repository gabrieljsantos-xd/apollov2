import os

import psycopg

from app.models.cliente import Cliente


class ClienteRepository:
    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.getenv("DATABASE_URL", "")

    def create(self, nome: str) -> Cliente:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO clientes (nome) VALUES (%s) RETURNING id, nome",
                    (nome,),
                )
                cliente_id, cliente_nome = cursor.fetchone()
        return Cliente(id=cliente_id, nome=cliente_nome)

    def list_all(self) -> list[Cliente]:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id, nome FROM clientes ORDER BY id")
                rows = cursor.fetchall()
        return [Cliente(id=cliente_id, nome=nome) for cliente_id, nome in rows]

    def get_by_id(self, cliente_id: int) -> Cliente | None:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id, nome FROM clientes WHERE id = %s", (cliente_id,))
                row = cursor.fetchone()
        if row is None:
            return None
        return Cliente(id=row[0], nome=row[1])

    def delete(self, cliente_id: int) -> bool:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM clientes WHERE id = %s", (cliente_id,))
                return cursor.rowcount > 0
