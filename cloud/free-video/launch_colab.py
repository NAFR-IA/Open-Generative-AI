"""Launch the free worker plus a temporary Cloudflare HTTPS tunnel in Colab."""

import os
import re
import secrets
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CLOUDFLARED = Path("/content/cloudflared")
TOKEN = secrets.token_urlsafe(24)
os.environ["OGA_SESSION_TOKEN"] = TOKEN

if not CLOUDFLARED.exists():
    urllib.request.urlretrieve(
        "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64",
        CLOUDFLARED,
    )
    CLOUDFLARED.chmod(0o755)

worker = subprocess.Popen([sys.executable, str(ROOT / "worker.py")], env=os.environ.copy())
time.sleep(4)
if worker.poll() is not None:
    raise RuntimeError("The video worker failed to start")

tunnel = subprocess.Popen(
    [str(CLOUDFLARED), "tunnel", "--url", "http://127.0.0.1:7866", "--no-autoupdate"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
)

url = None
deadline = time.time() + 60
while time.time() < deadline:
    line = tunnel.stdout.readline()
    if line:
        print(line.rstrip(), flush=True)
        match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
        if match:
            url = match.group(0)
            break
    elif tunnel.poll() is not None:
        break

if not url:
    worker.terminate()
    raise RuntimeError("Cloudflare did not provide a tunnel URL")

print("\n" + "=" * 72)
print("COPIA ESTOS DOS DATOS EN OGA > AJUSTES > MODELOS LOCALES")
print(f"URL:   {url}/mcp")
print(f"TOKEN: {TOKEN}")
print("Mant�n esta celda ejecut�ndose mientras generas v�deo.")
print("=" * 72 + "\n", flush=True)

try:
    tunnel.wait()
finally:
    worker.terminate()

