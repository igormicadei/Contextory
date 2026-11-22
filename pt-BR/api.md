# Referência da API MCP

## Leia o contrato anunciado

O Contextory 0.7.0 define 36 ferramentas. Os schemas Zod a seguir foram extraídos pelo analisador TypeScript do código salvo sem executar a aplicação. Eles preservam obrigatoriedade, opcionais, padrões e intervalos. tools/list do MCP em execução é autoritativo para a versão instalada. contextory_catalog_review é exclusivo da interface humana mesmo quando seu contrato está visível.

Toda ferramenta também aceita projectId e workspaceId opcionais. O escopo omitido/current permanece no projeto do servidor. Ferramentas de código também aceitam codebaseId opcional onde o schema/contrato anunciado permitir. Linhas/caracteres nas referências das ferramentas do produto começam em zero; linhas das citações da documentação começam em um.

Aliases compartilhados do schema

```typescript
const id = z.string().min(1).max(160);
const text = z.string().min(1).max(12000);
const operationId = z.string().min(8).max(160);
const expectedRevision = z.number().int().positive().optional();
const source = z.object({
  path: z.string().min(1).max(2000),
  line: z.number().int().nonnegative().optional(),
  character: z.number().int().nonnegative().optional(),
  symbol: z.string().max(500).optional(),
});
const lease = { specId: id, leaseId: id };
const category = z.enum(["file", "rule", "feature", "ui"]);
export const catalogContent = z
  .object({
    category,
    title: z.string().trim().min(1).max(300),
    description: text,
    sources: z.array(source).min(1).max(30),
    tests: z.array(source).max(30).default([]),
    testGap: z.string().trim().min(1).max(2000).optional(),
    ui: z
      .object({
        location: text,
        element: text,
        trigger: text,
        behavior: text,
        states: text,
      })
      .optional(),
  })
  .superRefine((p, ctx) => {
    if (p.category === "file" && p.sources.length !== 1)
      ctx.addIssue({
        code: "custom",
        message: "A file entry describes exactly one source file.",
      });
    if (p.category === "ui" && !p.ui)
      ctx.addIssue({
        code: "custom",
        message:
          "UI contracts need location, element, trigger, behavior and states.",
      });
    if (p.category !== "file" && !p.tests.length && !p.testGap)
      ctx.addIssue({
        code: "custom",
        message: "Behavior needs test links or an explicit testGap.",
      });
  });
const limits = z
  .object({
    callDepth: z.number().int().min(0).max(12).optional(),
    nodes: z.number().int().min(5).max(500).optional(),
    edges: z.number().int().min(5).max(1000).optional(),
    targetsPerCall: z.number().int().min(1).max(30).optional(),
    timeoutMs: z.number().int().min(100).max(10000).optional(),
  })
  .optional();

```

## Revisões, novas tentativas e conclusão

Leia o registro antes de editar. Registros existentes exigem expectedRevision atual. Use operationId novo (8–160 caracteres) para nova mutação; repita operações incertas apenas com entrada/ID originais exatos. Escritas de implementação exigem lease ativo da sessão associada, salvo operações documentadas de configuração/release. As permissões nativas continuam válidas.

[Sequência de evidências e conclusão](outcomes.md)

## Reconstruir hooks

Repara hooks gerenciados de um agente; exige serviço disponível e preserva confiança nativa.

Schema de entrada · src/contracts/tools.ts:60

```typescript
// contextory_hooks_rebuild
z.object({
      operationId,
      provider: z.enum(["codex", "claude", "bob"]),
    })
```

## Consultar workspace

Descobre identidades de projetos/workspaces e estado opcional de pedidos coordenados.

Schema de entrada · src/contracts/tools.ts:68

```typescript
// contextory_workspace_get
z.object({ groupId: id.optional() })
```

## Criar pedido entre projetos

Cria pedidos locais vinculados nos projetos escolhidos com recuperação de criação parcial.

Schema de entrada · src/contracts/tools.ts:73

```typescript
// contextory_workspace_request_create
z.object({
      operationId,
      projectIds: z.array(id).min(2).max(16),
      title: z.string().trim().min(1).max(300),
      description: text,
    })
```

## Consultar versões

Lê estado global de versões, commits e registros semânticos com paginação independente.

Schema de entrada · src/contracts/tools.ts:83

```typescript
// contextory_version_get
z.object({
      releaseId: id.optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## Preparar release

Prepara um plano de release sem editar fontes; dispensa lease de especificação.

Schema de entrada · src/contracts/tools.ts:92

```typescript
// contextory_release_prepare
z.object({
      operationId,
      bump: z.enum(["auto", "patch", "minor", "major"]).default("auto"),
      version: z.string().max(100).optional(),
    })
```

## Alterar release

Aplica, publica, recupera ou cancela um plano autorizado usando a revisão atual.

Schema de entrada · src/contracts/tools.ts:101

```typescript
// contextory_release_change
z.object({
      operationId,
      id,
      expectedRevision: z.number().int().positive(),
      action: z.enum(["apply", "publish", "recover", "cancel"]),
    })
```

## Exportar projeto

Pagina dados armazenados para documentação preservando sequência, snapshots e proveniência.

Schema de entrada · src/contracts/tools.ts:111

```typescript
// contextory_project_export
z.object({
      section: z
        .enum([
          "overview",
          "records",
          "revisions",
          "history",
          "relationships",
          "code_files",
          "code_nodes",
          "code_edges",
          "code_imports",
          "jobs",
          "usage",
          "artifacts",
        ])
        .default("overview"),
      entityId: id.optional(),
      artifact: z.string().min(1).max(200).optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## Consultar catálogo

Lê definições, propostas pendentes, atualização das fontes e inventário opcional.

Schema de entrada · src/contracts/tools.ts:137

```typescript
// contextory_catalog_get
z.object({
      category: category.optional(),
      path: z.string().max(2000).optional(),
      query: z.string().max(4000).optional(),
      inventory: z.boolean().default(false),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## Alterar catálogo

Sob lease, cria observações ou propõe substituições/aposentadorias exatas de definições.

Schema de entrada · src/contracts/tools.ts:149

```typescript
// contextory_catalog_change
z.object({
      operationId,
      ...lease,
      action: z.enum(["create", "revise", "retire"]),
      id: id.optional(),
      expectedRevision,
      content: catalogContent.optional(),
      reason: text,
      migrationId: id.optional(),
    })
```

## Revisar catálogo

Somente interface humana: aprova ou rejeita revisão exata de definição/proposta; agentes não aprovam.

Schema de entrada · src/contracts/tools.ts:163

```typescript
// contextory_catalog_review
z.object({
      operationId,
      id,
      expectedRevision: z.number().int().positive(),
      action: z.enum(["approve", "reject"]),
      reason: text,
    })
```

## Migrar catálogo

Inicia descrições em lotes retomáveis; candidatos varridos ainda precisam de revisão semântica.

Schema de entrada · src/contracts/tools.ts:174

```typescript
// contextory_catalog_migrate
z.object({
      operationId,
      ...lease,
      migrationId: id.optional(),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## Consultar contexto

Lê contratos, trabalho ativo, receitas e orientações antes da implementação.

Schema de entrada · src/contracts/tools.ts:184

```typescript
// contextory_context_get
z.object({ specId: id.optional() })
```

## Consultar entidade

Lê revisão atual ou imutável, página de filhos, job ou página de artefato.

Schema de entrada · src/contracts/tools.ts:189

```typescript
// contextory_entity_get
z.object({
      id,
      revision: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## Consultar histórico

Pagina auditoria; usa nextBefore como before para continuar.

Schema de entrada · src/contracts/tools.ts:199

```typescript
// contextory_history_get
z.object({
      entityId: id.optional(),
      before: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(100).default(40),
    })
```

## Alterar pedido

Cria ou revisa um pedido autorizado preservando a intenção original.

Schema de entrada · src/contracts/tools.ts:208

```typescript
// contextory_request_change
z.object({
      operationId,
      action: z.enum(["create", "revise"]),
      id: id.optional(),
      expectedRevision,
      title: z.string().min(1).max(300),
      description: text,
      reason: text.optional(),
    })
```

## Alterar especificação

Cria marcos/especificações, revisa/reabre/bloqueia/cancela ou solicita conclusão verificada.

Schema de entrada · src/contracts/tools.ts:221

```typescript
// contextory_spec_change
z.object({
      operationId,
      action: z.enum([
        "milestone",
        "create",
        "revise",
        "reopen",
        "complete",
        "block",
        "cancel",
      ]),
      id: id.optional(),
      parentId: id.optional(),
      expectedRevision,
      title: z.string().min(1).max(300).optional(),
      description: text.optional(),
      criteria: z.array(z.string().min(1).max(2000)).min(1).max(50).optional(),
      paths: z.array(z.string().max(2000)).max(100).optional(),
      dependencies: z.array(id).max(50).optional(),
      reason: text.optional(),
    })
```

## Associar sessão

Registra sessão do agente; usa o nativeSessionId exato do hook ou o omite.

Schema de entrada · src/contracts/tools.ts:246

```typescript
// contextory_session_attach
z.object({ operationId, nativeSessionId: id.optional() })
```

## Consultar uso

Lê modelos/tokens observados; contagens ausentes continuam indisponíveis.

Schema de entrada · src/contracts/tools.ts:251

```typescript
// contextory_usage_get
z.object({
      entityId: id.optional(),
      provider: z.enum(["codex", "claude", "bob"]).optional(),
      nativeSessionId: z.string().min(1).max(200).optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(20),
    })
```

## Gerenciar lease

Obtém, renova ou libera o lease de implementação com uma sessão associada.

Schema de entrada · src/contracts/tools.ts:262

```typescript
// contextory_spec_lease
z.object({
      operationId,
      specId: id,
      expectedRevision,
      action: z.enum(["claim", "renew", "release"]),
      sessionId: id,
      leaseId: id.optional(),
    })
```

## Registrar problema

Registra problema, impacto e resolução; bloqueios não resolvidos impedem a conclusão.

Schema de entrada · src/contracts/tools.ts:274

```typescript
// contextory_finding_record
z.object({
      operationId,
      ...lease,
      id: id.optional(),
      expectedRevision,
      title: z.string().min(1).max(300),
      observation: text,
      impact: text,
      resolution: text.optional(),
      status: z.enum(["open", "resolved", "deferred"]),
      blocking: z.boolean().default(true),
      sources: z.array(source).max(30).default([]),
    })
```

## Registrar decisão

Registra escolha, justificativa, alternativas e consequências com fontes.

Schema de entrada · src/contracts/tools.ts:291

```typescript
// contextory_decision_record
z.object({
      operationId,
      ...lease,
      title: z.string().min(1).max(300),
      choice: text,
      rationale: text,
      alternatives: z.string().max(12000).default("None material"),
      consequences: text,
      supersedes: id.optional(),
      sources: z.array(source).max(30).default([]),
    })
```

## Registrar evidência

Registra evidência externa/manual relatada, separada de verificações independentes.

Schema de entrada · src/contracts/tools.ts:306

```typescript
// contextory_evidence_record
z.object({
      operationId,
      ...lease,
      title: z.string().min(1).max(300),
      detail: text,
      criteria: z.array(id).min(1).max(50),
      result: z.enum(["passed", "failed", "not_run"]),
      command: z.string().max(4000).optional(),
    })
```

## Executar verificação

Executa receita configurada de forma independente e retorna um job para acompanhamento.

Schema de entrada · src/contracts/tools.ts:319

```typescript
// contextory_check_run
z.object({
      operationId,
      ...lease,
      recipeId: id,
      criteria: z.array(id).min(1).max(50),
    })
```

## Enviar resultado

Envia evidências e relatório persistente; ainda é necessária a ação complete separada.

Schema de entrada · src/contracts/tools.ts:329

```typescript
// contextory_outcome_submit
z.object({
      operationId,
      ...lease,
      expectedRevision: z.number().int().positive(),
      summary: text,
      issuesSummary: text,
      decisionsSummary: text,
      limitations: text,
      report: text,
      changelog: z.string().min(1).max(2000),
      catalog: z
        .object({ recordIds: z.array(id).max(200), explanation: text })
        .optional(),
      criteria: z
        .array(
          z.object({
            criterionId: id,
            evidenceIds: z.array(id).min(1).max(30),
          }),
        )
        .min(1)
        .max(50),
      commits: z
        .array(z.string().regex(/^[a-f0-9]{40,64}$/))
        .max(100)
        .default([]),
    })
```

## Buscar

Busca código e memória do projeto por recuperação lexical, semântica ou híbrida.

Schema de entrada · src/contracts/tools.ts:360

```typescript
// contextory_search
z.object({
      codebaseId: id.optional(),
      query: z.string().min(1).max(4000),
      mode: z.enum(["lexical", "semantic", "hybrid"]).default("hybrid"),
      limit: z.number().int().min(1).max(20).default(5),
    })
```

## Consultar contexto de código

Recupera contexto atual de código/tarefa ordenado com caminhos e orçamento limitado.

Schema de entrada · src/contracts/tools.ts:370

```typescript
// contextory_code_context_get
z.object({
      codebaseId: id.optional(),
      query: z.string().min(1).max(4000),
      paths: z.array(z.string().max(2000)).max(20).default([]),
      specId: id.optional(),
      budgetTokens: z.number().int().min(512).max(6000).default(3000),
    })
```

## Consultar arquitetura

Lê subsistemas, dependências, entradas e cobertura; refresh usa true por padrão.

Schema de entrada · src/contracts/tools.ts:381

```typescript
// contextory_code_architecture_get
z.object({
      codebaseId: id.optional(),
      refresh: z.boolean().default(true),
    })
```

## Consultar caminho

Explica um caminho indexado limitado entre duas raízes de código/registros.

Schema de entrada · src/contracts/tools.ts:389

```typescript
// contextory_code_path_get
z.object({
      codebaseId: id.optional(),
      from: z.string().min(1).max(2500),
      to: z.string().min(1).max(2500),
      direction: z.enum(["forward", "both"]).default("both"),
      maxDepth: z.number().int().min(1).max(10).default(6),
    })
```

## Atualizar índice

Atualiza a projeção de código ou valida/importa dados opcionais Graphify.

Schema de entrada · src/contracts/tools.ts:400

```typescript
// contextory_code_index_refresh
z.object({
      codebaseId: id.optional(),
      graphifyPath: z.string().min(1).max(2000).optional(),
    })
```

## Listar repositórios

Lista o projeto atual e suas referências isoladas somente leitura.

Schema de entrada · src/contracts/tools.ts:408

```typescript
// contextory_codebase_list
z.object({})
```

## Alterar referência

Registra ou desconecta uma referência local autorizada; preserva as fontes.

Schema de entrada · src/contracts/tools.ts:413

```typescript
// contextory_codebase_change
z
      .object({
        operationId,
        action: z.enum(["add", "remove"]),
        root: z.string().min(1).max(2000).optional(),
        name: z.string().trim().min(1).max(100).optional(),
        codebaseId: id.optional(),
      })
      .refine(
        (p) => (p.action === "add" ? Boolean(p.root) : Boolean(p.codebaseId)),
        "Add requires root; remove requires codebaseId.",
      )
```

## Alterar relação

Vincula registros ou locais de código com relação tipada e justificativa.

Schema de entrada · src/contracts/tools.ts:429

```typescript
// contextory_relationship_change
z.object({
      operationId,
      from: id,
      to: id.optional(),
      source: source.optional(),
      kind: z.enum(["implements", "resolves", "validated_by", "related_to"]),
      rationale: text,
    })
```

## Consultar impacto

Percorre relações de código/registros com direção, profundidade e tamanho limitados.

Schema de entrada · src/contracts/tools.ts:441

```typescript
// contextory_impact_get
z.object({
      codebaseId: id.optional(),
      id: z.string().min(1).max(2500),
      direction: z.enum(["forward", "reverse", "both"]).default("reverse"),
      depth: z.number().int().min(1).max(10).default(5),
      limit: z.number().int().min(1).max(200).default(50),
    })
```

## Traçar fluxo

Traça chamadas/fluxo limitados a partir de símbolo ou posição.

Schema de entrada · src/contracts/tools.ts:452

```typescript
// contextory_flow_trace
z.object({
      codebaseId: id.optional(),
      root: z.object({
        path: z.string().min(1).max(2000),
        position: z
          .object({
            line: z.number().int().nonnegative(),
            character: z.number().int().nonnegative(),
          })
          .optional(),
        symbol: z.string().max(500).optional(),
        start: z.enum(["cursor", "function"]).optional(),
      }),
      view: z.enum(["calls", "flow"]).default("calls"),
      direction: z.enum(["outgoing", "incoming"]).default("outgoing"),
      limits,
    })
```

## Expandir fluxo

Pagina grafo armazenado ou expande fronteira validando o snapshot de código.

Schema de entrada · src/contracts/tools.ts:473

```typescript
// contextory_flow_expand
z.object({
      codebaseId: id.optional(),
      graphId: id,
      snapshotId: id,
      nodeId: id.optional(),
      offset: z.number().int().nonnegative().default(0),
      limit: z.number().int().min(1).max(50).default(30),
      limits,
    })
```

## Exportar relatório

Exporta relatório, changelog de trabalho concluído ou JSON de um pedido por artefato.

Schema de entrada · src/contracts/tools.ts:486

```typescript
// contextory_report_export
z.object({
      format: z.enum(["report", "changelog", "json"]).default("report"),
      requestId: id,
    })
```

## Módulos, classes, métodos e funções

### scripts/documentation/build.py:1 — <module>

Assinatura e localização

```python
scripts/documentation/build.py
```

Gera os guias com o runtime e os layouts padrão da skill de documentação.

### scripts/documentation/build.py:26 — Links

Assinatura e localização

```python
class Links(HTMLParser)
```

Coleta destinos locais e âncoras para verificar o HTML gerado.

### scripts/documentation/build.py:32 — Links.__init__

Assinatura e localização

```python
__init__(self)
```

Inicia coleções por página.

### scripts/documentation/build.py:38 — Links.handle_starttag

Assinatura e localização

```python
handle_starttag(self, tag, attrs)
```

Registra links e IDs sem executar scripts.

### scripts/documentation/build.py:50 — write_managed

Assinatura e localização

```python
write_managed(site, relative, content)
```

Grava um artefato dentro do site e devolve seu hash de bytes.

### scripts/documentation/build.py:62 — verify_vendor

Assinatura e localização

```python
verify_vendor()
```

Recusa alterações no runtime e nos layouts padrão copiados da skill.

### scripts/documentation/build.py:73 — root_landing

Assinatura e localização

```python
root_landing(name)
```

Encaminhar a raiz do site para o guia padrão sem oferecer uma escolha de idioma.

### scripts/documentation/build.py:91 — compatibility

Assinatura e localização

```python
compatibility()
```

Preserva URLs e arquivos legados sem alterar o shell Carbon padrão.

### scripts/documentation/build.py:128 — check_links

Assinatura e localização

```python
check_links()
```

Confere páginas, imagens, exports e âncoras locais com o site já gerado.

### scripts/documentation/build.py:159 — export_markdown

Assinatura e localização

```python
export_markdown()
```

Atualiza apenas guias explicitamente gerenciados e preserva os originais no arquivo.

### scripts/documentation/build.py:174 — export_markdown.repository_link

Assinatura e localização

```python
repository_link(match)
```

Ajusta links do export para o caminho do guia no repositório.

### scripts/documentation/build.py:198 — consumer_bundle

Assinatura e localização

```python
consumer_bundle()
```

Gera o bundle de consulta e inclui a licença MIT do runtime distribuído.

### scripts/documentation/build.py:221 — main

Assinatura e localização

```python
main()
```

Executa mapa/validação/build/export/preview sem publicar nem aprovar fontes.

## Fontes

- src/contracts/tools.ts
- src/service/application.ts
- src/service/server.ts

