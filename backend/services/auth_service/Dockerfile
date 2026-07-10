FROM python:3.11-slim

WORKDIR /workspace

# Install system dependencies (build-essential needed for confluent-kafka compilation if necessary)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service source code
COPY auth_service/ /workspace/services/auth_service/

EXPOSE 8001

CMD ["uvicorn", "services.auth_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
