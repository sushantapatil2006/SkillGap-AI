"""Build in a cloud workspace whose Docker daemon cannot resolve its proxy.

Uses the existing HTTPS proxy and trusted CA without storing either in the image.
Ordinary developer machines can use docker compose build directly.
"""

import os
import socket
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

root = Path(__file__).resolve().parents[1]
environment = os.environ.copy()
environment.setdefault("DOCKER_CONFIG", "/tmp/skillgap-docker")
arguments = ["docker", "build", "--network", "host"]
proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
if proxy:
    hostname = urlsplit(proxy).hostname
    if not hostname:
        raise SystemExit("Existing proxy URL has no hostname")
    arguments.extend(["--add-host", hostname + ":" + socket.gethostbyname(hostname)])
for name in ("HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "https_proxy", "http_proxy", "no_proxy"):
    if name in os.environ:
        arguments.extend(["--build-arg", name])
certificate = os.environ.get("SSL_CERT_FILE")
if certificate:
    arguments.extend(["--secret", "id=proxy_ca,src=" + certificate])
arguments.extend(["-t", "skillgap-ai-api", "."])
raise SystemExit(subprocess.call(arguments, cwd=root, env=environment))
