# Instalação e atualização

## Confira o ambiente

| Requisito | Finalidade |
| --- | --- |
| Windows; pastas locais de projeto confiáveis | Ambiente qualificado do editor, incluindo até 16 pastas não aninhadas |
| VS Code 1.96+ ou IBM Bob | Host da extensão; verificações publicadas usaram VS Code 1.145.3 e API 1.126.0 do Bob |
| Node.js 24+ | Executa o serviço isolado com node:sqlite |
| Um agente nativo instalado separadamente | Chat e autenticação do Codex, Claude Code ou IBM Bob |
| Python 3.10+ (opcional) | Analisa código e fluxo Python |

Conferir runtimes instalados

```powershell
node --version
python --version
```

## Instale o VSIX

1. Baixe contextory-workspace-0.8.0.vsix e o arquivo .sha256 na release v0.8.0.
2. Compare o checksum do pacote baixado com o checksum da release.
3. Em Extensions, abra o menu …, selecione Install from VSIX… e escolha o arquivo baixado. Recarregue se solicitado.
4. Abra um projeto local confiável. O serviço e os agentes configurados iniciam em segundo plano; abra o Contextory quando quiser inspecionar o trabalho. O projeto inicial não contém pedidos.

[Baixar a versão 0.8.0](https://github.com/igormicadei/Contextory/releases/tag/v0.8.0)

Verificar e instalar o pacote da release

```powershell
(Get-FileHash -Algorithm SHA256 .\contextory-workspace-0.8.0.vsix).Hash.ToLowerInvariant()
Get-Content .\contextory-workspace-0.8.0.sha256
code --install-extension .\contextory-workspace-0.8.0.vsix
```

Usuários finais não precisam de npm, Rust, servidor de banco de dados ou modelo de embeddings. Instale e autentique o agente nativo pela interface dele. Reinicie o editor após instalar o Node se o PATH ainda não tiver sido atualizado.

## Atualize, desconecte ou desinstale

- Para atualizar a mesma identidade da extensão, instale o novo VSIX, recarregue o editor e a sessão MCP nativa. Os registros existentes permanecem no armazenamento do editor.
- Para remover uma conexão, clique no controle verde do rodapé ou execute Contextory: Disconnect an Agent. Apenas entradas gerenciadas são removidas. Use o comando para uma conexão configurada cujo indicador esteja cinza.
- Antes de desinstalar, desconecte os agentes e faça backup do registro do projeto. Desinstale por Extensions; remova o armazenamento somente depois de preservar os registros necessários.
- Builds antigos com a identidade anterior do produto mantêm os registros no armazenamento original; a importação automática não está disponível. Desconecte o build antigo antes da substituição.

[Referência de armazenamento e configuração](reference.md)

## Fontes

- package.json
- src/extension.ts
- src/providers/registration.ts
- src/providers/clients.ts

