from __future__ import annotations

import io
import json
import posixpath
import stat
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


def ensure_remote_dir(sftp: paramiko.SFTPClient, remote_dir: str) -> None:
    parts = [part for part in remote_dir.split("/") if part]
    current = "/"
    for part in parts:
        current = posixpath.join(current, part)
        try:
            attrs = sftp.stat(current)
            if not stat.S_ISDIR(attrs.st_mode):
                raise RuntimeError(f"{current} katalog emas")
        except FileNotFoundError:
            sftp.mkdir(current)


def upload_path(sftp: paramiko.SFTPClient, local_path: Path, remote_path: str) -> None:
    if local_path.is_dir():
        ensure_remote_dir(sftp, remote_path)
        for child in sorted(local_path.iterdir()):
            upload_path(sftp, child, posixpath.join(remote_path, child.name))
        return

    ensure_remote_dir(sftp, posixpath.dirname(remote_path))
    sftp.put(str(local_path), remote_path)


def main() -> int:
    if len(sys.argv) < 3:
        print("Foydalanish: py scripts/upload_dir.py <local_path> <remote_path> [config_path]", file=sys.stderr)
        return 1

    local_path = Path(sys.argv[1]).resolve()
    remote_path = sys.argv[2]
    config_path = sys.argv[3] if len(sys.argv) > 3 else "ssh-access.local.json"

    if not local_path.exists():
        print(f"Local path topilmadi: {local_path}", file=sys.stderr)
        return 1

    config = load_config(config_path)
    host, port, username = parse_host(config)
    private_key = str(config["ssh"].get("privateKey", ""))
    passphrase = str(config["ssh"].get("passphrase", ""))
    pkey = load_private_key(private_key, passphrase)

    transport = paramiko.Transport((host, port))
    transport.connect(username=username, pkey=pkey)

    try:
        sftp = paramiko.SFTPClient.from_transport(transport)
        upload_path(sftp, local_path, remote_path)
    finally:
        transport.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
