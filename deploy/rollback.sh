#!/bin/sh
# Cópia do /opt/mural/rollback.sh do VPS. Volta o site para a versão que estava no ar antes do último deploy, em segundos, sem recompilar.
#   Uso (PowerShell): $env:VPSPW='<senha>'; $env:CMD='/opt/mural/rollback.sh'; node deploy/remote.cjs
# Depois, no repositório, desfaça o commit ruim (git revert <commit> e git push); senão o próximo deploy recoloca o código com problema.
# Atenção: migrações do banco NÃO voltam por aqui.
set -e
docker image inspect mural-site-mural:prev >/dev/null 2>&1 || { echo "sem imagem anterior guardada"; exit 1; }
docker tag mural-site-mural:prev mural-site-mural:latest
cd /opt/mural
docker compose up -d --no-build site-mural
echo "rollback ok. Commit que estava no ar antes do último deploy: $(cat /opt/mural/prev_commit)"
