#!/usr/bin/env python3
"""
Backup do PINZ, no VPS (cópia de /opt/mural/backup/backup.py). Roda todo dia às 03:30 pelo cron e guarda 14 dias.
  python3 backup.py              -> backup diário em /opt/mural/backups/diario/AAAA-MM-DD_HHMM
  python3 backup.py ponto NOME   -> ponto de restauração permanente em /opt/mural/backups/pontos/NOME (nunca é apagado sozinho)

O que entra (tudo gzip em JSON, uma linha por registro):
  banco/<tabela>.jsonl.gz   todas as tabelas do schema public
  banco/auth_users.jsonl.gz usuários do login (id, e-mail, datas, provedores; SEM o hash da senha: a API não o entrega)
  arquivos/<bucket>/...     fotos e mídias (espelho: só baixa o que é novo)
  app/                      /opt/mural (código, docker-compose, .env) em .tar.gz
  MANIFESTO.json            o que foi guardado e quantos registros
O banco completo (com senhas) tem também o backup diário do próprio Supabase (plano Pro), restaurável no painel.
"""
import gzip, json, os, shutil, subprocess, sys, tarfile, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime

BASE = "/opt/mural"
ROOT = f"{BASE}/backups"
URL = "https://auth.pinz.digital"
MIRROR = f"{ROOT}/espelho-arquivos"  # espelho dos arquivos, compartilhado por todos os backups (evita baixar tudo de novo)
KEEP_DAYS = 14


def env(name):
    for line in open(f"{BASE}/.env", encoding="utf-8"):
        if line.startswith(name + "="):
            return line.strip().split("=", 1)[1]
    raise SystemExit(f"falta {name} em {BASE}/.env")


KEY = env("SUPABASE_SECRET_KEY")
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}


def call(path, method="GET", body=None, headers=None, raw=False):
    req = urllib.request.Request(URL + path, method=method, data=None if body is None else json.dumps(body).encode(), headers={**H, **(headers or {}), **({"Content-Type": "application/json"} if body is not None else {})})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
        return (data, r.headers) if raw else json.loads(data or b"null")


def tables():
    spec = call("/rest/v1/")
    return sorted(spec.get("definitions", {}).keys())


def dump_table(name, out):
    n, off = 0, 0
    with gzip.open(f"{out}/{name}.jsonl.gz", "wt", encoding="utf-8") as f:
        while True:
            try:
                rows = call(f"/rest/v1/{urllib.parse.quote(name)}?select=*", headers={"Range-Unit": "items", "Range": f"{off}-{off + 999}"})
            except urllib.error.HTTPError as e:
                if e.code in (404, 406):  # visão sem acesso: ignora
                    return None
                raise
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
            n += len(rows)
            if len(rows) < 1000:
                return n
            off += 1000


def dump_auth(out):
    n, page = 0, 1
    with gzip.open(f"{out}/auth_users.jsonl.gz", "wt", encoding="utf-8") as f:
        while True:
            d = call(f"/auth/v1/admin/users?page={page}&per_page=200")
            users = d.get("users", [])
            for u in users:
                f.write(json.dumps(u, ensure_ascii=False) + "\n")
            n += len(users)
            if len(users) < 200:
                return n
            page += 1


def list_objects(bucket, prefix=""):
    """Lista todos os arquivos do bucket (entra nas pastas)."""
    found, stack = [], [prefix]
    while stack:
        p = stack.pop()
        off = 0
        while True:
            items = call(f"/storage/v1/object/list/{bucket}", "POST", {"prefix": p, "limit": 1000, "offset": off})
            for it in items:
                path = f"{p}/{it['name']}" if p else it["name"]
                if it.get("id") is None:  # pasta
                    stack.append(path)
                else:
                    found.append((path, (it.get("metadata") or {}).get("size", 0)))
            if len(items) < 1000:
                break
            off += 1000
    return found


def mirror_files():
    stats = {}
    buckets = [b["id"] for b in call("/storage/v1/bucket")]
    for b in buckets:
        new = total = 0
        for path, size in list_objects(b):
            dest = f"{MIRROR}/{b}/{path}"
            total += 1
            if os.path.exists(dest) and os.path.getsize(dest) == size:
                continue
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            data, _ = call(f"/storage/v1/object/{b}/{urllib.parse.quote(path)}", raw=True)
            with open(dest, "wb") as f:
                f.write(data)
            new += 1
        stats[b] = {"arquivos": total, "novos": new}
    return stats


def main():
    ponto = len(sys.argv) > 1 and sys.argv[1] == "ponto"
    name = sys.argv[2] if ponto and len(sys.argv) > 2 else datetime.now().strftime("%Y-%m-%d_%H%M")
    out = f"{ROOT}/{'pontos' if ponto else 'diario'}/{name}"
    os.makedirs(f"{out}/banco", exist_ok=True)
    os.makedirs(f"{out}/app", exist_ok=True)
    manifest = {"criado_em": datetime.now().isoformat(timespec="seconds"), "tipo": "ponto" if ponto else "diario", "tabelas": {}}
    for t in tables():
        n = dump_table(t, f"{out}/banco")
        if n is not None:
            manifest["tabelas"][t] = n
    manifest["tabelas"]["auth_users"] = dump_auth(f"{out}/banco")
    manifest["arquivos"] = mirror_files()
    # pontos de restauração levam uma cópia própria dos arquivos (o espelho continua crescendo, os pontos ficam congelados)
    if ponto:
        subprocess.run(["rsync", "-a", f"{MIRROR}/", f"{out}/arquivos/"], check=True)
    with tarfile.open(f"{out}/app/mural-app.tar.gz", "w:gz") as tar:
        tar.add(BASE, arcname="mural", filter=lambda ti: None if ("/backups" in ti.name or "/node_modules" in ti.name or "/.next" in ti.name) else ti)
    try:
        manifest["commit_no_ar"] = open(f"{BASE}/prev_commit").read().strip()
    except OSError:
        pass
    json.dump(manifest, open(f"{out}/MANIFESTO.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    os.chmod(out, 0o700)
    if not ponto:  # rotação: apaga os diários com mais de KEEP_DAYS dias
        limit = time.time() - KEEP_DAYS * 86400
        for d in os.listdir(f"{ROOT}/diario"):
            p = f"{ROOT}/diario/{d}"
            if os.path.isdir(p) and os.path.getmtime(p) < limit:
                shutil.rmtree(p)
    print("backup ok:", out, f"({sum(v for v in manifest['tabelas'].values())} registros)")


if __name__ == "__main__":
    main()
