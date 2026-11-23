# Inteligência de código e fluxos avançados

## Recupere contexto atual de código

1. Comece com contextory_workspace_get e informe projectId em cada chamada relacionada. A seleção da interface nunca altera o projeto padrão local do servidor do agente.
2. Chame contextory_code_context_get com a tarefa real, caminhos conhecidos e budgetTokens limitado. Leia o código atual citado.
3. Use architecture para orientação, impact para dependências/chamadores, path para conexões e flow trace para chamadas/desvios detalhados. Use search para decisões anteriores e inspecione o estado e revisão atuais.
4. Consulte novamente o código relevante depois de salvar. Os grafos de arquivos salvos são atualizados automaticamente; sobreposições de fluxo de buffers não salvos são separadas. Pagine ou refine resultados truncados.

![Mapa de subsistemas, explorador de arquivos e inspetor de código.](../assets/architecture-explorer.png)

Explorador Architecture capturado do Contextory.

Argumentos de contexto; substitua o ID do projeto

```json
{ "projectId": "PROJECT-ID", "query": "How are retries bounded?", "paths": ["src"], "budgetTokens": 3000 }
```

Qualifique definições ambíguas como source:path#qualifiedName. O contexto aceita 512–6000 tokens estimados e limita os bytes UTF-8 do JSON a três vezes a estimativa. Vínculos do grafo e referências de testes não comprovam execução observada nem cobertura comportamental completa.

## Compare um repositório de referência

1. Em Architecture, escolha Add reference e selecione um diretório local absoluto autorizado. Cada projeto aceita até oito referências.
2. Escolha esse Codebase ou informe o codebaseId retornado nas chamadas de código/fluxo. Preserve a identidade e raiz em cada citação.
3. Detach reference remove o registro preservando os arquivos. Registrar e inspecionar não autoriza implementação em nenhum dos repositórios.

Inspecionar uma referência escolhida explicitamente

```powershell
node dist/contextory.mjs reference-add C:/Sources/LegacyApp --root C:/Projects/NewApp --name "Legacy app"
node dist/contextory.mjs references --root C:/Projects/NewApp
node dist/contextory.mjs architecture --root C:/Projects/NewApp --codebase ref-ID
```

Use os IDs reais retornados. Referências têm projeções de código separadas, são atualizadas nas consultas e não incluem registros de trabalho do projeto ativo. Raízes ausentes geram erro explícito. A busca de referências é lexical; o modo exclusivamente semântico não está disponível.

## Configure extração e cobertura

contextory.project.json opcional

```json
{
  "schemaVersion": 1, "name": "Checkout",
  "include": ["src/**", "tests/**", "docs/**", "*.json"],
  "exclude": ["src/generated/**"], "entryPoints": ["src/main.ts"],
  "maxFiles": 2000, "maxBytes": 16777216
}
```

TypeScript/JavaScript usa o compilador TypeScript; Python usa análise AST isolada sem importar módulos do workspace. Despacho dinâmico, injeção de frameworks, implementação de dependências e linguagens não suportadas permanecem lacunas. O limite padrão é de 2.000 arquivos/16 MiB, até 512 KiB por arquivo; limites configuráveis chegam a 10.000 arquivos/64 MiB. Os limites de extração e truncamentos são informados.

## Importe dados opcionais do Graphify

Argumentos de atualização/importação

```json
{ "graphifyPath": "graphify-out/graph.json" }
```

Passe esses argumentos a contextory_code_index_refresh. O importador confere schema, tamanho do JSON, IDs, destinos das arestas e caminhos locais incluídos; falhas preservam a importação anterior. Gere e importe novamente o grafo completo quando uma fonte citada mudar, desaparecer ou for excluída. O Graphify é opcional e seus limites de proveniência/precisão continuam visíveis.

## Explicações do projeto

Use Tools > Documentation para consultar explicações vinculadas às fontes e ao trabalho rastreado. A capacidade de documentação/Carbon incluída dispensa plugin externo; a geração acontece sob demanda.

[Leia o guia de documentação de projetos](documentation.md)

## Fontes

- src/codebase/queries.ts
- src/codebase/extract.ts
- src/codebase/references.ts
- src/codebase/import.ts
- src/codebase/config.ts
- src/analysis/engine.ts
- tests/integration/codebase.test.ts
- tests/integration/references.test.ts

