FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p exports logs

# Hugging Face Spaces requires port 7860
EXPOSE 7860

ENV PORT=7860
ENV HOST=0.0.0.0

CMD ["python", "run.py"]
