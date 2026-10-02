# Pinz

Plataforma de murais pessoais: cada pessoa cria o seu mural, compartilha o link e só quem realmente a conhece
(respondendo a pergunta secreta) consegue desbloquear e deixar recados anônimos.

## Stack

- Next.js 15 (App Router, `output: standalone`) + TypeScript + Tailwind CSS v4
- Supabase (Auth, Postgres com RLS e funções RPC; as respostas secretas ficam só como hash)
- Deploy: container Node atrás do Traefik (Coolify) no VPS

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

As chaves públicas do Supabase ficam em `.env.production` (copie para `.env.local`).

## Domínio

O domínio do site fica em um único lugar: `SITE_HOST` em `src/lib/mural.ts`.
Ao trocar de domínio: atualizar `SITE_HOST`, o DNS (Cloudflare), os labels do Traefik no `docker-compose.yml` do VPS
e as URLs de redirecionamento do Supabase Auth.

## Marca

Logo oficial: `public/img/pinz-logo.webp` (original em `imagens/pinz-logo.png`). Ícone da aba: `src/app/icon.png`.
Imagem de compartilhamento: `public/og.jpg`. Imagem da lousa: `public/img/quadro-desktop.webp`.
