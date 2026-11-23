"""PT-BR: Crie um site isolado com o runtime distribuído.

EN: Create an isolated site using the delivered runtime.
"""
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(sys.argv[1]).resolve() / 'runtime'))
import core

root = Path(sys.argv[2]).resolve()
(root / 'src').mkdir()
(root / 'src/greeting.py').write_text('''"""PT-BR: Fornece saudações. EN: Provide greetings."""

def greeting():
    """PT-BR: Retorna a saudação configurada. EN: Return the configured greeting."""
    return "hello"
''', encoding='utf8')
core.init_project(root, 'Greeting Kit', 'library', ['src'])
data = core.load_project(root)
data['draft'] = False
for page in data['pages']:
    page['sources'] = [{'path':'src/greeting.py','line':3}]
    page['sections'][0]['blocks'] = [
        {'type':'paragraph','text':{'en':'The greeting function returns the configured greeting without changing application state.','pt-BR':'A função greeting retorna a saudação configurada sem alterar o estado da aplicação.'}},
        {'type':'code','language':'python','caption':{'en':'Read a greeting','pt-BR':'Leia uma saudação'},'code':'from greeting import greeting\nprint(greeting())'},
    ]
data['features'] = [{'id':'greeting','name':{'en':'Read a greeting','pt-BR':'Leia uma saudação'},'sources':[{'path':'src/greeting.py','line':3}],'pages':['quickstart']}]
data['audit'] = {'featuresReviewed':True,'reviewedSourceFingerprint':core.map_project(root,data)['sourceFingerprint']}
core.write_json(root/core.CONFIG,data)
print(json.dumps(core.build(root)))
