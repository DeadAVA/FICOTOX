"""Script temporal para crear carpetas backups/database y backups/code en OneDrive via Graph."""
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def read_dotenv(path: Path) -> dict:
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        values[k.strip()] = v.strip().strip('"').strip("'")
    return values


dotenv = read_dotenv(Path(__file__).parent.parent / "backend" / ".env")


def cfg(name, default=""):
    return os.environ.get(name) or dotenv.get(name) or default


tenant_id = cfg("FICOTOX_GRAPH_TENANT_ID") or cfg("MICROSOFT_TENANT_ID")
client_id = cfg("FICOTOX_GRAPH_CLIENT_ID") or cfg("MICROSOFT_CLIENT_ID")
client_secret = (
    cfg("FICOTOX_GRAPH_CLIENT_SECRET")
    or cfg("MICROSOFT_CLIENT_SECRET")
    or cfg("MICROSOFT_SECRET_KEY")
    or cfg("MMICROSOFT_SECRET_KEY")
)

print(f"tenant={tenant_id}")
print(f"client={client_id}")
print(f"secret={'***' if client_secret else 'MISSING'}")

token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
data = urlencode(
    {
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials",
    }
).encode()
req = Request(token_url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
try:
    with urlopen(req, timeout=30) as r:
        payload = json.loads(r.read())
    token = payload.get("access_token")
    if not token:
        raise RuntimeError(f"Sin access_token: {payload}")
    print("Token OK")
except HTTPError as e:
    print("ERROR token:", e.read().decode())
    raise SystemExit(1)

drive_id = cfg("FICOTOX_GRAPH_DRIVE_ID")
base = f"https://graph.microsoft.com/v1.0/drives/{drive_id}"


def item_exists(path):
    url = f"{base}/root:/{path}"
    req = Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urlopen(req, timeout=30):
            return True
    except HTTPError as e:
        if e.code == 404:
            return False
        raise


def make_folder(parent_path, name):
    if parent_path:
        url = f"{base}/root:/{parent_path}:/children"
    else:
        url = f"{base}/root/children"
    body = json.dumps({"name": name, "folder": {}, "@microsoft.graph.conflictBehavior": "fail"}).encode()
    req = Request(
        url, data=body, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, method="POST"
    )
    try:
        with urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except HTTPError as e:
        if e.code == 409:
            print(f"  Ya existe: {parent_path}/{name}")
            return {}
        print("ERROR:", e.read().decode())
        raise


for path, parent, name in [
    ("backups", "", "backups"),
    ("backups/database", "backups", "database"),
    ("backups/code", "backups", "code"),
]:
    if item_exists(path):
        print(f"OK (ya existe): {path}")
    else:
        make_folder(parent, name)
        print(f"Creada: {path}")

print("Listo.")
