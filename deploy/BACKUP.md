# Backups do PINZ: o que existe e como recorrer

Quatro camadas. Use a mais simples que resolve o problema.

| Problema | Onde recorrer |
|---|---|
| Deploy novo quebrou o site | **Rollback** (segundos): `$env:VPSPW='<senha>'; $env:CMD='/opt/mural/rollback.sh'; node deploy/remote.cjs`, depois `git revert <commit>` e `git push` |
| Voltar o site inteiro ao ponto de hoje | **Imagem do ponto**: `docker tag mural-site-mural:ponto-2026-10-28 mural-site-mural:latest && cd /opt/mural && docker compose up -d --no-build site-mural` (no VPS) |
| Código perdido ou mexido | **Git**: tag `ponto-2026-10-28` no GitHub (`git checkout ponto-2026-10-28`) |
| Apaguei dados (um usuário, mural, pins…) | **Backup próprio** do VPS: restaura só as tabelas pedidas (abaixo) |
| Usuário excluído pelo painel admin | **Admin → aba Excluídos → Restaurar** (vale por 7 dias; volta com murais, pins e arquivos; a pessoa entra por "esqueci minha senha") |
| Banco inteiro perdido/corrompido (com senhas) | **Supabase → Database → Backups** (plano Pro: backup diário dos últimos 7 dias, restauração em um clique) |

## Backup próprio (VPS)

- **Diário às 03:30** (cron), guarda 14 dias em `/opt/mural/backups/diario/AAAA-MM-DD_HHMM`.
- **Pontos de restauração** (nunca apagados sozinhos) em `/opt/mural/backups/pontos/NOME`. Para criar um agora:
  `python3 /opt/mural/backup/backup.py ponto 2026-11-15`
- Cada pasta tem: `banco/` (todas as tabelas + usuários do login, em gzip), `arquivos/` (fotos e mídias; só nos pontos), `app/mural-app.tar.gz` (código, docker-compose e `.env`), `MANIFESTO.json`.
- Os arquivos do dia a dia ficam num espelho (`/opt/mural/backups/espelho-arquivos`) que só baixa o que é novo.
- Log: `/var/log/pinz-backup.log`.

### Restaurar tabelas

```
python3 /opt/mural/backup/restore.py /opt/mural/backups/pontos/2026-10-28 --lista
python3 /opt/mural/backup/restore.py /opt/mural/backups/pontos/2026-10-28 profiles murals messages
python3 /opt/mural/backup/restore.py /opt/mural/backups/pontos/2026-10-28 --arquivos
```

O que existe é sobrescrito e o que falta volta (pela chave primária). Não recria logins: a API não entrega o hash da senha. Para isso, use o backup do Supabase.

## Cópia fora do VPS (Google Drive)

Todo dia, logo após o backup, o `/opt/mural/backup/offsite.sh` envia a cópia **criptografada** ao Drive de `pinz.projeto@gmail.com` (pasta `PINZ-backups`, 14 dias de diários + os pontos de restauração). Nomes e conteúdo aparecem embaralhados no Drive.
- Configuração do rclone: `/root/.config/rclone/rclone.conf` (remotos `pinzdrive` e `pinzcrypt`). Credencial OAuth própria, app "PINZ Backup" em produção no Google Cloud (conta pinz.projeto).
- **Guarde as duas chaves de criptografia (password e password2 do `pinzcrypt`) fora do VPS** (gerenciador de senhas): sem elas, o que está no Drive não abre. Para vê-las no VPS: `rclone config show pinzcrypt` (aparecem ofuscadas; para o valor original use `rclone reveal <valor>`).
- Baixar um backup do Drive para o VPS: `rclone copy pinzcrypt:pontos/2026-10-28 /opt/mural/backups/pontos/2026-10-28` e depois restaurar com `restore.py`.
- Se o envio parar com erro de autorização (acesso revogado), refaça o login: `rclone authorize drive <client_id> <client_secret>` e atualize o token do `pinzdrive`.

## Limites (leia)

- Se o VPS morrer, o backup do Drive (criptografado) continua; sem as chaves de criptografia, porém, ele não abre.
- Migrações do banco não estão no Git; o esquema está nos backups do Supabase.
- Backup completo com **recuperação a qualquer minuto** (PITR) é um complemento pago do Supabase; não está ligado.
