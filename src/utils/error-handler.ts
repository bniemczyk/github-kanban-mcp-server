import { McpError } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCPサーバーのエラーハンドラー
 * @param error エラーオブジェクト
 */
export function handleServerError(error: unknown): void {
  console.error('[MCP Error]', error);
}

/**
 * プロセス終了時のクリーンアップハンドラー
 * @param server MCPサーバーインスタンス
 */
export function handleProcessTermination(server: { close: () => Promise<void> }): void {
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}
