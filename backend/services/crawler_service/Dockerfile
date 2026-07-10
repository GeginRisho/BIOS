FROM python:3.11-slim

WORKDIR /workspace

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY crawler_service/ /workspace/services/crawler_service/

EXPOSE 8005

CMD ["uvicorn", "services.crawler_service.main:app", "--host", "0.0.0.0", "--port", "8005"]
