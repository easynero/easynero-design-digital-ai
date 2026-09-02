# Design Digital AI

Plugin privado para usar ferramentas criativas do Google dentro do projeto Design Digital. O pacote combina uma skill de direção de uso com um servidor MCP remoto para geração e edição de imagens, vídeo, áudio e análise multimodal.

## Recursos

- Imagens com perfis Nano Banana equilibrado, premium e rápido.
- Geração e edição de vídeo com Gemini Omni e Veo.
- Análise de imagens, vídeos, áudios, PDFs e arquivos de texto.
- Geração de voz com Gemini TTS.
- Continuidade de edições por `interaction_id`.
- Proteção do endpoint MCP por OAuth 2.1/Auth0, com Bearer token estático opcional para clientes diretos.

## Estrutura

- `.codex-plugin/plugin.json`: manifesto do plugin.
- `.mcp.json`: conexão com o servidor MCP publicado.
- `skills/design-digital-ai/`: instruções de uso para o agente.
- `server/`: aplicação Next.js publicada na Vercel.

## Servidor

Produção: <https://design-digital-ai-nine.vercel.app>

Endpoint MCP: <https://design-digital-ai-nine.vercel.app/api/mcp>

### Variáveis da Vercel

Copie `server/.env.example` e configure os valores apenas na Vercel:

- `GEMINI_API_KEY`: chave da API Google Gemini.
- `MCP_ACCESS_TOKEN`: token privado opcional para clientes MCP diretos/CI; não é usado pelo OAuth do ChatGPT.
- `BLOB_READ_WRITE_TOKEN`: necessário para URLs persistentes de vídeo e áudio.
- `PUBLIC_BASE_URL`: URL pública estável do servidor.
- `AUTH0_DOMAIN`: domínio do tenant Auth0.
- `AUTH0_AUDIENCE`: identificador da API criada no Auth0 (por padrão, a URL do MCP).
- `MCP_RESOURCE_URL`: identificador canônico protegido, normalmente `https://design-digital-ai-nine.vercel.app/api/mcp`.
- `MCP_REQUIRED_SCOPES`: permissões exigidas pelo MCP (por padrão, `creative:generate`).

Nunca envie valores secretos ao GitHub.

O endpoint de descoberta OAuth fica em `/.well-known/oauth-protected-resource`. Depois de alterar as configurações de autenticação, atualize a conexão do MCP no modo desenvolvedor do ChatGPT.

## Desenvolvimento

```bash
cd server
npm ci
npm run lint
npm run typecheck
npm run build
npm run dev
```

## Estado da versão

Versão inicial `0.1.0`. O plugin e o servidor compilam com Next.js 16 e TypeScript.
