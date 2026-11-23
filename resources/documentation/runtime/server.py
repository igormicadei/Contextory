"""PT-BR: Servidor MCP stdio com ferramentas de documentação delimitadas.

EN: Standard-library stdio MCP server with bounded documentation tools.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

# Keep installed copies usable with isolated Python mode, without checkout imports.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import core

SERVER_INSTRUCTIONS = """EN: Document in Brazilian Portuguese and English. The software-documentation module requires carbon-design; load its installed visual guide before authoring or migrating a site. Use the bundled Carbon v11 tokens and assets: a white reading canvas, `g100` shell header, neutral grouped side navigation, local IBM Plex fonts, readable article measure, local locale-aware search and responsive drawer. Organize navigation by task with the current page group open; keep source counts and diagnostics out of reader navigation. Put the language action in the header, preserve the current page on switch, and route `/` by browser language (Portuguese for tags beginning with `pt`, English otherwise). Existing site layouts must be rebuilt with the Carbon template while preserving authored content, translations, IDs, URLs and assets, and migration must remain a draft until review. The only LLM discovery metadata entry is root `/llms.txt` via a `text/plain` alternate link; do not add visible LLM links to generated pages. Run `docs_validate` before `docs_build`. Review output at 1440px, 390px and 320px for contrast, spacing, overflow, search, keyboard-scrollable tables/code with localized mobile overflow hints, locale parity, focus order/confinement, Escape, reduced motion and useful no-JavaScript navigation. Every call must select an explicitly authorized absolute workspace.

PT-BR: Documente em portugu\u00eas brasileiro e ingl\u00eas. O m\u00f3dulo software-documentation exige carbon-design; carregue o guia visual instalado antes de criar ou migrar um site. Use tokens e assets Carbon v11 inclu\u00eddos: canvas branco de leitura, cabe\u00e7alho de shell `g100`, navega\u00e7\u00e3o lateral neutra e agrupada, fontes locais IBM Plex, largura leg\u00edvel do artigo, busca local por idioma e drawer responsivo. Organize a navega\u00e7\u00e3o por tarefa com o grupo da p\u00e1gina atual aberto; mantenha contagens de fontes e diagn\u00f3sticos fora da navega\u00e7\u00e3o. Posicione a troca de idioma no cabe\u00e7alho, preserve a p\u00e1gina atual e direcione `/` pelo idioma do navegador (portugu\u00eas para tags iniciadas por `pt`, ingl\u00eas nos demais casos). Sites existentes devem ser reconstru\u00eddos com o template Carbon, preservando conte\u00fado autoral, tradu\u00e7\u00f5es, IDs, URLs e assets; a migra\u00e7\u00e3o deve continuar em rascunho at\u00e9 a revis\u00e3o. O \u00fanico metadado de descoberta LLM \u00e9 `/llms.txt` na raiz via alternate `text/plain`; n\u00e3o adicione links LLM vis\u00edveis \u00e0s p\u00e1ginas geradas. Execute `docs_validate` antes de `docs_build`. Revise a sa\u00edda em 1440px, 390px e 320px para contraste, espa\u00e7amento, transbordamento, busca, tabelas/c\u00f3digo rol\u00e1veis por teclado com dicas m\u00f3veis localizadas para colunas ocultas, paridade de idioma, ordem/conten\u00e7\u00e3o do foco, Escape, movimento reduzido e navega\u00e7\u00e3o \u00fatil sem JavaScript. Cada chamada deve selecionar um workspace absoluto autorizado."""


def tools_catalog():
    """PT-BR: Anunciar contratos reais do servidor. EN: Advertise actual server contracts."""
    workspace_property = {"type": "string", "description": "Explicit authorized absolute target workspace; never inferred from cwd."}
    definitions = [
        ("docs_map", "EN: Inventory owned source files, Python symbols and coverage gaps without importing code. PT-BR: Inventarie arquivos próprios, símbolos Python e lacunas sem importar código.", {"offset": {"type": "integer", "minimum": 0}, "limit": {"type": "integer", "minimum": 1, "maximum": 1000}}, []),
        ("docs_init", "EN: Create a bilingual Carbon v2 draft with grouped navigation and the required default pages; preserve existing documentation. PT-BR: Crie rascunho Carbon v2 bilíngue com navegação agrupada e páginas padrão obrigatórias; preserve a documentação existente.", {"name": {"type": "string"}, "kind": {"type": "string", "enum": list(core.REQUIRED)}, "sourceRoots": {"type": "array", "items": {"type": "string"}, "minItems": 1}}, ["name", "kind"]),
        ("docs_validate", "EN: Audit the current Carbon corpus for bilingual content, page/navigation coverage, citations, source hashes, feature review evidence, native docstrings, responsive mobile table overflow hints, examples and assets before build. PT-BR: Audite o corpus Carbon atual quanto a conte\u00fado bil\u00edngue, cobertura de p\u00e1ginas/navega\u00e7\u00e3o, cita\u00e7\u00f5es, hashes de fontes, evid\u00eancia de revis\u00e3o de funcionalidades, docstrings nativas, avisos m\u00f3veis de rolagem de tabelas, exemplos e assets antes de gerar.", {}, []),
        ("docs_build", "EN: Validate and build the Carbon site, grouped navigation, locale-aware local search, mobile table overflow hints, Markdown, root /llms.txt and machine-readable API exports from one reviewed corpus. PT-BR: Valide e gere o site Carbon, navega\u00e7\u00e3o agrupada, busca local por idioma, avisos m\u00f3veis de rolagem de tabelas, Markdown, /llms.txt na raiz e exporta\u00e7\u00f5es de API leg\u00edveis por m\u00e1quina a partir de um corpus revisado.", {}, []),
        ("docs_integrations", "Generate a self-contained consumer skill, role guides and read-only query MCP bundle.", {}, []),
        ("docs_pages_plan", "Inspect target GitHub remotes and a verified build without writes; return missing choices.", {"remote": {"type": "string"}}, []),
        ("docs_pages_publish", "Publish current verified artifacts to managed orphan gh-pages and configure GitHub Pages.", {"remote": {"type": "string"}}, []),
        ("docs_pages_status", "Verify GitHub Pages build and the live artifact; never equate push with deployment.", {"remote": {"type": "string"}}, []),
        ("docs_migrate", "EN: Preview source changes or migrate v0/v1 and repair non-Carbon v2 corpora into Carbon schema v2; preserve authored content/translations/IDs/URLs/assets, back up the source, replace the legacy site shell, repair grouped navigation and leave the result in draft for review. Apply defaults false. PT-BR: Preveja mudan\u00e7as nas fontes ou migre corpora v0/v1 e repare corpora v2 sem Carbon para o schema Carbon v2; preserve conte\u00fado/tradu\u00e7\u00f5es/IDs/URLs/assets autorais, crie backup, substitua o shell legado, corrija navega\u00e7\u00e3o agrupada e deixe o resultado em rascunho para revis\u00e3o. Aplicar \u00e9 falso por padr\u00e3o.", {"apply": {"type": "boolean", "description": "EN: Apply the previewed backup-protected migration. PT-BR: Aplicar migração revisada e protegida por backup."}}, []),
        ("docs_readme", "EN: Preview or apply bilingual website links and the single llms.txt agent entrypoint in README; do not link full exports directly. PT-BR: Preveja ou aplique links bilíngues do site e o único ponto de entrada de agentes llms.txt no README; não vincule exportações completas diretamente.", {"siteUrl": {"type": "string"}, "apply": {"type": "boolean"}}, ["siteUrl"]),
    ]
    readonly = {"docs_map", "docs_validate", "docs_pages_plan", "docs_pages_status"}
    return [{"name": name, "description": description, "inputSchema": {"type": "object", "properties": {"workspace": workspace_property, **properties}, "required": ["workspace", *required], "additionalProperties": False}, "annotations": {"readOnlyHint": name in readonly, "destructiveHint": False, "openWorldHint": name.startswith("docs_pages_")}} for name, description, properties, required in definitions]


def validate_arguments(name, arguments):
    """PT-BR: Impor o contrato também no servidor. EN: Enforce the contract in the server too."""
    tool = next((tool for tool in tools_catalog() if tool["name"] == name), None)
    if tool is None:
        raise ValueError("unknown tool: " + str(name))
    schema = tool["inputSchema"]
    if not isinstance(arguments, dict) or set(arguments) - set(schema["properties"]) or set(schema["required"]) - set(arguments):
        raise ValueError("missing or unknown tool arguments")
    types = {"string": str, "integer": int, "boolean": bool, "array": list}
    for key, value in arguments.items():
        rule = schema["properties"][key]
        if type(value) is not types[rule["type"]]:
            raise ValueError(key + ": invalid type")
        if "enum" in rule and value not in rule["enum"]:
            raise ValueError(key + ": invalid value")
        if rule["type"] == "integer" and not rule.get("minimum", value) <= value <= rule.get("maximum", value):
            raise ValueError(key + ": out of range")
        if rule["type"] == "array" and (len(value) < rule.get("minItems", 0) or any(not isinstance(item, str) for item in value)):
            raise ValueError(key + ": invalid items")


def call_tool(name, arguments, allowed_workspaces=()):
    """PT-BR: Despachar somente operações registradas. EN: Dispatch registered operations only."""
    validate_arguments(name, arguments)
    root = core.workspace(arguments["workspace"])
    if allowed_workspaces and root not in allowed_workspaces:
        raise ValueError("workspace is not authorized for this server")
    if name == "docs_map":
        report = core.map_project(root)
        offset, limit = arguments.get("offset", 0), arguments.get("limit", 100)
        files = report.pop("files")
        # The fingerprint/state covers all files; only symbol details are paged.
        return {**report, "files": files[offset:offset + limit], "offset": offset, "total": len(files), "nextOffset": offset + limit if offset + limit < len(files) else None}
    if name == "docs_init":
        return core.init_project(root, arguments["name"], arguments["kind"], arguments.get("sourceRoots"))
    if name == "docs_validate":
        report = core.validate(root)
        report.pop("mapping", None)
        return report
    if name == "docs_build":
        return core.build(root)
    if name == "docs_integrations":
        from consumer import integrations
        return integrations(root)
    if name.startswith("docs_pages_"):
        import deployment
        return {"docs_pages_plan": deployment.pages_plan, "docs_pages_publish": deployment.pages_publish, "docs_pages_status": deployment.pages_status}[name](root, arguments.get("remote"))
    if name == "docs_migrate":
        return core.migrate(root, arguments.get("apply", False))
    if name == "docs_readme":
        return core.readme_links(root, arguments["siteUrl"], arguments.get("apply", False))
    raise ValueError("unknown tool")


def respond(message, allowed_workspaces=()):
    """PT-BR: Processar uma mensagem JSON-RPC. EN: Process one JSON-RPC message."""
    if not isinstance(message, dict):
        return {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid Request"}}
    if "id" not in message:
        return None
    response = {"jsonrpc": "2.0", "id": message["id"]}
    method = message.get("method")
    params = message.get("params", {})
    if method in {"initialize", "tools/call", "tools/list"} and not isinstance(params, dict):
        return {**response, "error": {"code": -32602, "message": "params must be an object"}}
    if method == "initialize":
        response["result"] = {"protocolVersion": params.get("protocolVersion", "2024-11-05"), "serverInfo": {"name": "software-documentation", "version": "1.0.1"}, "capabilities": {"tools": {}}, "instructions": SERVER_INSTRUCTIONS}
    elif method == "ping":
        response["result"] = {}
    elif method == "tools/list":
        response["result"] = {"tools": tools_catalog()}
    elif method == "tools/call":
        try:
            result = call_tool(params.get("name"), params.get("arguments", {}), allowed_workspaces)
            response["result"] = {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}], "isError": False}
        except (ValueError, OSError, KeyError, TypeError, subprocess.SubprocessError) as error:
            response["result"] = {"content": [{"type": "text", "text": str(error)}], "isError": True}
    else:
        response["error"] = {"code": -32601, "message": "Method not found"}
    return response


def main():
    """PT-BR: Servir stdio sem saída de diagnóstico no protocolo. EN: Serve stdio without protocol diagnostics."""
    for stream in (sys.stdin, sys.stdout):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", action="append", default=[], help="Optional exact authorized workspace restriction")
    parser.add_argument("--workspace-per-call", action="store_true", help="Select explicit authorized absolute workspace on every call")
    args = parser.parse_args()
    allowed = tuple(core.workspace(value) for value in args.workspace)
    for line in sys.stdin:
        try:
            result = respond(json.loads(line), allowed)
        except (ValueError, TypeError) as error:
            result = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error: " + str(error)}}
        if result is not None:
            print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
