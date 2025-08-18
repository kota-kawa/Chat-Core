# prompt_share.py
from flask import Blueprint, render_template

# Blueprint を作成（静的ファイルのパスを適切に指定）
prompt_share_bp = Blueprint(
    'prompt_share',
    __name__,
    template_folder='templates',
    static_folder='static',
    url_prefix='/prompt_share'
)
@prompt_share_bp.route('/')
def index():
    """prompt_share.html をレンダリング"""
    return render_template('prompt_share.html')


@prompt_share_bp.route('/manage_prompts')
def manage_prompts():
    """prompt_manage.html をレンダリング"""
    return render_template('prompt_manage.html')
