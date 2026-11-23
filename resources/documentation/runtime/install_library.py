"""PT-BR: Instala orientações e MCP local sem depender do projeto original.

EN: Install guidance and a local MCP independently of the original project.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tomllib
import uuid
from pathlib import Path


def _bytes(value):
    """PT-BR: Codifica JSON legível. EN: Encode readable JSON."""
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def _safe(root, relative):
    """PT-BR: Valida cada ancestral antes de escrever. EN: Validate every ancestor before writing."""
    relative = relative.as_posix() if isinstance(relative, Path) else str(relative)
    path = root / relative
    if Path(relative).is_absolute() or ".." in Path(relative).parts or "\\" in relative or ":" in relative or not path.resolve().is_relative_to(root):
        raise ValueError("Install path escapes the explicit workspace.")
    cursor = path
    while cursor != cursor.parent:
        if cursor.exists() and (cursor.is_symlink() or getattr(cursor.lstat(), "st_file_attributes", 0) & 0x400):
            raise ValueError("Linked install paths are not permitted.")
        if cursor == root:
            break
        cursor = cursor.parent
    return path


def _bundle(source):
    """PT-BR: Verifica todos os recursos distribuídos. EN: Verify every distributed resource."""
    bundle_path = _safe(source, "bundle.json")
    metadata = json.loads(bundle_path.read_text(encoding="utf-8"))
    if metadata.get("format") != "software-documentation-library-v1" or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", metadata.get("slug", "")):
        raise ValueError("Unrecognized library documentation bundle.")
    required = {"corpus.json", "library_mcp.py", "install.py", "guidance/use.md", "guidance/develop.md"}
    if not required <= set(metadata.get("files", {})):
        raise ValueError("Library documentation bundle is missing required resources.")
    files = {"bundle.json": bundle_path.read_bytes()}
    for relative, digest in metadata["files"].items():
        file = _safe(source, relative)
        content = file.read_bytes()
        if hashlib.sha256(content).hexdigest() != digest:
            raise ValueError("Bundle integrity failure: " + relative)
        files[relative] = content
    return metadata, files


def install(source, workspace, client, dry_run=False):
    """PT-BR: Instala atomicamente, preservando configurações e arquivos alheios.

    EN: Install transactionally, preserving unrelated configuration and files.
    """
    source = Path(source).resolve()
    supplied = Path(workspace)
    if not supplied.is_absolute() or not supplied.is_dir() or client not in ("codex", "claude", "bob"):
        raise ValueError("Select an existing absolute workspace and codex, claude or bob.")
    root = supplied.resolve()
    metadata, bundle = _bundle(source)
    slug = metadata["slug"]
    destination = Path(".custom-agents/libraries") / slug
    package = _safe(root, destination)
    old = {}
    previous_state = {}
    if package.exists():
        previous, old = _bundle(package)
        if previous["slug"] != slug:
            raise ValueError("An unrelated library owns this directory.")
        registry = package / "installed.json"
        previous_state = json.loads(registry.read_text(encoding="utf-8")) if registry.exists() else {}
        actual = {p.relative_to(package).as_posix() for p in package.rglob("*") if p.is_file()}
        if actual - set(old) - {"installed.json"}:
            raise ValueError("Unmanaged files exist in the installed library directory.")
    writes = {destination / relative: content for relative, content in bundle.items()}
    removed = [destination / relative for relative in set(old) - set(bundle)]
    tool_name = "docs_" + slug.replace("-", "_")
    settings = {"command": "python",
                "args": [str(package / "library_mcp.py"), "--workspace", str(root), "--data", str(package / "corpus.json")]}
    if client == "codex":
        config_relative = Path(".codex/config.toml")
        config = _safe(root, config_relative)
        text = config.read_text(encoding="utf-8-sig") if config.exists() else ""
        parsed = tomllib.loads(text)
        existing = parsed.get("mcp_servers", {}).get(tool_name)
        if existing is not None and existing != settings:
            raise ValueError("Conflicting Codex MCP entry: " + tool_name)
        if existing is None:
            text = text.rstrip() + f'\n\n[mcp_servers.{json.dumps(tool_name)}]\ncommand = {json.dumps(settings["command"])}\nargs = {json.dumps(settings["args"])}\n'
        writes[config_relative] = text.encode("utf-8")
        skill_root = Path(".agents/skills")
    else:
        config_relative = Path(".mcp.json" if client == "claude" else ".bob/mcp.json")
        config = _safe(root, config_relative)
        parsed = json.loads(config.read_text(encoding="utf-8-sig")) if config.exists() else {}
        servers = parsed.setdefault("mcpServers", {})
        if tool_name in servers and servers[tool_name] != settings:
            raise ValueError("Conflicting MCP entry: " + tool_name)
        servers[tool_name] = settings
        writes[config_relative] = _bytes(parsed)
        skill_root = Path(".claude/skills" if client == "claude" else ".bob/skills")
    skill_relative = skill_root / (slug + "-docs") / "SKILL.md"
    skill = _safe(root, skill_relative)
    relative_use = os.path.relpath(package / "guidance/use.md", skill.parent).replace("\\", "/")
    relative_develop = os.path.relpath(package / "guidance/develop.md", skill.parent).replace("\\", "/")
    content = f'''---
name: {slug}-docs
description: "Consultar a documentação instalada de {slug} para usar ou modificar sua integração. Read installed {slug} documentation to use or modify its integration."
---

<!-- software-documentation:{slug} -->

# {metadata['name']}

PT-BR: Para instalar ou usar a biblioteca, leia [uso]({relative_use}). Para adaptar ou modificar, leia [desenvolvimento]({relative_develop}). Consulte o MCP `{tool_name}` com o workspace absoluto deste projeto; ele oferece somente leitura e não autoriza alterar o pacote ou o projeto original.

EN: For installation and usage, read [usage]({relative_use}). For adaptation or modification, read [development]({relative_develop}). Query the `{tool_name}` MCP with this project's absolute workspace; it is read-only and does not authorize changes to the package or original project.
'''.encode("utf-8")
    previous_hash = previous_state.get("skills", {}).get(client)
    if skill.exists() and hashlib.sha256(skill.read_bytes()).hexdigest() != previous_hash:
        raise ValueError("Unmanaged or modified skill would be overwritten: " + str(skill_relative))
    writes[skill_relative] = content
    state = {**previous_state, "format": "installed-library-documentation-v1", "slug": slug,
             "version": metadata.get("version"), "skills": {**previous_state.get("skills", {}), client: hashlib.sha256(content).hexdigest()}}
    writes[destination / "installed.json"] = _bytes(state)
    for relative in [*writes, *removed]:
        _safe(root, relative)
    result = {"status": "planned" if dry_run else "installed", "client": client,
              "workspace": str(root), "package": str(package), "skill": str(skill_relative),
              "mcp": tool_name, "files": len(writes), "hostActivation": "Reload the client; native trust remains client-owned."}
    if dry_run:
        return result
    # Keep a durable configuration backup, as well as the in-memory rollback journal.
    if config.exists() and writes[config_relative] != config.read_bytes():
        backup = Path(".custom-agents/libraries-backups") / slug / uuid.uuid4().hex / config_relative
        writes[backup] = config.read_bytes()
    journal = {}
    created = set()
    try:
        for relative in [*writes, *removed]:
            path = _safe(root, relative)
            journal[path] = path.read_bytes() if path.exists() else None
            parent = path.parent
            while not parent.exists():
                created.add(parent)
                parent = parent.parent
            path.parent.mkdir(parents=True, exist_ok=True)
            if relative in writes:
                temporary = path.with_name(path.name + ".tmp-" + uuid.uuid4().hex)
                try:
                    temporary.write_bytes(writes[relative])
                    temporary.replace(path)
                finally:
                    temporary.unlink(missing_ok=True)
            else:
                path.unlink()
    except BaseException:
        for path, previous in reversed(list(journal.items())):
            if previous is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(previous)
        for directory in sorted(created, key=lambda p: len(p.parts), reverse=True):
            directory.rmdir()
        raise
    return result


def main():
    """PT-BR: Seleciona explicitamente o consumidor. EN: Explicitly select the consumer."""
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--client", choices=["codex", "claude", "bob"], required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    print(json.dumps(install(Path(__file__).resolve().parent, args.workspace, args.client, args.dry_run), ensure_ascii=False))


if __name__ == "__main__":
    main()
