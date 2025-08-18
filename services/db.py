import os
import mysql.connector

db_config = {
    'host': os.environ.get('MYSQL_HOST', 'mysql_db'),
    'user': os.environ.get('MYSQL_USER', 'chatuser'),
    'password': os.environ.get('MYSQL_PASSWORD', 'chatpass'),
    'database': os.environ.get('MYSQL_DATABASE', 'chat_db')
}

def get_db_connection():
    """MySQLへの接続を返す"""
    return mysql.connector.connect(**db_config)
