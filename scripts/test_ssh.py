from __future__ import annotations

import io
import json
import socket
import sys
from pathlib import Path

import paramiko


def load_config(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def parse_host(config: dict) -> tuple[str, int, str]:
    ssh = config["ssh"]
    host_value = str(ssh.get("host", "")).strip()
    username = str(ssh.get("username", "")).strip()
    port = int(ssh.get("port", 22))

    if "@" in host_value:
      possible_user, possible_host = host_value.split("@", 1)
      username = possible_user or username
      host_value = possible_host

    if not username or not host_value:
        raise ValueError("ssh.username yoki ssh.host to'ldirilmagan")

    return host_value, port, username


def load_private_key(private_key: str, passphrase: str):
    buffer = io.StringIO(private_key)
    password = passphrase or None

    key_loaders = (
        paramiko.RSAKey.from_private_key,
        paramiko.Ed25519Key.from_private_key,
        paramiko.ECDSAKey.from_private_key,
    )

    for loader in key_loaders:
        buffer.seek(0)
        try:
            return loader(buffer, password=password)
        except paramiko.SSHException:
            continue

    raise paramiko.SSHException("Private key o'qilmadi")


def main() -> int:
    config_path = sys.argv[1] if len(sys.argv) > 1 else "ssh-access.local.json"
    command = sys.argv[2] if len(sys.argv) > 2 else "echo CONNECTED && whoami && hostname && pwd && uname -a"

    config = load_config(config_path)
    host, port, username = parse_host(config)
    private_key = str(config["ssh"].get("privateKey", ""))
    passphrase = str(config["ssh"].get("passphrase", ""))

    if not private_key.strip():
        raise ValueError("ssh.privateKey bo'sh")

    pkey = load_private_key(private_key, passphrase)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(
            hostname=host,
            port=port,
            username=username,
            pkey=pkey,
            timeout=15,
            banner_timeout=15,
            auth_timeout=15,
            look_for_keys=False,
            allow_agent=False,
        )
        stdin, stdout, stderr = client.exec_command(command, timeout=30)
        output = stdout.read().decode("utf-8", errors="replace")
        error = stderr.read().decode("utf-8", errors="replace")
        exit_code = stdout.channel.recv_exit_status()
        if output:
            sys.stdout.buffer.write(output.encode("utf-8", errors="replace"))
        if error:
            sys.stderr.buffer.write(error.encode("utf-8", errors="replace"))
        return exit_code
    except (paramiko.SSHException, socket.error, TimeoutError) as exc:
        print(f"SSH xatosi: {exc}", file=sys.stderr)
        return 1
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
