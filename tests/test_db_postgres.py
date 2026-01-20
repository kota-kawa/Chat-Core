import os
import unittest
from unittest.mock import patch

import services.db as db


class DummyConnection:
    def __init__(self):
        self.cursor_args = None
        self.cursor_kwargs = None

    def cursor(self, *args, **kwargs):
        self.cursor_args = args
        self.cursor_kwargs = kwargs
        return "cursor"

    def close(self):
        return None


class DummyPsycopg2:
    def __init__(self, connection):
        self._connection = connection
        self.kwargs = None

    def connect(self, **kwargs):
        self.kwargs = kwargs
        return self._connection


class DummyExtras:
    class RealDictCursor:
        pass


class DBConfigTestCase(unittest.TestCase):
    def test_get_db_connection_uses_postgres_env(self):
        connection = DummyConnection()
        dummy_psycopg2 = DummyPsycopg2(connection)
        env = {
            "POSTGRES_HOST": "pg-host",
            "POSTGRES_USER": "pg-user",
            "POSTGRES_PASSWORD": "pg-pass",
            "POSTGRES_DB": "pg-db",
            "POSTGRES_PORT": "5555",
        }
        with patch.dict(os.environ, env, clear=True), \
             patch.object(db, "psycopg2", dummy_psycopg2), \
             patch.object(db, "extras", DummyExtras):
            proxy = db.get_db_connection()
            cursor = proxy.cursor(dictionary=True)

        self.assertEqual(cursor, "cursor")
        self.assertEqual(dummy_psycopg2.kwargs["host"], "pg-host")
        self.assertEqual(dummy_psycopg2.kwargs["user"], "pg-user")
        self.assertEqual(dummy_psycopg2.kwargs["password"], "pg-pass")
        self.assertEqual(dummy_psycopg2.kwargs["dbname"], "pg-db")
        self.assertEqual(dummy_psycopg2.kwargs["port"], 5555)
        self.assertEqual(connection.cursor_kwargs["cursor_factory"], DummyExtras.RealDictCursor)

    def test_get_db_connection_falls_back_to_mysql_env(self):
        connection = DummyConnection()
        dummy_psycopg2 = DummyPsycopg2(connection)
        env = {
            "MYSQL_HOST": "mysql-host",
            "MYSQL_USER": "mysql-user",
            "MYSQL_PASSWORD": "mysql-pass",
            "MYSQL_DATABASE": "mysql-db",
            "MYSQL_PORT": "15432",
        }
        with patch.dict(os.environ, env, clear=True), \
             patch.object(db, "psycopg2", dummy_psycopg2), \
             patch.object(db, "extras", DummyExtras):
            db.get_db_connection()

        self.assertEqual(dummy_psycopg2.kwargs["host"], "mysql-host")
        self.assertEqual(dummy_psycopg2.kwargs["user"], "mysql-user")
        self.assertEqual(dummy_psycopg2.kwargs["password"], "mysql-pass")
        self.assertEqual(dummy_psycopg2.kwargs["dbname"], "mysql-db")
        self.assertEqual(dummy_psycopg2.kwargs["port"], 15432)


if __name__ == "__main__":
    unittest.main()
