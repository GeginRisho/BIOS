FROM python:3.11-slim

WORKDIR /workspace

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY simulation_service/ /workspace/services/simulation_service/

EXPOSE 8008

CMD ["uvicorn", "services.simulation_service.main:app", "--host", "0.0.0.0", "--port", "8008"]
