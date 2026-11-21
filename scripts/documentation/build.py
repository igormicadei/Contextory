"""PT-BR: Gera os guias com o runtime e os layouts padrão da skill de documentação.

EN: Build guides with the documentation skill's unchanged runtime and default layouts.
"""
from __future__ import annotations

import argparse
import functools
import hashlib
import html
import http.server
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[2]
VENDOR = Path(__file__).resolve().parent / "vendor"
sys.path.insert(0, str(VENDOR))
import core


class Links(HTMLParser):
    """PT-BR: Coleta destinos locais e âncoras para verificar o HTML gerado.

    EN: Collect local destinations and anchors to verify generated HTML.
    """

    def __init__(self):
        """PT-BR: Inicia coleções por página. EN: Initialize per-page collections."""
        super().__init__()
        self.links = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        """PT-BR: Registra links e IDs sem executar scripts. EN: Record links and IDs without running scripts."""
        if tag == "base":
            return
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        for attr in ("href", "src"):
            if attrs.get(attr):
                self.links.append(attrs[attr])


def write_managed(site, relative, content):
    """PT-BR: Grava um artefato dentro do site e devolve seu hash de bytes.

    EN: Write an artifact inside the site and return its byte hash.
    """
    target = core.safe_path(ROOT, ".documentation/site/" + relative)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = content.encode("utf-8") if isinstance(content, str) else content
    target.write_bytes(payload)
    return hashlib.sha256(payload).hexdigest()


def verify_vendor():
    """PT-BR: Recusa alterações no runtime e nos layouts padrão copiados da skill.

    EN: Refuse changes to the runtime and default layouts copied from the skill.
    """
    provenance = core.read_json(VENDOR / "PROVENANCE.json")
    for relative, expected in provenance["files"].items():
        if hashlib.sha256((VENDOR / relative).read_bytes()).hexdigest() != expected:
            raise ValueError("Changed documentation-skill runtime: " + relative)


def compatibility():
    """PT-BR: Preserva URLs e arquivos legados sem alterar o shell Carbon padrão.

    EN: Preserve legacy URLs and files without changing the default Carbon shell.
    """
    site = ROOT / core.SITE
    manifest = core.verify_build(ROOT)
    redirects = core.read_json(ROOT / ".documentation/redirects.json")
    aliases = core.read_json(ROOT / ".documentation/aliases.json")
    for old, page in redirects.items():
        # A relative base keeps old fragment URLs, CSS, locale links and search usable.
        depth = len(Path(old).parent.parts)
        base = "../" * depth + "en/" + page + ".html"
        source = (site / "en" / (page + ".html")).read_text(encoding="utf-8")
        source = source.replace("<head>", "<head><base href='" + base + "'>", 1)
        anchors = "".join("<span id='" + html.escape(anchor, quote=True) + "' aria-hidden='true'></span>" for anchor in aliases.get(old, []))
        source = source.replace("<main id='content' tabindex='-1'>", "<main id='content' tabindex='-1'>" + anchors, 1)
        manifest["files"][old] = write_managed(site, old, source)
    for source in sorted((ROOT / ".documentation/legacy").rglob("*")):
        if source.is_file():
            relative = "archive/" + source.relative_to(ROOT / ".documentation/legacy").as_posix()
            manifest["files"][relative] = write_managed(site, relative, source.read_bytes())
    for relative in core.read_json(ROOT / ".documentation/legacy-assets.json"):
        payload = core.safe_path(ROOT, relative).read_bytes()
        for target in (relative, "archive/" + relative):
            manifest["files"][target] = write_managed(site, target, payload)
    pages = sorted(path for path in manifest["files"] if path.endswith(".html"))
    metadata = {"version": core.load_project(ROOT)["version"], "pages": pages,
                "locales": list(core.LOCALES), "layout": "software-documentation default Carbon",
                "redirects": redirects}
    manifest["files"]["documentation.json"] = write_managed(site, "documentation.json", json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    core.write_json(site / "manifest.json", manifest)


def check_links():
    """PT-BR: Confere páginas, imagens, exports e âncoras locais com o site já gerado.

    EN: Check pages, images, exports and local anchors in the completed site.
    """
    site = ROOT / core.SITE
    core.verify_build(ROOT)
    pages = {}
    for path in site.rglob("*.html"):
        parser = Links()
        parser.feed(path.read_text(encoding="utf-8"))
        pages[path.resolve()] = parser
    errors = []
    redirects = core.read_json(ROOT / ".documentation/redirects.json")
    for path, parser in pages.items():
        relative = path.relative_to(site).as_posix()
        base = site / "en" if relative in redirects else path.parent
        for link in parser.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            target = (base / unquote(url.path)).resolve() if url.path else path
            if not target.is_relative_to(site.resolve()) or not target.is_file():
                errors.append(relative + ": " + link)
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(relative + ": missing anchor " + link)
    if errors:
        raise ValueError("Broken documentation links:\n" + "\n".join(errors))
    return {"valid": True, "htmlPages": len(pages), "checked": "local pages, assets and anchors"}


def export_markdown():
    """PT-BR: Atualiza apenas guias explicitamente gerenciados e preserva os originais no arquivo.

    EN: Update only explicitly managed guides while preserving originals in the archive.
    """
    data = core.load_project(ROOT)
    pages = {page["id"]: page for page in data["pages"]}
    targets = core.read_json(ROOT / ".documentation/markdown-targets.json")
    reverse = {identifier: path for path, identifier in targets.items()}
    aliases = core.read_json(ROOT / ".documentation/aliases.json")
    for target, identifier in targets.items():
        text = "<!-- Generated from .documentation/project.json; edit the bilingual corpus. -->\n\n"
        text += core.page_markdown(pages[identifier], "en")
        parent = core.safe_path(ROOT, target).parent

        def repository_link(match):
            """PT-BR: Ajusta links do export para o caminho do guia no repositório.

            EN: Adjust export links for the guide's repository location.
            """
            destination = match[2]
            if destination.startswith("../assets/"):
                destination = os.path.relpath(ROOT / ".documentation" / destination[3:], parent).replace("\\", "/")
            elif destination.endswith(".md") and destination[:-3] in pages:
                page_id = destination[:-3]
                destination = os.path.relpath(ROOT / reverse[page_id], parent).replace("\\", "/") if page_id in reverse else "https://igormicadei.github.io/Contextory/en/" + page_id + ".html"
            return match[1] + destination + match[3]

        text = re.sub(r"(\]\()([^\s)]+)(\))", repository_link, text)
        for section in pages[identifier]["sections"]:
            heading = "## " + section["title"]["en"] + "\n"
            text = text.replace(heading, '<a id="' + section["id"] + '"></a>\n\n' + heading, 1)
        old_url = target[:-3] + ".html"
        old_anchors = "".join('<a id="' + html.escape(anchor, quote=True) + '"></a>\n' for anchor in aliases.get(old_url, []))
        if old_anchors:
            text = old_anchors + "\n" + text
        core.safe_path(ROOT, target).write_text(text.rstrip() + "\n", encoding="utf-8")


def consumer_bundle():
    """PT-BR: Gera o bundle de consulta e inclui a licença MIT do runtime distribuído.

    EN: Generate the query bundle and include the distributed runtime's MIT license.
    """
    from consumer import integrations
    result = integrations(ROOT)
    output = Path(result["bundle"])
    license_bytes = (VENDOR / "LICENSE").read_bytes()
    (output / "LICENSE").write_bytes(license_bytes)
    metadata = core.read_json(output / "bundle.json")
    metadata["files"]["LICENSE"] = hashlib.sha256(license_bytes).hexdigest()
    for relative in core.validate(ROOT)["images"]:
        payload = core.safe_path(ROOT, ".documentation/" + relative).read_bytes()
        target = core.safe_path(ROOT, output.relative_to(ROOT).as_posix() + "/" + relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
        metadata["files"][relative] = hashlib.sha256(payload).hexdigest()
    core.write_json(output / "bundle.json", metadata)
    result["files"] = len(metadata["files"]) + 1
    return result


def main():
    """PT-BR: Executa mapa/validação/build/export/preview sem publicar nem aprovar fontes.

    EN: Run mapping/validation/build/export/preview without publishing or approving sources.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("map", "migrate", "validate", "build", "export", "integrations", "preview"), default="build", nargs="?")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    verify_vendor()
    if args.command == "map":
        result = core.map_project(ROOT)
    elif args.command == "migrate":
        result = core.migrate(ROOT, False)
    elif args.command == "validate":
        result = core.validate(ROOT)
        result.pop("mapping", None)
        if not result["valid"]:
            print(json.dumps(result, ensure_ascii=False, indent=2))
            raise SystemExit(1)
    elif args.command == "build":
        result = core.build(ROOT)
        compatibility()
        result["links"] = check_links()
        result["fileCount"] = len(core.verify_build(ROOT)["files"])
        export_markdown()
    elif args.command == "export":
        export_markdown()
        result = {"exported": True}
    elif args.command == "integrations":
        result = consumer_bundle()
    else:
        check_links()
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT / core.SITE))
        print(f"Documentation: http://127.0.0.1:{args.port}/en/overview.html", flush=True)
        http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler).serve_forever()
        return
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
