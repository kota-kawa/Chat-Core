from flask import render_template

from . import chat_bp, cleanup_ephemeral_chats


@chat_bp.route("/")
def index():
    cleanup_ephemeral_chats()
    return render_template("home.html")


@chat_bp.route("/settings")
def settings():
    return render_template("user_settings.html")
