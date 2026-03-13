FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5004

COPY requirements.txt requirements.txt

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

COPY . .

EXPOSE 5004

CMD ["/wait-for-it.sh", "db:5432", "--timeout=60", "--strict", "--", "uvicorn", "app:app", "--host=0.0.0.0", "--port=5004", "--proxy-headers", "--forwarded-allow-ips=*"]
