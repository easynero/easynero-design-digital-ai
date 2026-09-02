# Design Digital AI

Plugin privado para usar ferramentas criativas do Google dentro do projeto Design Digital. O pacote combina uma skill de direção de uso com um servidor MCP remoto para geração e edição de imagens, vídeo, áudio e análise multimodal.

## Recursos

- Imagens com perfis Nano Banana equilibrado, premium e rápido.
- Geração e edição de vídeo com Gemini Omni e Veo.
- Análise de imagens, vídeos, áudios, PDFs e arquivos de texto.
- Geração de voz com Gemini TTS.
- Continuidade de edições por `interaction_id`.
- Proteção do endpoint MCP por Bearer token.

## Estrutura

- `.codex-plugin/plugin.json`: manifesto do plugin.
- `.mcp.json`: conexão com o servidor MCP publicado.
- `skills/design-digital-ai/`: instruções de uso para o agente.
- `server/`: aplicação Next.js publicada na Vercel.

## Servidor

Produção: <https://design-digital-ai.vercel.app>

Endpoint MCP: <https://design-digital-ai.vercel.app/api/mcp>

### Variáveis da Vercel

Copie `server/.env.example` e configure os valores apenas na Vercel:

- `GEMINI_API_KEY`: chave da API Google Gemini.
- `MCP_ACCESS_TOKEN`: token privado usado pelo cliente MCP.
- `BLOB_READ_WRITE_TOKEN`: necessário para URLs persistentes de vídeo e áudio.
- `PUBLIC_BASE_URL`: URL pública estável do servidor.

Nunca envie valores secretos ao GitHub.

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
