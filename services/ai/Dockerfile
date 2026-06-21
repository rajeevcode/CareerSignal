FROM python:3.12-slim

WORKDIR /app

# pymupdf ships prebuilt binary wheels, so no system MuPDF dev headers are needed.

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
