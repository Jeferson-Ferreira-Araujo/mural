#!/usr/bin/env python3
"""
Restaura tabelas a partir de um backup (cópia de /opt/mural/backup/restore.py). Serve para recuperar dados apagados por engano.
  python3 restore.py <pasta-do-backup> --lista                  mostra as tabelas e quantos registros cada uma tem
  python3 restore.py <pasta-do-backup> tabela1 tabela2 ...      devolve esses registros (upsert pela chave primária: o que existe é sobrescrito, o que falta volta)
  python3 restore.py <pasta-do-backup> --arquivos [bucket]      copia os arquivos do backup de volta para o armazenamento
Exemplo:  python3 /opt/mural/backup/restore.py /opt/mural/backups/pontos/2026-10-28 profiles murals messages
Não recria logins (auth_users não tem senha): para um desastre completo use o backup diário do Supabase (painel > Database > Backups).
"""
import gzip, json, os, sys, urllib.parse, urllib.request

BASE = "/opt/mural"
URL = "https://auth.pinz.digital"


def env(name):
    for line in open(f"{BASE}/.env", encoding="utf-8"):
        if line.startswith(name + "="):
            return line.strip().split("=", 1)[1]
    raise SystemExit(f"falta {name}")


KEY = env("SUPABASE_SECRET_KEY")
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}


def post(path, data, headers):
    req = urllib.request.Request(URL + path, method="POST", data=data, headers={**H, **headers})
    return urllib.request.urlopen(req, timeout=120).read()


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    folder, args = sys.argv[1], sys.argv[2:]
    if args[0] == "--lista":
        for k, v in json.load(open(f"{folder}/MANIFESTO.json"))["tabelas"].items():
            print(f"{k}: {v}")
        return
    if args[0] == "--arquivos":
        only = args[1] if len(args) > 1 else None
        root = f"{folder}/arquivos"
        for b in os.listdir(root):
            if only and b != only:
                continue
            for dp, _, fs in os.walk(f"{root}/{b}"):
                for fn in fs:
                    full = os.path.join(dp, fn)
                    key = os.path.relpath(full, f"{root}/{b}").replace(os.sep, "/")
                    try:
                        post(f"/storage/v1/object/{b}/{urllib.parse.quote(key)}", open(full, "rb").read(), {"x-upsert": "true", "Content-Type": "application/octet-stream"})
                    except Exception as e:  # noqa: BLE001
                        print("falhou", b, key, e)
        print("arquivos devolvidos")
        return
    for t in args:
        rows = [json.loads(l) for l in gzip.open(f"{folder}/banco/{t}.jsonl.gz", "rt", encoding="utf-8")]
        for i in range(0, len(rows), 500):
            post(f"/rest/v1/{urllib.parse.quote(t)}", json.dumps(rows[i : i + 500]).encode(), {"Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"})
        print(f"{t}: {len(rows)} registros devolvidos")


if __name__ == "__main__":
    main()
