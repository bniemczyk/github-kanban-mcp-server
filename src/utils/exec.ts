import { exec } from 'child_process';
import { promisify } from 'util';

export const execAsync = promisify(exec);

/**
 * 一時ファイルにMarkdownコンテンツを書き込む
 * @param content Markdownコンテンツ
 * @param filePath 一時ファイルのパス
 */
export async function writeToTempFile(content: string, filePath: string): Promise<void> {
  await execAsync(`echo "${content.replace(/"/g, '\\"')}" > ${filePath}`);
}

/**
 * 一時ファイルを削除する
 * @param filePath 一時ファイルのパス
 */
export async function removeTempFile(filePath: string): Promise<void> {
  try {
    await execAsync(`rm ${filePath}`);
  } catch (error) {
    console.error('Failed to remove temporary file:', error);
  }
}
