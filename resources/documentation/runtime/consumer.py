"""PT-BR: Distribui documentação e orientação específica para consumidores.

EN: Distribute documentation and project-specific consumer guidance.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


def integrations(root):
    """PT-BR: Cria bundle portátil somente a partir de documentação verificada.

    EN: Create a portable bundle from verified documentation only.
    """
    from core import workspace, safe_path, load_project, verify_build
    root = workspace(str(root))
    verify_build(root)
    project = load_project(root)
    slug = project["slug"]
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", slug):
        raise ValueError("Invalid project slug.")
    output = safe_path(root, ".documentation/integrations/" + slug)
    bundle_path = safe_path(root, ".documentation/integrations/" + slug + "/bundle.json")
    if output.exists() and not bundle_path.is_file():
        raise ValueError("Refusing to replace an unmanaged integration directory.")
    files = {"corpus.json": safe_path(root, ".documentation/site/corpus.json").read_bytes()}
    runtime = Path(__file__).resolve().parent
    for source, target in (("library_mcp.py", "library_mcp.py"), ("install_library.py", "install.py")):
        files[target] = (runtime / source).read_bytes()
    name = project["name"]
    pages = {p["id"]: p for p in project["pages"]}
    for role, ids in (("use", ("overview", "install", "quickstart", "features", "faq", "troubleshooting")),
                      ("develop", ("reference", "api", "advanced", "adaptation", "edge-cases", "contributing"))):
        selected = ", ".join(identifier for identifier in ids if identifier in pages)
        files[f"guidance/{role}.md"] = f'''# {name} — {role}

PT-BR: Esta orientação acompanha a versão {project.get('version', 'documentada')} de {name}. Consulte as páginas `{selected}` no corpus local `../corpus.json` ou por `docs_query`. Use `docs_symbols` para localizar os contratos reais de classes, métodos e funções. Os caminhos e símbolos das fontes são relativos ao projeto da biblioteca; não os trate como arquivos existentes no consumidor. Verifique a versão instalada antes de aplicar exemplos. Registre lacunas em vez de inventar APIs, comandos ou permissões.

EN: This guidance accompanies {name} version {project.get('version', 'documented')}. Consult pages `{selected}` in the local `../corpus.json` corpus or through `docs_query`. Use `docs_symbols` to locate actual class, method and function contracts. Source paths and symbols are relative to the library project; do not treat them as files present in the consumer. Check the installed version before applying examples. Report gaps instead of inventing APIs, commands or permissions.

PT-BR: Para uso, siga os pré-requisitos, exemplos e tratamento de erros documentados. Para desenvolvimento, confirme os contratos públicos, efeitos colaterais, testes e limites de compatibilidade; alterações no projeto original precisam estar no escopo autorizado.

EN: For usage, follow documented prerequisites, examples and error handling. For development, confirm public contracts, side effects, tests and compatibility limits; original-project changes require authorized scope.
'''.encode("utf-8")
    files["INSTALL.md"] = f'''# {name} — integração / integration

PT-BR: Distribua esta pasta completa como recurso do pacote. No projeto consumidor, execute `python install.py --workspace CAMINHO_ABSOLUTO --client codex` (ou `claude`, `bob`). Use `--dry-run` para inspecionar o plano sem escrita. O instalador copia a documentação, uma skill pública, orientações internas de uso/desenvolvimento e um MCP somente leitura. Recarregue o cliente e siga a aprovação normal do host. Importar a biblioteca não ativa agentes automaticamente.

EN: Ship this complete folder as a package resource. In the consumer project, run `python install.py --workspace ABSOLUTE_PATH --client codex` (or `claude`, `bob`). Use `--dry-run` to inspect without writes. The installer copies documentation, one public skill, internal usage/development guidance and a read-only MCP. Reload the client and follow normal host approval. Importing the library does not activate agents automatically.
'''.encode("utf-8")
    metadata = {"format": "software-documentation-library-v1", "slug": slug, "name": name,
                "version": project.get("version"), "files": {name: hashlib.sha256(content).hexdigest() for name, content in files.items()}}
    # Refuse to erase or silently overwrite modified/unmanaged generated resources.
    previous_files = set()
    if output.exists():
        previous = json.loads(bundle_path.read_text(encoding="utf-8"))
        if previous.get("format") != metadata["format"] or previous.get("slug") != slug:
            raise ValueError("Unrecognized integration directory ownership.")
        previous_files = set(previous.get("files", {}))
        for relative, digest in previous.get("files", {}).items():
            file = safe_path(root, output.relative_to(root).as_posix() + "/" + relative)
            if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != digest:
                raise ValueError("Modified integration resource: " + relative)
        actual = {p.relative_to(output).as_posix() for p in output.rglob("*") if p.is_file()}
        if actual - previous_files - {"bundle.json"}:
            raise ValueError("Unmanaged files exist in the integration directory.")
    output.mkdir(parents=True, exist_ok=True)
    for relative, content in files.items():
        target = safe_path(root, output.relative_to(root).as_posix() + "/" + relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    for relative in previous_files - set(files):
        safe_path(root, output.relative_to(root).as_posix() + "/" + relative).unlink()
    bundle_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"status": "generated", "bundle": str(output), "files": len(files) + 1,
            "activation": "python install.py --workspace ABSOLUTE_CONSUMER --client codex|claude|bob",
            "visibility": "one public skill; internal usage/development guides; read-only MCP"}
