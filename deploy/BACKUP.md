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

## Limites (leia)

- O backup próprio fica no mesmo VPS: se o VPS morrer, ele morre junto. O Supabase (banco) e o GitHub (código) continuam existindo. Para proteção total, copie periodicamente a pasta de pontos para outro lugar.
- Migrações do banco não estão no Git; o esquema está nos backups do Supabase.
- Backup completo com **recuperação a qualquer minuto** (PITR) é um complemento pago do Supabase; não está ligado.
