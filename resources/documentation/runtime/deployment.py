"""PT-BR: Publica artefatos verificados sem alterar a árvore do usuário.

EN: Publish verified artifacts without changing the user's working tree.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT_MESSAGE = "Custom Agents documentation root v1"
REPOSITORY_ENV = {"GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR",
                  "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_NAMESPACE",
                  "GIT_PREFIX", "GIT_CEILING_DIRECTORIES", "GIT_DISCOVERY_ACROSS_FILESYSTEM"}


def _run(args, *, cwd=None, env=None, input=None, check=True):
    """PT-BR: Executa argumentos sem shell e limita falhas e duração.

    EN: Run an argument vector without a shell, with bounded duration/errors.
    """
    process_env = os.environ.copy()
    for key in REPOSITORY_ENV:
        process_env.pop(key, None)
    if env is not None:
        process_env.update(env)
    process_env.update(GIT_TERMINAL_PROMPT="0", GH_PROMPT_DISABLED="1")
    result = subprocess.run(args, cwd=cwd, env=process_env, input=input, text=True,
                            encoding="utf-8", capture_output=True, timeout=120)
    if check and result.returncode:
        diagnostic = re.sub(r"(https?://)[^/\s]+@", r"\1[redacted]@", result.stderr.strip()[-2000:])
        raise ValueError(f"{Path(args[0]).name} failed: {diagnostic}")
    return result


def _git(root, *args, **kwargs):
    """PT-BR: Consulta Git no projeto explícito. EN: Query Git in the explicit project."""
    return _run(["git", "-C", str(root), *args], **kwargs).stdout.strip()


def _repository(url, explicit_host=None):
    """PT-BR: Normaliza URLs GitHub SSH/HTTPS sem credenciais.

    EN: Normalize GitHub SSH/HTTPS URLs without retaining credentials.
    """
    match = re.fullmatch(r"(?:[^/@:]+@)?([^/:]+):([^/]+/[^/]+?)(?:\.git)?", url)
    if match and "://" not in url:
        host, path = match.groups()
    else:
        parsed = urlparse(url)
        if parsed.scheme not in ("https", "ssh") or parsed.password or (parsed.scheme == "https" and parsed.username) or parsed.query or parsed.fragment:
            raise ValueError("Use a GitHub HTTPS or SSH remote, without embedded credentials.")
        host, path = parsed.hostname or "", parsed.path.strip("/")
        if path.endswith(".git"):
            path = path[:-4]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", path):
        raise ValueError("Remote must identify one owner/repository.")
    if host != "github.com" and not (host.startswith("github.") or ".github." in host) and host.lower() != explicit_host:
        raise ValueError("Unsupported remote host; for a custom GitHub Enterprise hostname set pagesHost in .documentation/project.json.")
    owner, repo = path.split("/")
    return {"host": host.lower(), "owner": owner, "repository": repo,
            "identity": f"{host.lower()}/{owner.lower()}/{repo.lower()}"}


def _select(root, remote=None):
    """PT-BR: Resolve ambiguidades sem escolher repositórios implicitamente.

    EN: Resolve ambiguity without silently choosing a repository.
    """
    if _git(root, "rev-parse", "--is-inside-work-tree", check=False) != "true":
        return {"status": "needs_repository", "message": "Initialize Git and add the project's GitHub remote, then retry."}
    names = _git(root, "remote").splitlines()
    if remote is not None and remote not in names:
        raise ValueError("Select an existing Git remote by name.")
    choices, rejected = {}, []
    explicit_host = None
    if (root / ".documentation/project.json").exists():
        from core import safe_path
        configuration = json.loads(safe_path(root, ".documentation/project.json").read_text(encoding="utf-8-sig"))
        explicit_host = configuration.get("pagesHost")
        if explicit_host is not None:
            if not isinstance(explicit_host, str) or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9.-]*", explicit_host):
                raise ValueError("pagesHost must be the explicit GitHub Enterprise hostname, without a URL or port.")
            explicit_host = explicit_host.lower()
    for name in names:
        try:
            urls = _git(root, "remote", "get-url", "--push", "--all", name).splitlines()
            repos = [_repository(url, explicit_host) for url in urls]
            if len({r["identity"] for r in repos}) != 1:
                raise ValueError("A remote with multiple push repositories cannot be used.")
            repo = repos[0]
            repo["remote"] = name
            if remote == name:
                return {"status": "selected", **repo}
            choices.setdefault(repo["identity"], repo)
        except ValueError as error:
            if remote == name:
                raise
            rejected.append({"remote": name, "reason": str(error)})
    if not choices:
        return {"status": "needs_repository", "message": "Add a supported GitHub remote to this project, then retry.", "rejected": rejected}
    if len(choices) > 1:
        return {"status": "needs_choice", "message": "Ask the user which project remote to publish.", "choices": list(choices.values()), "rejected": rejected}
    return {"status": "selected", **next(iter(choices.values())), "rejected": rejected}


def pages_plan(root, remote=None):
    """PT-BR: Planeja publicação somente com leituras locais.

    EN: Plan publication using local read-only operations.
    """
    from core import workspace, verify_build
    root = workspace(str(root))
    selected = _select(root, remote)
    if selected["status"] != "selected":
        return selected
    manifest = verify_build(root)
    artifact = root / ".documentation/site/manifest.json"
    return {**selected, "status": "prepared", "branch": "gh-pages", "path": "/",
            "artifactDigest": hashlib.sha256(artifact.read_bytes()).hexdigest(),
            "inputFingerprint": manifest["inputFingerprint"],
            "configuration": "Pages legacy branch source gh-pages:/; preserve custom domain",
            "message": "Ready to publish using existing task authorization; GitHub access is checked when publishing."}


def _publish_git(root, site, remote):
    """PT-BR: Cria histórico órfão gerenciado e faz push sem força.

    EN: Create managed orphan history and push without force.
    """
    url = _git(root, "remote", "get-url", "--push", remote)
    with tempfile.TemporaryDirectory(prefix="documentation-pages-") as temporary:
        bare = Path(temporary) / "repo.git"
        _run(["git", "init", "--bare", str(bare)])
        git = ["git", "-c", "core.autocrlf=false", "-c", "core.safecrlf=false",
               "-c", "core.eol=lf", "--git-dir", str(bare)]
        _run(git + ["remote", "add", "origin", url])
        head = _run(git + ["ls-remote", "origin", "refs/heads/gh-pages"]).stdout.strip()
        parent = head.split()[0] if head else None
        cname = None
        if parent:
            _run(git + ["fetch", "--no-tags", "origin", "refs/heads/gh-pages"])
            roots = _run(git + ["rev-list", "--max-parents=0", parent]).stdout.splitlines()
            if len(roots) != 1 or _run(git + ["show", "-s", "--format=%B", roots[0]]).stdout.strip() != ROOT_MESSAGE:
                raise ValueError("Existing gh-pages has foreign history; refusing to overwrite it.")
            if _run(git + ["rev-list", "--min-parents=2", parent]).stdout.strip():
                raise ValueError("Existing gh-pages contains merged history; review it manually.")
            old_cname = _run(git + ["show", f"{parent}:CNAME"], check=False)
            if old_cname.returncode == 0:
                cname = old_cname.stdout
        env = {"GIT_INDEX_FILE": str(Path(temporary) / "index")}
        for label, default in (("NAME", "Documentation publisher"), ("EMAIL", "documentation@localhost")):
            value = _git(root, "config", "--get", "user." + label.lower(), check=False) or default
            env["GIT_AUTHOR_" + label] = value
            env["GIT_COMMITTER_" + label] = value
        # Stage bytes directly: global attributes, filters and EOL settings must
        # never transform the validated artifact or its manifest.
        for file in sorted(site.rglob("*")):
            if file.is_symlink() or getattr(file.lstat(), "st_file_attributes", 0) & 0x400:
                raise ValueError("Linked publication artifacts are not allowed.")
            if not file.is_file():
                continue
            blob = _run(git + ["hash-object", "-w", "--no-filters", "--", str(file)], env=env).stdout.strip()
            relative = file.relative_to(site).as_posix()
            _run(git + ["update-index", "--add", "--cacheinfo", f"100644,{blob},{relative}"], env=env)
        if cname is not None and not (site / "CNAME").exists():
            blob = _run(git + ["hash-object", "-w", "--stdin"], env=env, input=cname).stdout.strip()
            _run(git + ["update-index", "--add", "--cacheinfo", f"100644,{blob},CNAME"], env=env)
        tree = _run(git + ["write-tree"], env=env).stdout.strip()
        message = "Update project documentation" if parent else ROOT_MESSAGE
        args = git + ["commit-tree", tree]
        if parent:
            args += ["-p", parent]
        commit = _run(args + ["-m", message], env=env).stdout.strip()
        # A regular push rejects a concurrent writer; no user's local refs/index change.
        _run(git + ["push", "origin", f"{commit}:refs/heads/gh-pages"], env=env)
        return {"commit": commit, "previousCommit": parent}


class PagesAPIError(ValueError):
    """PT-BR: Falha remota com diagnóstico de acesso. EN: Remote failure with access diagnostics."""

    def __init__(self, message, missing=False):
        """PT-BR: Guarda o sinal HTTP 404. EN: Retain an HTTP 404 signal."""
        super().__init__(message)
        self.missing = missing


def _api(repo, suffix="", method="GET", payload=None):
    """PT-BR: Usa a autenticação existente do gh, inclusive Enterprise.

    EN: Use existing gh authentication, including Enterprise hosts.
    """
    endpoint = f"repos/{repo['owner']}/{repo['repository']}/pages{suffix}"
    args = ["gh", "api", "--hostname", repo["host"], "--method", method, endpoint]
    if payload is not None:
        args += ["--input", "-"]
    result = _run(args, input=json.dumps(payload) if payload is not None else None, check=False)
    if result.returncode:
        raise PagesAPIError("GitHub Pages API failed: " + result.stderr.strip()[-1800:], "HTTP 404" in result.stderr)
    return json.loads(result.stdout) if result.stdout.strip() else {}


def _save(root, data):
    """PT-BR: Persiste estado sem credenciais. EN: Persist state without credentials."""
    from core import safe_path
    path = safe_path(root, ".documentation/deployment.json")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix="deployment-", suffix=".tmp", delete=False) as output:
            temporary = Path(output.name)
            output.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def pages_publish(root, remote=None):
    """PT-BR: Publica e configura Pages; sucesso exige verificação ao vivo.

    EN: Push and configure Pages; success requires live verification.
    """
    from core import workspace, verify_build
    root = workspace(str(root))
    plan = pages_plan(root, remote)
    if plan["status"] != "prepared":
        raise ValueError(plan["message"])
    # Check credentials/configuration before pushing whenever possible.
    try:
        current = _api(plan)
    except PagesAPIError as error:
        if not error.missing:
            raise
        current = None
    verify_build(root)
    published = _publish_git(root, root / ".documentation/site", plan["remote"])
    state = {**plan, **published, "status": "pushed"}
    _save(root, state)
    try:
        payload = {"source": {"branch": "gh-pages", "path": "/"}, "build_type": "legacy"}
        _api(plan, method="POST" if current is None else "PUT", payload=payload)
        state["status"] = "configured"
        _save(root, state)
        _api(plan, "/builds", "POST")
        return pages_status(root, plan["remote"])
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        state.update(status="configuration_failed", error=str(error),
                     message="The branch was pushed; fix Pages access/configuration and retry. Deployment is not verified.")
        _save(root, state)
        return state


def pages_status(root, remote=None):
    """PT-BR: Distingue push, build e artefato servido ao público.

    EN: Distinguish a push, a build and the artifact actually served.
    """
    from core import workspace, safe_path, verify_build
    root = workspace(str(root))
    selected = _select(root, remote)
    if selected["status"] != "selected":
        return selected
    path = safe_path(root, ".documentation/deployment.json")
    state = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    if state.get("identity") != selected["identity"]:
        state = {}
    verify_build(root)
    settings = _api(selected)
    source = settings.get("source", {})
    if settings.get("build_type") == "workflow" or source.get("branch") != "gh-pages" or source.get("path") != "/":
        return {**selected, "status": "configuration_required", "source": source}
    latest = _api(selected, "/builds/latest")
    result = {**selected, "status": "building", "url": settings.get("html_url"),
              "buildStatus": latest.get("status"), "commit": latest.get("commit"),
              "expectedCommit": state.get("commit")}
    if latest.get("status") == "errored":
        return {**result, "status": "failed", "error": latest.get("error")}
    if latest.get("status") != "built" or not state.get("commit") or latest.get("commit") != state.get("commit"):
        return result
    url = settings.get("html_url", "")
    if urlparse(url).scheme != "https":
        return {**result, "status": "live_verification_pending", "error": "Pages did not return an HTTPS site URL."}
    try:
        request = Request(url.rstrip("/") + "/manifest.json", headers={"Cache-Control": "no-cache"})
        with urlopen(request, timeout=15) as response:
            content = response.read(2_000_001)
        expected = hashlib.sha256((root / ".documentation/site/manifest.json").read_bytes()).hexdigest()
        if hashlib.sha256(content).hexdigest() != expected or expected != state.get("artifactDigest"):
            return {**result, "status": "live_verification_pending", "error": "The served manifest does not match the current verified artifact."}
    except (OSError, ValueError) as error:
        return {**result, "status": "live_verification_pending", "error": str(error)}
    result["status"] = "deployed"
    return result
