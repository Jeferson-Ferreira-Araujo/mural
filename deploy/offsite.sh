#!/bin/sh
# Cópia de /opt/mural/backup/offsite.sh (VPS). Roda todo dia às 03:30 pelo cron: faz o backup e envia, CRIPTOGRAFADO, ao Google Drive (pinz.projeto@gmail.com).
#   Remotos do rclone (/root/.config/rclone/rclone.conf): pinzdrive (Drive) e pinzcrypt (criptografia por cima, pasta PINZ-backups).
#   No Drive os nomes e o conteúdo aparecem embaralhados; só o rclone com as chaves de criptografia lê.
# Guarda 14 dias dos diários; os pontos de restauração (pontos/) ficam para sempre.
set -e
RC="--retries 8 --low-level-retries 30 --retries-sleep 20s --tpslimit 4"
python3 /opt/mural/backup/backup.py
DIA=$(ls -1t /opt/mural/backups/diario | head -1)
rclone copy "/opt/mural/backups/diario/$DIA" "pinzcrypt:diario/$DIA" --transfers 2 $RC
rclone copy /opt/mural/backups/pontos pinzcrypt:pontos --transfers 2 $RC
rclone delete pinzcrypt:diario --min-age 14d --rmdirs $RC 2>/dev/null || true
echo "$(date -Iseconds) enviado ao Drive: $DIA"
