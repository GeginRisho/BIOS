FROM python:3.11-slim

WORKDIR /workspace

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY search_service/ /workspace/services/search_service/

EXPOSE 8010

CMD ["uvicorn", "services.search_service.main:app", "--host", "0.0.0.0", "--port", "8010"]
