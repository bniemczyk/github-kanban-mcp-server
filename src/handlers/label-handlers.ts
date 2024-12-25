import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { execAsync } from '../utils/exec.js';

/**
 * ランダムな16進数カラーコードを生成する
 */
export function generateRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * リポジトリ内の既存のラベルを取得する
 */
export async function getExistingLabels(repo: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      `gh label list --repo ${repo} --json name --jq '.[].name'`
    );
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Failed to get labels:', error);
    return [];
  }
}

/**
 * 新しいラベルを作成する
 */
export async function createLabel(repo: string, name: string): Promise<void> {
  const color = generateRandomColor().substring(1); // '#'を除去
  try {
    // エラーメッセージから既存ラベルかどうかを判断
    await execAsync(
      `gh label create "${name}" --repo ${repo} --color "${color}"`
    ).catch((error: Error) => {
      if (error.message.includes('already exists')) {
        // 既存のラベルの場合は正常終了
        return;
      }
      throw error;
    });
  } catch (error) {
    console.error(`Failed to create label ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to create label ${name}: ${(error as Error).message}`
    );
  }
}
