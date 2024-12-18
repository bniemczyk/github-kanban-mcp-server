import { exec } from 'child_process';
import { promisify } from 'util';

export const execAsync = promisify(exec);

/**
 * 一時ファイルにMarkdownコンテンツを書き込む
 * @param content Markdownコンテンツ
 * @param filePath 一時ファイルのパス
 */
export async function writeToTempFile(content: string, filePath: string, workingDir?: string): Promise<void> {
  const fullPath = workingDir ? `${workingDir}/${filePath}` : filePath;
  await execAsync(`echo "${content.replace(/"/g, '\\"')}" > ${fullPath}`);
}

/**
 * 一時ファイルを削除する
 * @param filePath 一時ファイルのパス
 * @param workingDir 作業ディレクトリ（オプション）
 */
export async function removeTempFile(filePath: string, workingDir?: string): Promise<void> {
  try {
    const fullPath = workingDir ? `${workingDir}/${filePath}` : filePath;
    await execAsync(`rm ${fullPath}`);
  } catch (error) {
    console.error('Failed to remove temporary file:', error);
  }
}
