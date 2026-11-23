"""PT-BR: Execute o runtime incluído no projeto explicitamente selecionado.

EN: Run the bundled runtime in the explicitly selected project only.
"""
import json
import sys
from pathlib import Path

if sys.version_info < (3, 11):
    raise SystemExit('Python 3.11+ is required for project documentation.')
sys.path.insert(0, str(Path(__file__).resolve().parent / 'runtime'))
import server

try:
    request = json.load(sys.stdin)
    root = Path(request['workspace']).resolve(strict=True)
    result = server.call_tool(request['tool'], {**request['arguments'], 'workspace': str(root)}, (root,))
    print(json.dumps({'result': result}, ensure_ascii=False))
except Exception as error:
    print(json.dumps({'error': str(error)}, ensure_ascii=False))
    sys.exit(1)
