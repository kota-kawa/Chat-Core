import os
import smtplib
from email.mime.text import MIMEText
from email.utils import formatdate

SEND_ADDRESS = os.getenv('SEND_ADDRESS', 'youzitsurist@gmail.com')
SEND_PASSWORD = os.getenv('EMAIL_SEND_PASSWORD', '[REMOVED_SECRET]')  # 例: アプリパスワード

def send_email(to_address, subject, body_text):
    """指定アドレスにメール送信"""
    smtpobj = smtplib.SMTP("smtp.gmail.com", 587)
    smtpobj.starttls()
    smtpobj.login(SEND_ADDRESS, SEND_PASSWORD)
    msg = MIMEText(body_text)
    msg['Subject'] = subject
    msg['From'] = SEND_ADDRESS
    msg['To'] = to_address
    msg['Date'] = formatdate()
    smtpobj.send_message(msg)
    smtpobj.close()
