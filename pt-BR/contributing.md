# Compile, documente e contribua

## Prepare o desenvolvimento

Compilar e executar verificações do projeto

```powershell
npm ci
npx playwright install chromium
npm run check
```

Use Node.js 24+, npm e Python 3.10+ para testes de análise. npm run check executa verificação de drift das skills, TypeScript, build de produção, testes de backend e interface. Testes opcionais de modelo real precisam do runtime de embeddings preparado separadamente. A qualificação em hosts continua separada.

## Encontre o subsistema responsável

| Caminho | Responsabilidade |
| --- | --- |
| src/codebase | Projeção de código, extratores, atualização e consultas |
| src/service, src/contracts, src/core, src/storage | Contratos de serviço/ferramentas, trabalho rastreado e registro autoritativo |
| src/knowledge, src/analysis, src/editor | Memória com governança, análise de fluxo e integração com editor |
| src/releases | Observação Git, planos de release, adaptadores e tags recuperáveis |
| src/providers/clients.ts, src/agents/instructions.ts | Capacidades dos clientes e orientação portátil compartilhada |
| src/webview, media, tests | Interfaces, recursos e validação de backend/interface/host |

Edite as skills portáteis canônicas em skills/ e execute npm run skills:sync. Não edite o skill-content gerado nem cópias dos clientes de forma independente. Preserve código e configurações alheios.

## Mantenha o site de documentação padrão

Fluxo de documentação

```powershell
npm run docs:map
npm run docs:validate
npm run docs:build
npm run docs:integrations
npm run docs:preview
```

Edite .documentation/project.json: IDs de páginas/seções são compartilhados por en e pt-BR. Use blocos de texto simples com fontes, exemplos/legendas/textos alternativos traduzidos e capturas reais. O runtime software-documentation copiado gera seu shell Carbon padrão sem alterações, busca local, navegação responsiva, Markdown, llms.txt e exportações de corpus/API. O gerador precisa de Python 3.11+.

A raiz publicada abre diretamente a visão geral padrão em inglês, sem seletor de idioma. A troca de idioma continua disponível no cabeçalho de cada página.

Depois de revisar fontes alteradas, defina audit.reviewedSourceFingerprint com o valor atual de docs:map. O build recusa revisões obsoletas; ele nunca aprova alterações automaticamente. Use docs:migrate para inspecionar drift. Ele mostra a migração versionada suportada e recusa schemas desconhecidos.

A saída gerada é .documentation/site/. O manifesto gerenciado detecta entradas obsoletas e protege arquivos alheios. URLs existentes são mantidas por .documentation/redirects.json; fragmentos antigos continuam utilizáveis nas páginas de compatibilidade. Guias, planos, skills e registros de release originais em inglês ficam preservados em .documentation/legacy e são publicados como arquivos históricos para download. Os guias atuais em docs/ são exportações gerenciadas em inglês do mesmo corpus.

O workflow existente gera mudanças relevantes de main e atualiza gh-pages. Um build local não publica o site. Revise hashes atuais e o histórico da branch órfã antes de uma implantação autorizada e verifique o artefato no ar. Links no README indicam a URL pretendida até a implantação ser verificada.

## Empacote e qualifique alterações

Gerar o pacote local

```powershell
npm run package:vsix
```

O empacotamento atualiza VSIX e checksum da versão, mas não publica, altera a versão ou instala em um editor ativo. Mudanças no transporte/registro MCP precisam de verificações de integração headless/serviço/registro. Execute smoke tests em hosts reais quando houver alterações de host e registre com precisão limites dos chats nativos autenticados.

[Consultar evidências de qualificação](validation.md)

## Manter traduções da interface com segurança

Use package.nls.json e package.nls.pt-br.json nas contribuições da extensão; preserve IDs de comandos e chaves de configuração. Mensagens das webviews/do host usam tx para rótulos controlados ou a tag ui para HTML e mensagens com valores. O helper traduz o texto estático antes de inserir os valores. Não aplique tradução a títulos, descrições, motivos, código ou caminhos armazenados. IDs técnicos, seletores, classes CSS e coordenadas SVG não são localizados.

Traduzir o rótulo e preservar o registro

```typescript
import { ui } from "../i18n";
// escape preserves the existing HTML-escaping boundary.
return ui`<h1>Requests</h1><p>${escape(record.title)}</p>`;
```

Adicione a mensagem correspondente a src/i18n/pt-BR.json e preserve os marcadores de substitui??o numerados. npm run i18n:check extrai as mensagens declaradas e verifica a cobertura em português, a correspondência dos marcadores de substitui??o e os catálogos do manifesto; npm run check o inclui. Novos textos de agentes na interface seguem contextory_context_get.uiLanguage. Chaves de origem em inglês e identificadores de protocolos/schemas permanecem estáveis. A apresentação de atividades separa a ação localizada do assunto do registro preservado.

## Fontes

- package.json
- scripts/build.mjs
- scripts/package-vsix.mjs
- scripts/documentation/build.py
- .github/workflows/documentation.yml
- .gitattributes
- .vscodeignore
- tests/documentation/site.test.mjs
- skills/contextory-workflow/references/approvals-and-regressions.md
- src/i18n/index.ts
- src/i18n/pt-BR.json
- package.nls.json
- package.nls.pt-br.json
- src/extension.ts
- src/webview/document.ts
- src/service/application.ts
- src/service/server.ts
- src/hooks/launcher.ts
- tests/core/i18n.test.ts
- tests/integration/i18n.test.ts
- tests/ui/i18n.spec.ts
- scripts/check-localization.mjs
- scripts/localization-catalog.mjs
- tests/host/smoke.cjs

