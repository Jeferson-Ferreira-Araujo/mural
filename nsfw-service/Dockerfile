FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
# libs que o OpenCV precisa, mesmo na versão headless
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 && rm -rf /var/lib/apt/lists/*
RUN pip install nudenet==3.4.2 opencv-python-headless
COPY app.py .
# baixa o modelo (~12 MB) já na construção da imagem: o contêiner não precisa de internet para rodar
RUN python -c "from nudenet import NudeDetector; NudeDetector()"
EXPOSE 8080
CMD ["python", "app.py"]
