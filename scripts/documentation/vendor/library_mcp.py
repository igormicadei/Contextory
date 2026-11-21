"""PT-BR: Consulta somente leitura da documentação instalada no consumidor.

EN: Read-only queries over documentation copied into a consumer project.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def _safe(root, path):
    """PT-BR: Recusa caminhos externos e links. EN: Refuse external paths and links."""
    resolved = Path(path).resolve()
    if not resolved.is_relative_to(root):
        raise ValueError("Documentation data must be inside the consumer workspace.")
    cursor = Path(path)
    while cursor != cursor.parent:
        if cursor.exists() and (cursor.is_symlink() or getattr(cursor.lstat(), "st_file_attributes", 0) & 0x400):
            raise ValueError("Linked paths are not permitted.")
        if cursor == root:
            break
        cursor = cursor.parent
    return resolved


def query(workspace, data, name, arguments):
    """PT-BR: Consulta páginas ou símbolos sem executar código do projeto.

    EN: Query pages or symbols without executing project code.
    """
    if not isinstance(arguments, dict):
        raise ValueError("Tool arguments must be an object.")
    supplied = Path(arguments.get("workspace", ""))
    if not supplied.is_absolute() or supplied.resolve() != workspace:
        raise ValueError("workspace must match the explicitly installed consumer workspace.")
    if name not in ("docs_query", "docs_symbols"):
        raise ValueError("Unknown read-only documentation tool.")
    allowed = {"workspace", "query", "locale", "offset", "limit"}
    if set(arguments) - allowed:
        raise ValueError("Unknown query arguments.")
    locale = arguments.get("locale", "en")
    if locale not in ("pt-BR", "en"):
        raise ValueError("locale must be pt-BR or en.")
    offset, limit = arguments.get("offset", 0), arguments.get("limit", 10)
    if type(offset) is not int or offset < 0 or type(limit) is not int or not 1 <= limit <= 100:
        raise ValueError("Use offset >= 0 and limit between 1 and 100.")
    term = arguments.get("query", "")
    if not isinstance(term, str) or len(term) > 1000:
        raise ValueError("query must be a string of at most 1000 characters.")
    corpus = json.loads(_safe(workspace, data).read_text(encoding="utf-8"))
    values = corpus.get("pages", []) if name == "docs_query" else corpus.get("symbols", corpus.get("api", []))
    values = [_localized(item, locale) for item in values]
    matches = [item for item in values if term.casefold() in json.dumps(item, ensure_ascii=False).casefold()]
    return {"project": corpus.get("name"), "version": corpus.get("version"), "locale": locale,
            "total": len(matches), "offset": offset, "items": matches[offset:offset + limit],
            "provenance": "Installed documentation snapshot; consult its source revision before changing the library."}


def _localized(value, locale):
    """PT-BR: Seleciona traduções sem perder contratos. EN: Select translations without losing contracts."""
    if isinstance(value, list):
        return [_localized(item, locale) for item in value]
    if isinstance(value, dict):
        if locale in value and set(value) <= {"pt-BR", "en"}:
            return value[locale]
        return {key: _localized(item, locale) for key, item in value.items()}
    return value


def tools_catalog():
    """PT-BR: Anuncia apenas consultas. EN: Advertise query tools only."""
    properties = {"workspace": {"type": "string", "description": "Explicit absolute consumer workspace"},
                  "query": {"type": "string", "maxLength": 1000}, "locale": {"enum": ["pt-BR", "en"]},
                  "offset": {"type": "integer", "minimum": 0}, "limit": {"type": "integer", "minimum": 1, "maximum": 100}}
    return [{"name": name, "description": description,
             "inputSchema": {"type": "object", "properties": properties, "required": ["workspace"], "additionalProperties": False},
             "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False}}
            for name, description in (("docs_query", "Search installed bilingual documentation / Pesquisar a documentação bilíngue instalada"),
                                      ("docs_symbols", "Search documented API symbols / Pesquisar símbolos documentados da API"))]


def serve(workspace, data):
    """PT-BR: Atende MCP stdio sem mutações. EN: Serve stdio MCP without mutations."""
    for stream in (sys.stdin, sys.stdout):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    if not Path(workspace).is_absolute() or not Path(workspace).is_dir():
        raise ValueError("An existing absolute workspace is required.")
    workspace = Path(workspace).resolve()
    data = _safe(workspace, Path(data))
    for line in sys.stdin:
        request = {}
        try:
            request = json.loads(line)
            if not isinstance(request, dict):
                raise ValueError("Expected a JSON-RPC object.")
            if "id" not in request:
                continue
            method, params = request.get("method"), request.get("params", {})
            if not isinstance(params, dict):
                raise ValueError("MCP params must be an object.")
            if method == "initialize":
                result = {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}},
                          "serverInfo": {"name": "installed-library-documentation", "version": "1.0.0"}}
            elif method == "tools/list":
                result = {"tools": tools_catalog()}
            elif method == "tools/call":
                value = query(workspace, data, params.get("name"), params.get("arguments", {}))
                result = {"content": [{"type": "text", "text": json.dumps(value, ensure_ascii=False)}]}
            elif method == "ping":
                result = {}
            else:
                raise ValueError("Unsupported MCP method.")
            response = {"jsonrpc": "2.0", "id": request["id"], "result": result}
        except (ValueError, KeyError, TypeError, OSError) as error:
            response = {"jsonrpc": "2.0", "id": request.get("id") if isinstance(request, dict) else None,
                        "error": {"code": -32602, "message": str(error)}}
        print(json.dumps(response, ensure_ascii=False), flush=True)


def main():
    """PT-BR: Vincula a instância ao consumidor. EN: Bind the instance to its consumer."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--data", required=True)
    args = parser.parse_args()
    serve(args.workspace, args.data)


if __name__ == "__main__":
    main()
