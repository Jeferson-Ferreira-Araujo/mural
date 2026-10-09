# Pinz

Murais de momentos compartilhados. Cada pessoa cria o seu mural, compartilha o link e quem a conhece deixa recados:
post-its, cartas, listas, fotos, desenhos, vídeos, vozes e lugares, presos numa lousa de cortiça.

Site: <https://pinz.digital>

## O que o Pinz faz

**Murais**
- Lousa de 28 espaços (7 × 4), em vários tipos de fundo (cortiça, família, filmes, música, pets, viagens e outros da loja).
- Mural pessoal e mural compartilhado entre duas pessoas PINZ+ (com senha).
- Público ou privado: a pergunta e a resposta de segurança valem para o perfil inteiro. Três erros seguidos bloqueiam por 30 minutos.
- Zoom e arrastar no celular e no desktop; o dono move os pins entre os espaços.

**Pins**
- Formatos: post-it, texto (carta ou caderno), lista marcável, foto, desenho, vídeo (arquivo ou YouTube) e local com mapa. Voz e música existem e podem ser ligadas pelo painel.
- Personalização: letra manuscrita, cor e posição da tachinha ou da fita.
- Aprovação do dono antes de aparecer, pin em segredo (borrado), denúncia, e exclusão pelo autor a qualquer momento.
- Compartilhar o pin em imagem pronta para redes sociais.
- Bottons decorativos (tamanho, inclinação e posição), comprados na loja com créditos.

**Perfil e comunidade**
- Seguir pessoas, lista de visitantes e a opção "Aparecer como visitante".
- Resumo do perfil: seguidores, visualizações, PINZ colocados, compartilhar, pedir mural compartilhado e denunciar.
- Notificações em tempo real: pin novo, pin aprovado, novo seguidor, reações e itens de lista.
- Excluir a conta com 30 dias para se arrepender.

**Planos e loja**
- FREE: 1 mural, 15 pins, formatos básicos. PINZ+: até 10 murais, 28 pins por mural, todos os formatos e murais compartilhados.
- Loja de bottons e murais com créditos. Pagamento pelo Mercado Pago (hoje em modo de teste).

**Segurança e moderação**
- Fotos, desenhos e vídeos passam por um detector de nudez que roda no próprio servidor, sem serviço externo.
- Banco com RLS e funções com permissão mínima, limites de uso, cabeçalhos de segurança e testes automáticos do banco.
- Painel `/admin` com usuários, pagamentos, denúncias, recursos ligáveis e analytics.

## Stack

- **Site:** Next.js 15 (App Router, `output: standalone`), TypeScript e Tailwind CSS v4. Fonte da interface: Plus Jakarta Sans.
- **Banco e login:** Supabase (Postgres com RLS e funções RPC, Auth com e-mail, Google e Facebook, Realtime, Storage e `pg_cron`).
- **Pagamentos:** Mercado Pago (assinatura PINZ+ e pacotes de créditos), com confirmação por webhook.
- **Detector de imagens:** serviço Python em `nsfw-service/` (NudeNet e um classificador ONNX; ffmpeg para extrair quadros de vídeo).
- **Hospedagem:** containers Docker no VPS, atrás do Traefik, com o DNS na Cloudflare.

## Estrutura

```
src/app/                 páginas e rotas de API (App Router)
src/app/api/             pagamentos, verificação de imagens, exclusão de conta, limpeza de arquivos
src/components/          telas e componentes (mural, pins, loja, conta, admin)
src/lib/                 regras e acesso ao Supabase
nsfw-service/            detector de imagens (Python)
deploy/                  docker-compose do servidor e script de publicação
tests/db/critical.sql    testes dos fluxos críticos do banco
public/                  imagens do mural, logo e prévia de compartilhamento
```

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

As chaves públicas do Supabase ficam em `.env.production` (copie para `.env.local`).
Os recursos que dependem de chaves do servidor (pagamentos, verificação de imagens, mapas, rotinas) precisam das variáveis abaixo.

## Variáveis de ambiente

Públicas (podem ir para o navegador):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_OAUTH_PROVIDERS` (por exemplo `google,facebook`)
- `NEXT_PUBLIC_PAYMENTS_ENABLED`

Só no servidor (arquivo `.env` fora do Git, nunca versionado):

- `SUPABASE_SECRET_KEY`
- `AVATAR_SIGNING_SECRET` (assina a aprovação de imagens)
- `MP_ACCESS_TOKEN` (Mercado Pago)
- `GOOGLE_MAPS_API_KEY`
- `CRON_SECRET` (protege as rotinas agendadas)
- `NSFW_URL` (endereço interno do detector de imagens)

## Banco de dados

O esquema vive no Supabase (migrações aplicadas pelo painel). As regras de acesso ficam em funções `SECURITY DEFINER`
e em políticas RLS: tabelas internas não têm acesso direto, e o navegador só chama funções (RPC) autorizadas.

Para conferir os fluxos críticos (privacidade, bloqueio por tentativas, pagamentos, permissões), cole
`tests/db/critical.sql` no editor SQL do Supabase. Nada fica gravado: o relatório aparece na mensagem final.
Procure por `FALHA`; se não houver, está tudo certo.

## Publicação

O servidor roda `git pull` neste repositório e reconstrói os containers (`site-mural` e `nsfw-check`).
O script `deploy/remote.cjs` faz isso por SSH; a senha do servidor vem só da variável de ambiente `VPSPW`
e nunca é gravada em arquivo.

Rotinas agendadas no servidor (chamam rotas protegidas por `CRON_SECRET`):

- diária: apaga de vez as contas desativadas há mais de 30 dias (`/api/account/purge`);
- a cada 10 minutos: apaga do armazenamento os arquivos de pins que já não existem (`/api/media/sweep`).

## Domínio

O domínio do site fica em um único lugar: `SITE_HOST` em `src/lib/mural.ts`.
Ao trocar de domínio: atualizar `SITE_HOST`, o DNS (Cloudflare), os labels do Traefik no `docker-compose.yml` do servidor
e as URLs de redirecionamento do Supabase Auth.

## Marca

Logo oficial: `public/img/pinz-logo.webp` (original em `imagens/pinz-logo.png`). Ícone da aba: `src/app/icon.png`.
Imagem de compartilhamento: `public/og.jpg`. Imagem da lousa: `public/img/quadro-desktop.webp`.

## Pendências conhecidas

- Mercado Pago em produção e teste de ponta a ponta da assinatura PINZ+.
- Login com Apple (exige conta de desenvolvedor paga).
- Notificações no celular com o site fechado (push ou e-mail).
- CSP em modo de observação e atualização do Next.js.
