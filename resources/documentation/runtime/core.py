"""PT-BR: Mapeamento, validação e publicação estática bilíngue sem executar o projeto.

EN: Map, validate and render bilingual documentation without executing project code.
"""
from __future__ import annotations

import ast
import fnmatch
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import tempfile
from collections import Counter
from pathlib import Path
from urllib.parse import quote, urlsplit

LOCALES = ("pt-BR", "en")
SCHEMA_VERSION = 2
CONFIG = ".documentation/project.json"
SITE = ".documentation/site"
SOURCE_SUFFIXES = {".py", ".pyi", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".go", ".rs", ".java", ".c", ".cpp", ".h", ".hpp", ".cs", ".rb", ".php", ".sh", ".ps1", ".sql", ".vue", ".svelte", ".swift", ".kt", ".kts", ".r", ".jl", ".lua", ".ex", ".exs", ".scala", ".dart", ".html", ".css", ".scss"}
SKIP = {".git", ".hg", ".svn", "node_modules", ".venv", "venv", "__pycache__", ".documentation", ".custom-agents", ".agents", ".codex", ".claude", ".bob", ".remember", ".vscode", "dist", "build", "coverage", ".next", ".pytest_cache", ".mypy_cache", "vendor"}
REQUIRED = {
    "application": ["overview", "install", "quickstart", "features", "walkthroughs", "reference", "faq", "troubleshooting", "contributing"],
    "library": ["overview", "install", "quickstart", "features", "advanced", "api", "adaptation", "edge-cases", "reference", "faq", "troubleshooting", "contributing"],
    "plugin": ["overview", "install", "quickstart", "features", "advanced", "api", "adaptation", "edge-cases", "reference", "faq", "troubleshooting", "contributing"],
}
TITLES = {
    "overview": ("Visão geral", "Overview"), "install": ("Instalação", "Installation"),
    "quickstart": ("Primeiros passos", "Quickstart"), "features": ("Funcionalidades", "Features"),
    "walkthroughs": ("Guias passo a passo", "Step-by-step guides"), "advanced": ("Uso avançado", "Advanced usage"),
    "api": ("Referência da API", "API reference"), "adaptation": ("Adaptação e integração", "Adaptation and integration"),
    "edge-cases": ("Casos especiais e limites", "Edge cases and limits"), "reference": ("Referência técnica", "Technical reference"),
    "faq": ("Perguntas frequentes", "FAQ"), "troubleshooting": ("Solução de problemas", "Troubleshooting"),
    "contributing": ("Como contribuir", "Contributing"),
}
LABELS = {
    "pt-BR": {"skip": "Ir para o conteúdo", "search": "Buscar na documentação", "searchPlaceholder": "Buscar…", "nav": "Navegação", "menu": "Menu", "closeMenu": "Fechar navegação", "toc": "Nesta página", "sources": "Fontes", "results": "Resultados", "none": "Nenhum resultado", "clear": "Limpar busca", "shortcut": "Use / ou Ctrl+K para buscar", "count": "resultado(s)", "searchError": "Busca indisponível. Use a navegação ou a exportação Markdown.", "api": "Símbolos documentados", "localeAction": "Ver em Português (Brasil)"},
    "en": {"skip": "Skip to content", "search": "Search documentation", "searchPlaceholder": "Search…", "nav": "Navigation", "menu": "Menu", "closeMenu": "Close navigation", "toc": "On this page", "sources": "Sources", "results": "Results", "none": "No results", "clear": "Clear search", "shortcut": "Press / or Ctrl+K to search", "count": "result(s)", "searchError": "Search is unavailable. Browse the navigation or Markdown export.", "api": "Documented symbols", "localeAction": "Read in English"},
}
TABLE_SCROLL_LABELS = {"pt-BR": "Tabela de dados com rolagem horizontal", "en": "Horizontally scrollable data table"}
TABLE_SCROLL_HINTS = {"pt-BR": "Deslize horizontalmente para ver mais colunas", "en": "Scroll horizontally to view more columns"}

NAVIGATION_GROUPS = (
    ("getting-started", ("Comece aqui", "Get started"), ("overview", "install", "quickstart"), ()),
    ("guides", ("Guias de uso", "Guides"), ("features", "walkthroughs", "advanced"), ()),
    ("reference", ("Referência", "Reference"), ("reference", "api", "edge-cases"), ()),
    ("integrations", ("Integrações", "Integrations"), ("adaptation",), ("mcp-", "integration-")),
    ("help", ("Ajuda e suporte", "Help and support"), ("faq", "troubleshooting", "contributing"), ()),
)


def default_navigation(pages):
    """PT-BR: Agrupar páginas em submenus Carbon previsíveis. EN: Group pages into predictable Carbon submenus."""
    page_ids = [page["id"] for page in pages]
    used = set()
    groups = []
    for identifier, title, exact, prefixes in NAVIGATION_GROUPS:
        selected = [page_id for page_id in page_ids if page_id in exact or page_id.startswith(prefixes)]
        if selected:
            groups.append({"id": identifier, "title": bilingual(title), "pages": selected})
            used.update(selected)
    additional = [page_id for page_id in page_ids if page_id not in used]
    if additional:
        groups.append({"id": "more", "title": bilingual(("Mais tópicos", "More topics")), "pages": additional})
    return groups


def workspace(value):
    """PT-BR: Exigir uma raiz absoluta existente. EN: Require an existing absolute root."""
    path = Path(value)
    if not path.is_absolute() or not path.is_dir():
        raise ValueError("workspace must be an existing authorized absolute directory")
    if path.is_symlink():
        raise ValueError("workspace must not be a symlink")
    return path.resolve()


def safe_path(root, relative):
    """PT-BR: Conter caminhos e recusar links. EN: Contain paths and refuse symlinks."""
    root = workspace(root)
    relative = str(relative)
    part = Path(relative)
    if not relative or part.is_absolute() or ".." in part.parts or "\\" in relative or ":" in relative:
        raise ValueError(f"unsafe workspace-relative path: {relative}")
    candidate = root / part
    cursor = candidate
    while cursor != root:
        if cursor.is_symlink() or (hasattr(cursor, "is_junction") and cursor.is_junction()):
            raise ValueError(f"symlink/junction is not allowed: {relative}")
        cursor = cursor.parent
    if not candidate.resolve().is_relative_to(root):
        raise ValueError(f"path escapes workspace: {relative}")
    return candidate


def read_json(path):
    """PT-BR: Ler JSON UTF-8. EN: Read UTF-8 JSON."""
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def write_json(path, data):
    """PT-BR: Gravar JSON legível. EN: Write readable JSON."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def digest(data):
    """PT-BR: Resumir bytes ou JSON estável. EN: Hash bytes or stable JSON."""
    if not isinstance(data, bytes):
        data = json.dumps(data, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def source_digest(path, payload):
    """PT-BR: Ignorar somente links README gerados pelo próprio fluxo. EN: Ignore only README links generated by this workflow."""
    if path.name.lower() == "readme.md":
        payload = re.sub(rb"\s*<!-- software-documentation:start -->.*?<!-- software-documentation:end -->\s*", b"", payload, flags=re.S).rstrip()
    return digest(payload)


def load_project(root):
    """PT-BR: Ler o contrato atual sem migrá-lo. EN: Read the current contract without migration."""
    data = read_json(safe_path(root, CONFIG))
    if data.get("schemaVersion") != SCHEMA_VERSION:
        raise ValueError("unsupported schemaVersion; run docs_migrate in inspection mode")
    if data.get("designSystem") != "carbon":
        raise ValueError("Carbon Design is required; run docs_migrate and rebuild the site")
    return data


def bilingual(value):
    """PT-BR: Criar texto paralelo. EN: Construct parallel text."""
    return dict(zip(LOCALES, value))


def python_symbols(text, relative):
    """PT-BR: Inventariar declarações Python sem importação. EN: Inventory Python declarations without imports."""
    tree = ast.parse(text, filename=relative, type_comments=True)
    result = [{"name": "<module>", "kind": "module", "line": 1, "endLine": len(text.splitlines()), "docstring": ast.get_docstring(tree) or "", "signature": relative}]

    def visit(node, prefix="", parent="module"):
        """PT-BR: Percorrer inclusive declarações aninhadas. EN: Visit nested declarations too."""
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                name = prefix + child.name
                kind = "class" if isinstance(child, ast.ClassDef) else "method" if parent == "class" else "function"
                signature = child.name
                if kind == "class":
                    bases = [ast.unparse(base) for base in child.bases]
                    bases += [(keyword.arg + "=" if keyword.arg else "**") + ast.unparse(keyword.value) for keyword in child.keywords]
                    signature = "class " + signature + ("(" + ", ".join(bases) + ")" if bases else "")
                else:
                    signature += "(" + ast.unparse(child.args) + ")"
                    if child.returns:
                        signature += " -> " + ast.unparse(child.returns)
                    if isinstance(child, ast.AsyncFunctionDef):
                        signature = "async " + signature
                result.append({"name": name, "kind": kind, "line": child.lineno, "endLine": child.end_lineno, "signature": signature, "docstring": ast.get_docstring(child) or ""})
                visit(child, name + ".", "class" if kind == "class" else "function")
            else:
                visit(child, prefix, parent)

    visit(tree)
    return result


def map_project(root, data=None):
    """PT-BR: Mapear fontes, hashes e limites. EN: Map sources, hashes and coverage limits."""
    root = workspace(root)
    data = data or (load_project(root) if safe_path(root, CONFIG).exists() else {})
    roots = data.get("sourceRoots", ["."])
    if not isinstance(roots, list) or not roots:
        raise ValueError("sourceRoots must be a nonempty array")
    exclusions = data.get("exclude", [])
    if any(not isinstance(item, dict) or not item.get("pattern") or not item.get("reason") for item in exclusions):
        raise ValueError("every exclusion requires pattern and reason")
    files, supporting, skipped, errors, seen = [], [], [], [], set()
    for relative_root in roots:
        start = safe_path(root, relative_root)
        if not start.is_dir():
            errors.append(f"source root missing: {relative_root}")
            continue
        for folder, directories, names in os.walk(start, followlinks=False):
            keep = []
            for name in sorted(directories):
                path = Path(folder) / name
                relative = path.relative_to(root).as_posix()
                if name in SKIP or path.is_symlink() or (hasattr(path, "is_junction") and path.is_junction()):
                    skipped.append({"path": relative, "reason": "generated/dependency/tool directory or symlink"})
                else:
                    keep.append(name)
            directories[:] = keep
            for name in sorted(names):
                path = Path(folder) / name
                relative = path.relative_to(root).as_posix()
                if relative in seen:
                    continue
                seen.add(relative)
                excluded = next((e for e in exclusions if fnmatch.fnmatchcase(relative, e["pattern"])), None)
                if excluded or path.is_symlink():
                    skipped.append({"path": relative, "reason": excluded["reason"] if excluded else "symlink"})
                    continue
                try:
                    safe_path(root, relative)
                    payload = path.read_bytes()
                    if path.suffix.lower() not in SOURCE_SUFFIXES:
                        supporting.append({"path": relative, "sha256": source_digest(path, payload), "bytes": len(payload)})
                        continue
                    text = payload.decode("utf-8-sig")
                    language = "python" if path.suffix.lower() in {".py", ".pyi"} else path.suffix.lower().lstrip(".")
                    item = {"path": relative, "sha256": digest(payload), "language": language, "symbols": [], "coverage": "external-inventory-required"}
                    if language == "python":
                        item["symbols"] = python_symbols(text, relative)
                        item["coverage"] = "python-ast"
                    files.append(item)
                except (ValueError, OSError, SyntaxError) as error:
                    errors.append(f"{relative}: {error}")
    # Cite-only sources outside ownership roots still affect freshness, without
    # silently expanding which third-party declarations must be documented.
    for citation in [s for page in data.get("pages", []) if isinstance(page, dict) for s in page.get("sources", []) if isinstance(s, dict)] + [s for feature in data.get("features", []) if isinstance(feature, dict) for s in feature.get("sources", []) if isinstance(s, dict)]:
        relative = citation.get("path")
        if not isinstance(relative, str) or relative in seen:
            continue
        try:
            path = safe_path(root, relative)
            payload = path.read_bytes()
            supporting.append({"path": relative, "sha256": source_digest(path, payload), "bytes": len(payload), "reason": "cited outside source ownership roots"})
            seen.add(relative)
        except (ValueError, OSError) as error:
            errors.append(f"{relative}: {error}")
    files.sort(key=lambda item: item["path"])
    supporting.sort(key=lambda item: item["path"])
    state = {item["path"]: item["sha256"] for item in [*files, *supporting]}
    return {"files": files, "supportingFiles": supporting, "sourceState": state, "sourceFingerprint": digest(state), "languages": dict(Counter(item["language"] for item in files)), "skipped": skipped, "errors": errors, "complete": not errors, "limits": ["Python AST enumerates declarations; other languages require reviewed source-hash-bound inventories.", "Static mapping does not prove runtime feature coverage. Review routes, commands, UI states, plugins and tests."]}


def init_project(root, name, kind, source_roots=None):
    """PT-BR: Criar rascunho sem substituir autoria. EN: Create a draft without replacing authored content."""
    root = workspace(root)
    if kind not in REQUIRED:
        raise ValueError("kind must be application, library or plugin")
    target = safe_path(root, CONFIG)
    if target.exists():
        raise ValueError("documentation already exists; use the update/migration workflow")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        raise ValueError("name needs a nonempty ASCII slug")
    data = {"schemaVersion": SCHEMA_VERSION, "designSystem": "carbon", "name": name, "slug": slug, "kind": kind, "hasUserInterface": kind == "application", "version": "0.1.0", "sourceRoots": source_roots or ["."], "exclude": [], "draft": True, "audit": {"featuresReviewed": False, "reviewedSourceFingerprint": ""}, "features": [], "externalCoverage": [], "pages": []}
    map_project(root, data)
    for identifier in REQUIRED[kind]:
        title = bilingual(TITLES[identifier])
        data["pages"].append({"id": identifier, "title": title, "sources": [], "sections": [{"id": "guide", "title": title, "blocks": [{"type": "paragraph", "text": bilingual(("TODO: escrever com fontes e exemplos verificados.", "TODO: write from verified sources and examples."))}]}]})
    data["navigation"] = default_navigation(data["pages"])
    write_json(target, data)
    return {"config": CONFIG, "draft": True, "next": "Map features and symbols, author both locales, add sources, then validate. Scaffolds cannot be published."}


def localized(value, label, errors):
    """PT-BR: Exigir as duas traduções. EN: Require both translations."""
    if not isinstance(value, dict) or set(value) != set(LOCALES):
        errors.append(f"{label}: exactly pt-BR and en are required")
        return
    for locale in LOCALES:
        text = value[locale]
        if not isinstance(text, str) or not text.strip() or re.search(r"\b(TODO|TBD|FIXME|PLACEHOLDER)\b", text, re.I):
            errors.append(f"{label}.{locale}: empty or unfinished translation")


def valid_id(value):
    """PT-BR: Restringir IDs públicos. EN: Restrict public identifiers."""
    return isinstance(value, str) and bool(re.fullmatch(r"[a-z0-9][a-z0-9-]*", value))


def check_navigation(navigation, page_ids, errors):
    """PT-BR: Validar grupos Carbon sem páginas duplicadas ou órfãs. EN: Validate Carbon groups without duplicate or orphan pages."""
    if not isinstance(navigation, list) or not navigation:
        errors.append("navigation groups are required; run docs_migrate for existing documentation")
        return
    group_ids, assigned_pages = set(), []
    for index, group in enumerate(navigation):
        label = f"navigation[{index}]"
        if not isinstance(group, dict):
            errors.append(f"{label}: group must be an object")
            continue
        identifier = group.get("id")
        if not valid_id(identifier) or identifier in group_ids:
            errors.append(f"{label}: group IDs must be unique safe identifiers")
        group_ids.add(str(identifier))
        localized(group.get("title"), label + ".title", errors)
        page_list = group.get("pages")
        if not isinstance(page_list, list) or not page_list:
            errors.append(f"{label}: submenu must contain pages")
            continue
        for page_id in page_list:
            if page_id not in page_ids:
                errors.append(f"{label}: unknown page {page_id}")
            assigned_pages.append(str(page_id))
    if len(assigned_pages) != len(set(assigned_pages)):
        errors.append("navigation pages must appear in exactly one submenu")
    if set(assigned_pages) != set(str(page_id) for page_id in page_ids):
        errors.append("navigation must include every page exactly once")


def check_sources(root, sources, label, errors):
    """PT-BR: Verificar citações relativas e linhas. EN: Check relative citations and lines."""
    if not isinstance(sources, list) or not sources:
        errors.append(f"{label}: source citations required")
        return
    for source in sources:
        try:
            path = safe_path(root, source["path"])
            if not path.is_file():
                raise ValueError("file does not exist")
            if "line" in source:
                line = source["line"]
                if type(line) is not int or not 1 <= line <= len(path.read_text(encoding="utf-8-sig").splitlines()):
                    raise ValueError("source line out of range")
        except (KeyError, TypeError, ValueError, OSError) as error:
            errors.append(f"{label}: invalid source: {error}")


def check_url(value, page_ids):
    """PT-BR: Validar links de saída e páginas. EN: Validate outgoing links and pages."""
    if not isinstance(value, str) or any(char in value for char in "\r\n\\\x00"):
        raise ValueError("invalid URL")
    if value in page_ids:
        return
    url = urlsplit(value)
    if url.scheme != "https" or not url.netloc or url.username or url.password:
        raise ValueError("links must reference a page ID or an https URL without credentials")


def check_block(root, block, label, page_ids, errors, images):
    """PT-BR: Validar blocos sem HTML arbitrário. EN: Validate blocks without arbitrary HTML."""
    if not isinstance(block, dict):
        errors.append(f"{label}: block must be an object")
        return
    kind = block.get("type")
    if kind in {"paragraph", "heading", "notice", "link"}:
        localized(block.get("text"), label + ".text", errors)
        if kind == "link":
            try:
                check_url(block.get("href"), page_ids)
            except ValueError as error:
                errors.append(f"{label}: {error}")
    elif kind in {"list", "steps"}:
        items = block.get("items")
        if not isinstance(items, list) or not items:
            errors.append(f"{label}: items must be nonempty")
        else:
            for i, item in enumerate(items):
                localized(item, f"{label}.items[{i}]", errors)
    elif kind == "code":
        localized(block.get("caption"), label + ".caption", errors)
        code = block.get("code")
        if isinstance(code, dict):
            localized(code, label + ".code", errors)
        elif not isinstance(code, str) or not code.strip():
            errors.append(f"{label}: code must be nonempty")
        if not re.fullmatch(r"[\w+-]{0,32}", block.get("language", "")):
            errors.append(f"{label}: invalid code language")
    elif kind == "image":
        localized(block.get("alt"), label + ".alt", errors)
        localized(block.get("caption"), label + ".caption", errors)
        try:
            relative = block["src"]
            if not relative.startswith("assets/"):
                raise ValueError("images must be under .documentation/assets/")
            image = safe_path(root, ".documentation/" + relative)
            if not image.is_file() or image.suffix.lower() not in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}:
                raise ValueError("missing or unsupported image")
            if image.suffix.lower() == ".svg":
                svg = image.read_text(encoding="utf-8")
                if re.search(r"<\s*(script|foreignObject)|\bon\w+\s*=|(?:href|url)\s*[=(]\s*['\"]?(?:https?:|//|javascript:|data:)", svg, re.I):
                    raise ValueError("SVG must not contain executable or remote content")
            images.add(relative)
        except (KeyError, TypeError, OSError, ValueError) as error:
            errors.append(f"{label}: {error}")
    elif kind == "table":
        headers, rows = block.get("headers"), block.get("rows")
        if not isinstance(headers, list) or not headers or not isinstance(rows, list) or not rows:
            errors.append(f"{label}: table headers and rows required")
        else:
            for i, header in enumerate(headers):
                localized(header, f"{label}.headers[{i}]", errors)
            for i, row in enumerate(rows):
                if not isinstance(row, list) or len(row) != len(headers):
                    errors.append(f"{label}.rows[{i}]: column count differs")
                else:
                    for j, cell in enumerate(row):
                        localized(cell, f"{label}.rows[{i}][{j}]", errors)
    else:
        errors.append(f"{label}: unsupported block type {kind}")


def check_docstring(text):
    """PT-BR: Verificar marcadores bilíngues explícitos. EN: Check explicit bilingual markers."""
    return bool(re.search(r"PT-BR:\s*\S", text) and re.search(r"EN:\s*\S", text))


def _validate_documentation(root):
    """PT-BR: Auditar contrato, fontes e comentários. EN: Audit contract, sources and documentation comments."""
    root = workspace(root)
    errors, images = [], set()
    try:
        data = load_project(root)
        mapping = map_project(root, data)
    except (ValueError, OSError, TypeError) as error:
        return {"valid": False, "errors": [str(error)]}
    errors.extend(mapping["errors"])
    if not isinstance(data.get("name"), str) or not data["name"].strip() or not valid_id(data.get("slug")):
        errors.append("project name and safe slug are required")
    if not isinstance(data.get("version"), str) or not data["version"].strip():
        errors.append("project version required")
    if data.get("draft") is not False:
        errors.append("draft documentation cannot be built or published")
    if data.get("kind") not in REQUIRED:
        errors.append("invalid project kind")
    has_ui = data.get("hasUserInterface", data.get("kind") == "application")
    if type(has_ui) is not bool:
        errors.append("hasUserInterface must be a boolean")
    pages = data.get("pages", [])
    if not isinstance(pages, list) or any(not isinstance(page, dict) for page in pages):
        return {"valid": False, "errors": errors + ["pages must be an array of objects"]}
    identifiers = [page.get("id") for page in pages]
    if any(not valid_id(identifier) for identifier in identifiers) or len(set(str(i) for i in identifiers)) != len(identifiers):
        errors.append("page IDs must be unique safe identifiers")
    required = set(REQUIRED.get(data.get("kind"), []))
    if has_ui:
        required.add("walkthroughs")
    if required - set(str(i) for i in identifiers):
        errors.append("missing required pages: " + ", ".join(sorted(required - set(str(i) for i in identifiers))))
    if data.get("designSystem") != "carbon":
        errors.append("designSystem must be carbon")
    check_navigation(data.get("navigation"), identifiers, errors)
    for page in pages:
        label = "page." + str(page.get("id"))
        localized(page.get("title"), label + ".title", errors)
        check_sources(root, page.get("sources"), label, errors)
        sections = page.get("sections")
        if not isinstance(sections, list) or not sections:
            errors.append(f"{label}: nonempty sections required")
            continue
        section_ids = set()
        for section in sections:
            if not isinstance(section, dict):
                errors.append(f"{label}: section must be an object")
                continue
            identifier = section.get("id")
            if not valid_id(identifier) or str(identifier) in section_ids:
                errors.append(f"{label}: duplicate or invalid section ID")
            section_ids.add(str(identifier))
            localized(section.get("title"), label + ".section.title", errors)
            blocks = section.get("blocks")
            if not isinstance(blocks, list) or not blocks:
                errors.append(f"{label}: nonempty blocks required")
                continue
            for i, block in enumerate(blocks):
                check_block(root, block, f"{label}.{identifier}[{i}]", identifiers, errors, images)
    audit = data.get("audit", {})
    if not isinstance(audit, dict) or audit.get("featuresReviewed") is not True or audit.get("reviewedSourceFingerprint") != mapping["sourceFingerprint"]:
        errors.append("feature audit must review the current sourceFingerprint")
    features = data.get("features", [])
    if not isinstance(features, list) or not features:
        errors.append("source-backed feature inventory is required")
        features = []
    feature_ids = set()
    for feature in features:
        if not isinstance(feature, dict):
            errors.append("feature must be an object")
            continue
        identifier = feature.get("id")
        if not valid_id(identifier) or str(identifier) in feature_ids:
            errors.append("feature IDs must be unique safe identifiers")
        feature_ids.add(str(identifier))
        localized(feature.get("name"), f"feature.{identifier}.name", errors)
        check_sources(root, feature.get("sources"), f"feature.{identifier}", errors)
        linked = feature.get("pages", [])
        if not isinstance(linked, list) or not linked or any(p not in identifiers for p in linked):
            errors.append(f"feature.{identifier}: documentation pages are missing")
        if has_ui:
            blocks = [block for page in pages if page.get("id") in linked for section in page.get("sections", []) if isinstance(section, dict) for block in section.get("blocks", []) if isinstance(block, dict)]
            if not any(b.get("type") == "steps" for b in blocks) or not any(b.get("type") == "image" for b in blocks):
                errors.append(f"feature.{identifier}: UI walkthrough requires steps and an actual image")
    external = data.get("externalCoverage", [])
    if not isinstance(external, list):
        errors.append("externalCoverage must be an array")
        external = []
    external_paths = [entry.get("path") for entry in external if isinstance(entry, dict)]
    if len(external_paths) != len(set(str(p) for p in external_paths)):
        errors.append("externalCoverage has duplicate paths")
    known = {item["path"] for item in mapping["files"] if item["language"] != "python"}
    if set(str(p) for p in external_paths) - known:
        errors.append("externalCoverage contains removed or non-external files")
    symbol_count = 0
    for file in mapping["files"]:
        if file["language"] != "python":
            entry = next((e for e in external if isinstance(e, dict) and e.get("path") == file["path"]), {})
            if entry.get("sha256") != file["sha256"] or not entry.get("provider") or entry.get("complete") is not True:
                errors.append(f"{file['path']}: current reviewed external symbol inventory required")
                continue
            symbols = entry.get("symbols", [])
            if not isinstance(symbols, list) or not symbols or not any(isinstance(s, dict) and s.get("kind") == "module" for s in symbols):
                errors.append(f"{file['path']}: external inventory must include its module and all declarations")
                continue
            lines = safe_path(root, file["path"]).read_text(encoding="utf-8-sig").splitlines()
            validated = []
            for symbol in symbols:
                try:
                    start, end = symbol["docStartLine"], symbol["docEndLine"]
                    line = symbol["line"]
                    if not symbol["name"] or symbol["kind"] not in {"module", "class", "function", "method"} or type(start) is not int or type(end) is not int or type(line) is not int or not 1 <= start <= end <= len(lines) or not 1 <= line <= len(lines):
                        raise ValueError("invalid symbol/comment range")
                    documentation = "\n".join(lines[start - 1:end])
                    if not check_docstring(documentation):
                        raise ValueError("native comment needs PT-BR: and EN: text")
                    validated.append({"name": symbol["name"], "kind": symbol["kind"], "line": line, "signature": symbol.get("signature", symbol["name"]), "docstring": documentation})
                except (KeyError, TypeError, ValueError) as error:
                    errors.append(f"{file['path']}: {error}")
            file["symbols"] = validated
            file["coverage"] = "reviewed-external-inventory"
        else:
            for symbol in file["symbols"]:
                if not check_docstring(symbol["docstring"]):
                    errors.append(f"{file['path']}:{symbol['line']}#{symbol['name']}: bilingual docstring required (PT-BR: / EN:)")
        symbol_count += len(file["symbols"])
    if not mapping["files"]:
        errors.append("no owned source files found; check sourceRoots and exclusions")
    return {"valid": not errors, "errors": errors, "sourceFingerprint": mapping["sourceFingerprint"], "fileCount": len(mapping["files"]), "symbolCount": symbol_count, "images": sorted(images), "mapping": mapping}


def validate(root):
    """PT-BR: Relatar também campos malformados sem derrubar o MCP. EN: Report malformed fields without terminating MCP."""
    try:
        return _validate_documentation(root)
    except (AttributeError, KeyError, IndexError, TypeError, ValueError, OSError, RecursionError) as error:
        return {"valid": False, "errors": ["invalid documentation contract: " + str(error)]}


def block_output(block, locale, markdown=False):
    """PT-BR: Renderizar HTML escapado ou Markdown. EN: Render escaped HTML or Markdown."""
    kind = block["type"]
    esc = html.escape
    if kind in {"paragraph", "heading", "notice"}:
        text = block["text"][locale]
        if markdown:
            return ("### " if kind == "heading" else "> " if kind == "notice" else "") + text + "\n\n"
        tag = "h3" if kind == "heading" else "aside" if kind == "notice" else "p"
        return f"<{tag}>{esc(text)}</{tag}>"
    if kind in {"list", "steps"}:
        if markdown:
            return "\n".join(f"{str(i + 1) + '.' if kind == 'steps' else '-'} {item[locale]}" for i, item in enumerate(block["items"])) + "\n\n"
        tag = "ol" if kind == "steps" else "ul"
        return f"<{tag}>" + "".join("<li>" + esc(item[locale]) + "</li>" for item in block["items"]) + f"</{tag}>"
    if kind == "code":
        code = block["code"][locale] if isinstance(block["code"], dict) else block["code"]
        caption = block["caption"][locale]
        if markdown:
            fence = "`" * max(3, max((len(m[0]) + 1 for m in re.finditer(r"`+", code)), default=0))
            return f"{caption}\n\n{fence}{block.get('language', '')}\n{code}\n{fence}\n\n"
        return f"<figure class='code'><figcaption>{esc(caption)}</figcaption><pre tabindex='0' aria-label='{esc(caption, quote=True)}'><code>{esc(code)}</code></pre></figure>"
    if kind == "image":
        src, alt, caption = block["src"], block["alt"][locale], block["caption"][locale]
        if markdown:
            return f"![{alt}](../{quote(src)})\n\n{caption}\n\n"
        return f"<figure><img loading='lazy' src='../{quote(src)}' alt='{esc(alt, quote=True)}'><figcaption>{esc(caption)}</figcaption></figure>"
    if kind == "link":
        href = block["href"] if block["href"].startswith("https://") else block["href"] + (".md" if markdown else ".html")
        text = block["text"][locale]
        return f"[{text}]({href})\n\n" if markdown else f"<p><a href='{esc(href, quote=True)}'>{esc(text)}</a></p>"
    if kind == "table":
        headers, rows = block["headers"], block["rows"]
        if markdown:
            cells = [[cell[locale].replace("|", "\\|").replace("\n", " ") for cell in row] for row in [headers, *rows]]
            return "| " + " | ".join(cells[0]) + " |\n| " + " | ".join("---" for _ in headers) + " |\n" + "".join("| " + " | ".join(row) + " |\n" for row in cells[1:]) + "\n"
        label = esc(TABLE_SCROLL_LABELS[locale], quote=True)
        hint = esc(TABLE_SCROLL_HINTS[locale])
        return f"<div class='table-scroll' tabindex='0' role='region' aria-label='{label}'><table><thead><tr>" + "".join("<th scope='col'>" + esc(c[locale]) + "</th>" for c in headers) + "</tr></thead><tbody>" + "".join("<tr>" + "".join("<td>" + esc(c[locale]) + "</td>" for c in row) + "</tr>" for row in rows) + f"</tbody></table></div><p class='table-scroll-hint' hidden aria-hidden='true'>{hint}</p>"
    raise ValueError("unsupported block")


def repeats_page_heading(page, section, index, locale):
    """PT-BR: Detectar o subtítulo inicial que apenas repete o título da página. EN: Detect an opening section heading that only repeats the page title."""
    return index == 0 and section["title"][locale].strip().casefold() == page["title"][locale].strip().casefold()


def page_markdown(page, locale):
    """PT-BR: Exportar conteúdo sem a navegação visual. EN: Export content without visual navigation."""
    text = "# " + page["title"][locale] + "\n\n"
    for index, section in enumerate(page["sections"]):
        if not repeats_page_heading(page, section, index, locale):
            text += "## " + section["title"][locale] + "\n\n"
        text += "".join(block_output(block, locale, True) for block in section["blocks"])
    text += "## " + LABELS[locale]["sources"] + "\n\n"
    text += "".join(f"- {s['path']}" + (f":{s['line']}" if s.get("line") else "") + "\n" for s in page["sources"])
    return text + "\n"


def source_revision(root):
    """PT-BR: Obter revisão sem alterar Git. EN: Read the revision without changing Git."""
    try:
        result = subprocess.run(["git", "-C", str(root), "rev-parse", "HEAD"], capture_output=True, text=True, timeout=10)
        return result.stdout.strip() if result.returncode == 0 else "unversioned"
    except (OSError, subprocess.TimeoutExpired):
        return "unversioned"


def public_corpus(data, report, root):
    """PT-BR: Exportar conhecimento público e ocultar caminhos locais de memória, configuração e relatórios.

    EN: Export public knowledge while hiding local memory, configuration and report paths.
    """
    private_roots = (".remember", ".vscode")
    private_paths = {".mcp.json"}
    private_reasons = {
        "Workspace-local MCP configuration is not a shipped or public product contract.",
        "Editor settings and Contextory check recipes are local development configuration, not user-facing application behavior.",
        "Personal local memory and session state are private workspace data, not CustomAgents product source.",
        "Generated local validation reports may contain temporary workspace paths and are not product source.",
    }
    skipped = []
    redacted_count = 0
    for item in report["mapping"]["skipped"]:
        path = item.get("path", "")
        private_path = path in private_paths or any(path == base or path.startswith(base + "/") for base in private_roots)
        if private_path or item.get("reason") in private_reasons:
            redacted_count += 1
        else:
            skipped.append(item)
    redacted = None
    if redacted_count:
        redacted = {
            "count": redacted_count,
            "reason": {
                "pt-BR": "Arquivos locais de configuração, memória privada e relatórios temporários foram omitidos; seus caminhos não são publicados.",
                "en": "Local configuration, private memory, and temporary reports are omitted; their paths are not published.",
            },
        }
    return {"schemaVersion": SCHEMA_VERSION, "designSystem": "carbon", **{key: data[key] for key in ("name", "slug", "kind", "version", "pages", "features")}, "navigation": data.get("navigation", default_navigation(data.get("pages", []))), "hasUserInterface": data.get("hasUserInterface", data["kind"] == "application"), "sourceRevision": source_revision(root), "sourceFingerprint": report["sourceFingerprint"], "sources": report["mapping"]["files"], "symbols": [{"path": file["path"], **symbol} for file in report["mapping"]["files"] for symbol in file["symbols"]], "coverage": {"files": report["fileCount"], "supportingFiles": report["mapping"]["supportingFiles"], "symbols": report["symbolCount"], "skippedCount": len(report["mapping"]["skipped"]), "redactedSkipped": redacted, "skipped": skipped, "limits": report["mapping"]["limits"]}}


def navigation_html(data, page, locale):
    """PT-BR: Renderizar grupos de navegação com submenus nativos. EN: Render native collapsible navigation groups."""
    esc = html.escape
    page_by_id = {item["id"]: item for item in data["pages"]}
    groups = []
    for group in data["navigation"]:
        current = page["id"] in group["pages"]
        group_id = "nav-" + group["id"]
        links = ""
        for page_id in group["pages"]:
            current_attribute = ' aria-current="page"' if page_id == page["id"] else ""
            links += f"<a class='nav-link' href='{page_id}.html'{current_attribute}>{esc(page_by_id[page_id]['title'][locale])}</a>"
        groups.append(
            f"<details class='nav-group' id='{group_id}'{' open' if current else ''}>"
            f"<summary aria-controls='{group_id}-items'><span>{esc(group['title'][locale])}</span>"
            "<svg class='nav-chevron' viewBox='0 0 16 16' aria-hidden='true'><path d='m4 6 4 4 4-4z'/></svg></summary>"
            f"<div class='nav-group-items' id='{group_id}-items'>{links}</div></details>"
        )
    return "".join(groups)


def page_html(data, page, locale):
    """PT-BR: Criar página Carbon com grupos, busca e metadados LLM. EN: Render a Carbon page with navigation groups, search and LLM metadata."""
    esc, labels = html.escape, LABELS[locale]
    alternate = "en" if locale == "pt-BR" else "pt-BR"
    target_locale = "English" if alternate == "en" else "Português (Brasil)"
    locale_action = "Switch language to" if locale == "en" else "Mudar idioma para"
    kind_label = {"application": ("Aplicação", "Application"), "library": ("Biblioteca", "Library"), "plugin": ("Plugin", "Plugin")}[data["kind"]][0 if locale == "pt-BR" else 1]
    navigation = navigation_html(data, page, locale)
    toc_items = [s for i, s in enumerate(page["sections"]) if not repeats_page_heading(page, s, i, locale)]
    toc = "".join(f"<a href='#{esc(s['id'], quote=True)}'>{esc(s['title'][locale])}</a>" for s in toc_items)
    toc = f"<aside class='toc' aria-label='{labels['toc']}'><strong>{labels['toc']}</strong>{toc}</aside>" if toc else ""
    content_parts = []
    for index, section in enumerate(page["sections"]):
        blocks = "".join(block_output(block, locale) for block in section["blocks"])
        if repeats_page_heading(page, section, index, locale):
            content_parts.append(blocks)
        else:
            section_id = esc(section["id"], quote=True)
            title = esc(section["title"][locale])
            content_parts.append(f"<section aria-labelledby='{section_id}'><h2 id='{section_id}'>{title}</h2>{blocks}</section>")
    content = "".join(content_parts)
    shell_class = "docs-shell" if toc else "docs-shell docs-shell--without-toc"
    source_text = ", ".join(s["path"] + (":" + str(s["line"]) if s.get("line") else "") for s in page["sources"])
    return f"""<!doctype html>
<html class='no-js' lang='{locale}' data-carbon-theme='white'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>
<meta name='generator' content='Custom Agents Documentation'><meta name='description' content='{esc(page['title'][locale])} · {esc(data['name'])}'><title>{esc(page['title'][locale])} · {esc(data['name'])}</title>
<link rel='stylesheet' href='../assets/site.css'><link rel='preload' href='../assets/fonts/IBMPlexSans-Regular.woff2' as='font' type='font/woff2' crossorigin><link rel='preload' href='../assets/fonts/IBMPlexSans-Light.woff2' as='font' type='font/woff2' crossorigin><link rel='alternate' hreflang='{alternate}' href='../{alternate}/{page['id']}.html'>
<link rel='alternate' type='text/markdown' href='{page['id']}.md'><link rel='alternate' type='text/plain' href='../llms.txt' title='LLM documentation index'>
<script defer src='../assets/site.js'></script></head>
<body><a class='skip' href='#content'>{labels['skip']}</a>
<header class='shell-header cds--g100'><button id='menu' class='menu-button' type='button' aria-label='{labels['menu']}' aria-expanded='false' aria-controls='navigation'><svg viewBox='0 0 32 32' aria-hidden='true'><path d='M4 8h24v2H4zm0 7h24v2H4zm0 7h24v2H4z'/></svg></button>
<a class='brand' href='overview.html'><span class='brand-name'>{esc(data['name'])}</span><span class='brand-divider' aria-hidden='true'>/</span><span class='brand-version'>{esc(data['version'])}</span></a>
<a class='locale-switch cds--btn cds--btn--tertiary' lang='{alternate}' aria-label='{locale_action} {target_locale}' href='../{alternate}/{page['id']}.html'><svg viewBox='0 0 32 32' aria-hidden='true'><path d='M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28Zm9.8 13h-4.1a21 21 0 0 0-1.8-8.1A12.1 12.1 0 0 1 25.8 15ZM16 4.1c1.5 1.8 3 5.5 3.5 10.9h-7C13 9.6 14.5 5.9 16 4.1ZM12.1 6.9a21 21 0 0 0-1.8 8.1H6.2a12.1 12.1 0 0 1 5.9-8.1ZM6.2 17h4.1a21 21 0 0 0 1.8 8.1A12.1 12.1 0 0 1 6.2 17ZM16 27.9c-1.5-1.8-3-5.5-3.5-10.9h7c-.5 5.4-2 9.1-3.5 10.9Zm3.9-2.8a21 21 0 0 0 1.8-8.1h4.1a12.1 12.1 0 0 1-5.9 8.1Z'/></svg><span>{target_locale}</span></a></header>
<div class='mobile-backdrop' id='nav-backdrop' aria-hidden='true' hidden></div>
<div class='{shell_class}'><nav id='navigation' class='side-nav' aria-label='{labels['nav']}'>
<form class='search-shell cds--search' role='search'><label for='search'>{labels['search']}</label><div class='search-field'><svg class='search-icon' viewBox='0 0 32 32' aria-hidden='true'><path d='M21 3a10 10 0 1 0 6.3 17.8l6.4 6.4-1.4 1.4-6.4-6.4A10 10 0 0 0 21 3Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z'/></svg>
<input id='search' name='q' type='search' autocomplete='off' spellcheck='false' placeholder='{labels['searchPlaceholder']}' aria-controls='search-results' aria-describedby='search-help search-status' aria-keyshortcuts='Control+K Meta+K /' data-none='{labels['none']}' data-clear='{labels['clear']}' data-count='{labels['count']}' data-error='{labels['searchError']}' data-locale='{locale}'><button id='search-clear' type='button' class='search-clear' aria-label='{labels['clear']}' hidden><svg viewBox='0 0 32 32' aria-hidden='true'><path d='m8.7 7.3 8.3 8.3 8.3-8.3 1.4 1.4-8.3 8.3 8.3 8.3-1.4 1.4-8.3-8.3-8.3 8.3-1.4-1.4 8.3-8.3-8.3-8.3z'/></svg></button></div>
<p id='search-help' class='search-hint'>{labels['shortcut']}</p><div id='search-status' class='search-status' role='status' aria-live='polite'></div><ul id='search-results' class='search-results' aria-label='{labels['results']}' hidden></ul></form>
<div class='nav-heading'>{esc(kind_label)}</div><div class='nav-groups'>{navigation}</div>
</nav>
<main id='content' class='article' tabindex='-1'><div class='eyebrow'>{esc(data['name'])} / {esc(page['title'][locale])}</div><h1>{esc(page['title'][locale])}</h1>
{content}<footer><strong>{labels['sources']}</strong><p>{esc(source_text)}</p><a class='markdown-link' href='{page['id']}.md'>Markdown ↗</a></footer></main>
{toc}</div></body></html>"""


def root_html(data):
    """PT-BR: Direcionar a entrada ao idioma preferido do navegador e anunciar llms.txt em metadados. EN: Route the entry to the browser's preferred locale and advertise llms.txt in metadata."""
    name = html.escape(data["name"])
    return f"""<!doctype html>
<html class='no-js' lang='en' data-carbon-theme='white'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>
<meta name='generator' content='Custom Agents Documentation'><meta name='description' content='Project documentation / Documentação do projeto'><title>{name}</title>
<link rel='stylesheet' href='assets/site.css'><link rel='alternate' hreflang='pt-BR' href='pt-BR/overview.html'>
<link rel='alternate' hreflang='en' href='en/overview.html'><link rel='alternate' type='text/plain' href='llms.txt' title='LLM documentation index'>
<script>(function(){{const languages=navigator.languages?.length?navigator.languages:[navigator.language||''];const portuguese=languages.some(language=>/^pt(?:-|$)/i.test(String(language)));const locale=portuguese?'pt-BR':'en';location.replace(locale+'/overview.html');}})();</script>
<noscript><meta http-equiv='refresh' content='0;url=en/overview.html'></noscript></head>
<body><main class='route-fallback'><h1>{name}</h1><p>Open the documentation / Abra a documentação</p><a class='cds--btn cds--btn--primary' href='en/overview.html'>Continue / Continuar</a></main></body></html>"""


def input_state(root, data, report):
    """PT-BR: Vincular prova às fontes e imagens atuais. EN: Bind evidence to current sources and images."""
    images = {relative: digest(safe_path(root, ".documentation/" + relative).read_bytes()) for relative in report["images"]}
    runtime = Path(__file__).parent
    generator_paths = ["core.py", "assets/site.css", "assets/site.js", "assets/carbon-themes.css"]
    generator_paths.extend(path.relative_to(runtime).as_posix() for path in sorted((runtime / "assets/fonts").rglob("*")) if path.is_file())
    generator = {relative: digest((runtime / relative).read_bytes()) for relative in generator_paths}
    return {"configHash": digest(data), "sourceState": report["mapping"]["sourceState"], "images": images, "generatorFingerprint": digest(generator)}


def with_api_reference(data, report):
    """PT-BR: Incluir contratos reais na referência navegável. EN: Include actual contracts in the browsable reference."""
    rendered = json.loads(json.dumps(data))
    page = next(page for page in rendered["pages"] if page["id"] == ("reference" if data["kind"] == "application" else "api"))
    # Reserved section keeps generated declarations separate from authored explanations.
    if any(section["id"] == "source-api" for section in page["sections"]):
        raise ValueError("section ID source-api is reserved for generated symbol documentation")
    blocks = []
    for file in report["mapping"]["files"]:
        for symbol in file["symbols"]:
            source = f"{file['path']}:{symbol['line']} — {symbol['name']}"
            documentation = symbol["docstring"]
            chunks = {locale: [] for locale in LOCALES}
            for match in re.finditer(r"(PT-BR|EN):\s*(.*?)(?=(?:PT-BR|EN):|\Z)", documentation, re.S):
                locale = "pt-BR" if match[1] == "PT-BR" else "en"
                text = re.sub(r"(?m)^\s*\*\s?", "", match[2]).strip().removesuffix("*/").strip()
                chunks[locale].append(text)
            blocks.extend([{"type": "heading", "text": {locale: source for locale in LOCALES}}, {"type": "code", "language": "python" if file["language"] == "python" else "text", "caption": bilingual(("Assinatura e localização", "Signature and location")), "code": symbol["signature"]}, {"type": "paragraph", "text": {locale: "\n\n".join(chunks[locale]) or documentation for locale in LOCALES}}])
    page["sections"].append({"id": "source-api", "title": bilingual(("Módulos, classes, métodos e funções", "Modules, classes, methods and functions")), "blocks": blocks})
    return rendered


def managed_output(root):
    """PT-BR: Recusar arquivos não gerenciados no destino. EN: Refuse unmanaged files in the output."""
    site = safe_path(root, SITE)
    if site.exists():
        manifest_path = safe_path(root, SITE + "/manifest.json")
        if not manifest_path.is_file():
            raise ValueError("site output exists without a managed manifest")
        manifest = read_json(manifest_path)
        expected = set(manifest.get("files", {})) | {"manifest.json"}
        actual = set()
        for file in site.rglob("*"):
            safe_path(root, file.relative_to(root).as_posix())
            if file.is_file():
                actual.add(file.relative_to(site).as_posix())
        if actual - expected:
            raise ValueError("unmanaged files in site output: " + ", ".join(sorted(actual - expected)))
    return site


def build(root):
    """PT-BR: Validar e gerar site e exportações atomicamente. EN: Validate and atomically build site and exports."""
    root = workspace(root)
    report = validate(root)
    if not report["valid"]:
        raise ValueError("documentation validation failed:\n" + "\n".join(report["errors"]))
    data = load_project(root)
    rendered = with_api_reference(data, report)
    site = managed_output(root)
    stage = Path(tempfile.mkdtemp(prefix=".site-", dir=safe_path(root, ".documentation")))
    old = None
    try:
        assets = stage / "assets"
        assets.mkdir()
        for asset in ("site.css", "site.js", "carbon-themes.css"):
            shutil.copy2(Path(__file__).parent / "assets" / asset, assets / asset)
        font_source = Path(__file__).parent / "assets" / "fonts"
        (assets / "fonts").mkdir()
        for font in sorted(font_source.iterdir()):
            if font.is_file():
                shutil.copy2(font, assets / "fonts" / font.name)
        for relative in report["images"]:
            target = stage / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                raise ValueError("authored asset collides with generated asset: " + relative)
            shutil.copy2(safe_path(root, ".documentation/" + relative), target)
        corpus = public_corpus(rendered, report, root)
        write_json(stage / "corpus.json", corpus)
        write_json(stage / "api.json", {"sources": corpus["sources"], "coverage": corpus["coverage"]})
        write_json(stage / "search-index.json", [{"locale": locale, "id": page["id"], "title": page["title"][locale], "text": page_markdown(page, locale)} for locale in LOCALES for page in rendered["pages"]])
        full = []
        index = f"# {data['name']}\n\n> {data['kind']} · {data['version']}\n\n"
        for locale in LOCALES:
            folder = stage / locale
            folder.mkdir()
            complete = f"# {data['name']} ({locale})\n\nVersion: {data['version']}\nSource revision: {corpus['sourceRevision']}\nSource fingerprint: {report['sourceFingerprint']}\n\n"
            index += f"## {locale}\n\n"
            for page in rendered["pages"]:
                markdown = page_markdown(page, locale)
                (folder / (page["id"] + ".html")).write_text(page_html(rendered, page, locale), encoding="utf-8")
                (folder / (page["id"] + ".md")).write_text(markdown, encoding="utf-8")
                complete += markdown + "\n---\n\n"
                index += f"- [{page['title'][locale]}]({locale}/{page['id']}.md)\n"
            complete += "## " + LABELS[locale]["api"] + "\n\n"
            for file in corpus["sources"]:
                for symbol in file["symbols"]:
                    complete += f"### {file['path']}:{symbol['line']} — {symbol['name']}\n\n{symbol['signature']}\n\n{symbol['docstring']}\n\n"
            complete += "\n" + "\n".join(corpus["coverage"]["limits"]) + "\n"
            (folder / "llms-full.txt").write_text(complete, encoding="utf-8")
            full.append(complete)
        (stage / "llms.txt").write_text(index + "\n## Full exports\n\n- [Português](pt-BR/llms-full.txt)\n- [English](en/llms-full.txt)\n- [Both languages](llms-full.txt)\n- [API and coverage](api.json)\n", encoding="utf-8")
        (stage / "llms-full.txt").write_text("\n\n".join(full), encoding="utf-8")
        (stage / ".nojekyll").write_text("", encoding="utf-8")
        (stage / "index.html").write_text(root_html(data), encoding="utf-8")
        state = input_state(root, data, report)
        manifest = {"schemaVersion": 1, "generator": "software-documentation", "inputFingerprint": digest(state), **state, "files": {file.relative_to(stage).as_posix(): digest(file.read_bytes()) for file in sorted(stage.rglob("*")) if file.is_file()}}
        write_json(stage / "manifest.json", manifest)
        if site.exists():
            old = stage.with_name(stage.name + "-old")
            os.replace(site, old)
        try:
            os.replace(stage, site)
        except OSError:
            if old:
                os.replace(old, site)
                old = None
            raise
        return {"site": SITE, "inputFingerprint": manifest["inputFingerprint"], "fileCount": len(manifest["files"]), "manifest": SITE + "/manifest.json", "valid": True}
    finally:
        for directory in (stage, old):
            if directory and directory.exists() and directory.parent == safe_path(root, ".documentation") and directory.name.startswith(".site-"):
                shutil.rmtree(directory)


def verify_build(root):
    """PT-BR: Recusar conteúdo ou artefatos obsoletos. EN: Refuse stale content or artifacts."""
    root = workspace(root)
    report = validate(root)
    if not report["valid"]:
        raise ValueError("current documentation does not validate: " + "; ".join(report["errors"]))
    manifest = read_json(safe_path(root, SITE + "/manifest.json"))
    if manifest.get("generator") != "software-documentation" or manifest.get("inputFingerprint") != digest(input_state(root, load_project(root), report)):
        raise ValueError("build is stale; rebuild after source/content/image changes")
    site = managed_output(root)
    for relative, expected in manifest["files"].items():
        file = safe_path(root, SITE + "/" + relative)
        if not file.is_file() or digest(file.read_bytes()) != expected:
            raise ValueError("built artifact changed or missing: " + relative)
    return manifest


def migrate(root, apply=False):
    """PT-BR: Inspecionar mudanças ou migrar corpora para Carbon com backup. EN: Inspect changes or migrate corpora to Carbon with a backup."""
    root = workspace(root)
    target = safe_path(root, CONFIG)
    data = read_json(target)
    version = data.get("schemaVersion", 0)
    if type(version) is not int or version < 0 or version > SCHEMA_VERSION:
        raise ValueError("future/unknown schema version; migration refused")
    upgraded = json.loads(json.dumps(data))
    if version == 0:
        def locale_keys(value):
            """PT-BR: Converter a chave legada pt em todo o corpus. EN: Convert legacy pt keys throughout the corpus."""
            if isinstance(value, dict):
                if "pt" in value:
                    if "pt-BR" in value:
                        raise ValueError("both pt and pt-BR translations exist; resolve explicitly")
                    value["pt-BR"] = value.pop("pt")
                for child in value.values():
                    locale_keys(child)
            elif isinstance(value, list):
                for child in value:
                    locale_keys(child)
        locale_keys(upgraded)

    pages = upgraded.get("pages")
    if not isinstance(pages, list) or not pages or any(not isinstance(page, dict) or not isinstance(page.get("id"), str) for page in pages):
        raise ValueError("corpus pages must be reviewed before migration")
    upgraded["schemaVersion"] = SCHEMA_VERSION
    upgraded["designSystem"] = "carbon"
    upgraded.setdefault("hasUserInterface", upgraded.get("kind") == "application")
    upgraded.setdefault("externalCoverage", [])
    audit = upgraded.setdefault("audit", {"featuresReviewed": False, "reviewedSourceFingerprint": ""})
    if not isinstance(audit, dict):
        audit = {}
        upgraded["audit"] = audit
    audit["featuresReviewed"] = False
    audit["reviewedSourceFingerprint"] = ""
    upgraded["draft"] = True

    navigation_errors = []
    check_navigation(upgraded.get("navigation"), [page["id"] for page in pages], navigation_errors)
    if navigation_errors:
        upgraded["navigation"] = default_navigation(pages)

    needs_migration = version < SCHEMA_VERSION or data.get("designSystem") != "carbon" or data.get("navigation") != upgraded.get("navigation")
    if needs_migration:
        backup_relative = CONFIG + f".v{version}.bak"
        backup = safe_path(root, backup_relative)
        if not apply:
            return {"schemaVersion": version, "targetVersion": SCHEMA_VERSION, "migrationRequired": True,
                    "designSystem": "carbon", "navigationGroups": len(upgraded["navigation"]),
                    "writes": [CONFIG, backup_relative], "draft": True,
                    "note": "Existing text and page IDs are preserved. Review Carbon layout, translated navigation and source coverage before publishing."}
        if backup.exists():
            raise ValueError("migration backup already exists; preserve and review it first")
        backup.write_bytes(target.read_bytes())
        write_json(target, upgraded)
        return {"schemaVersion": SCHEMA_VERSION, "migrated": True, "designSystem": "carbon",
                "navigationGroups": len(upgraded["navigation"]), "backup": backup_relative, "draft": True}

    mapping = map_project(root, data)
    manifest_path = safe_path(root, SITE + "/manifest.json")
    old = read_json(manifest_path).get("sourceState", {}) if manifest_path.exists() else {}
    current = mapping["sourceState"]
    return {"schemaVersion": SCHEMA_VERSION, "migrationRequired": False, "designSystem": "carbon", "added": sorted(set(current) - set(old)), "removed": sorted(set(old) - set(current)), "changed": sorted(p for p in set(current) & set(old) if current[p] != old[p]), "sourceFingerprint": mapping["sourceFingerprint"], "errors": mapping["errors"], "next": "Preserve authored content and URLs; review renamed/removed features, redirect pages, translations and images before rebuilding."}


def readme_links(root, site_url, apply=False):
    """PT-BR: Preparar ou atualizar bloco de links bilíngues. EN: Prepare or update a bilingual links block."""
    root = workspace(root)
    check_url(site_url, [])
    base = site_url.rstrip("/") + "/"
    start, end = "<!-- software-documentation:start -->", "<!-- software-documentation:end -->"
    block = f"{start}\n## Documentação / Documentation\n\n- [Português (Brasil)]({base}pt-BR/overview.html)\n- [English]({base}en/overview.html)\n- [Índice para agentes / Agent index]({base}llms.txt)\n- [API e cobertura / API and coverage]({base}api.json)\n{end}\n"
    path = safe_path(root, "README.md")
    current = path.read_text(encoding="utf-8") if path.exists() else ""
    if current.count(start) != current.count(end) or current.count(start) > 1 or (start in current and current.index(start) > current.index(end)):
        raise ValueError("ambiguous managed README markers")
    updated = re.sub(re.escape(start) + r".*?" + re.escape(end) + r"\n?", lambda _: block, current, flags=re.S) if start in current else current.rstrip() + "\n\n" + block
    if apply:
        path.write_text(updated, encoding="utf-8")
    return {"path": "README.md", "block": block, "changed": updated != current, "applied": apply}
