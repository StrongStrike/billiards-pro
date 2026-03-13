from __future__ import annotations

import io
import json
import shlex
import socket
import sys
import tarfile
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

    for loader in (
        paramiko.RSAKey.from_private_key,
        paramiko.Ed25519Key.from_private_key,
        paramiko.ECDSAKey.from_private_key,
    ):
        buffer.seek(0)
        try:
            return loader(buffer, password=password)
        except paramiko.SSHException:
            continue

    raise paramiko.SSHException("Private key o'qilmadi")


def build_archive(source: Path) -> bytes:
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode="w:gz") as archive:
        if source.is_dir():
            for child in sorted(source.rglob("*")):
                archive.add(child, arcname=child.relative_to(source))
        else:
            archive.add(source, arcname=source.name)
    stream.seek(0)
    return stream.read()


def main() -> int:
    if len(sys.argv) < 3:
        print("Foydalanish: py scripts/stream_upload.py <local_path> <remote_dir> [config_path]", file=sys.stderr)
        return 1

    local_path = Path(sys.argv[1]).resolve()
    remote_dir = sys.argv[2]
    config_path = sys.argv[3] if len(sys.argv) > 3 else "ssh-access.local.json"

    if not local_path.exists():
        print(f"Local path topilmadi: {local_path}", file=sys.stderr)
        return 1

    config = load_config(config_path)
    host, port, username = parse_host(config)
    pkey = load_private_key(str(config["ssh"].get("privateKey", "")), str(config["ssh"].get("passphrase", "")))

    payload = build_archive(local_path)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(
            hostname=host,
            port=port,
            username=username,
            pkey=pkey,
            timeout=20,
            banner_timeout=20,
            auth_timeout=20,
            look_for_keys=False,
            allow_agent=False,
        )

        remote_command = f"mkdir -p {shlex.quote(remote_dir)} && tar -xzf - -C {shlex.quote(remote_dir)}"
        stdin, stdout, stderr = client.exec_command(remote_command, timeout=120)
        stdin.channel.sendall(payload)
        stdin.channel.shutdown_write()

        output = stdout.read().decode("utf-8", errors="replace")
        error = stderr.read().decode("utf-8", errors="replace")
        exit_code = stdout.channel.recv_exit_status()

        if output:
            sys.stdout.write(output)
        if error:
            sys.stderr.write(error)
        return exit_code
    except (paramiko.SSHException, socket.error, TimeoutError) as exc:
        print(f"SSH upload xatosi: {exc}", file=sys.stderr)
        return 1
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
