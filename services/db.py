import os

try:
    import mysql.connector
    from mysql.connector import Error
except ModuleNotFoundError:  # pragma: no cover - optional for test envs
    mysql = None
    Error = Exception

db_config = {
    'host': os.environ.get('MYSQL_HOST', 'mysql_db'),
    'user': os.environ.get('MYSQL_USER', 'chatuser'),
    'password': os.environ.get('MYSQL_PASSWORD', 'chatpass'),
    'database': os.environ.get('MYSQL_DATABASE', 'chat_db')
}


def get_db_connection():
    """MySQLへの接続を返す"""
    if mysql is None:
        raise RuntimeError("mysql-connector-python is required to connect to the database.")
    return mysql.connector.connect(**db_config)
