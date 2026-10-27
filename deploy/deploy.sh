#!/bin/sh
# Cópia do /opt/mural/deploy.sh do VPS. Atualiza o código, reconstrói a imagem e reinicia o container.
# Antes de trocar, guarda a imagem que está no ar como mural-site-mural:prev (para o rollback.sh voltar sem recompilar)
# e o commit em /opt/mural/prev_commit.
set -e
cd /opt/mural/src
git rev-parse HEAD > /opt/mural/prev_commit
git pull --ff-only
cd /opt/mural
docker image inspect mural-site-mural:latest >/dev/null 2>&1 && docker tag mural-site-mural:latest mural-site-mural:prev
docker compose up -d --build
docker image prune -f >/dev/null
echo "deploy ok"
