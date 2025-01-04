import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * リポジトリ情報を取得する
 */
export interface RepoInfo {
  owner: string;
  repo: string;
}

/**
 * .gitディレクトリの存在を確認する
 */
async function checkGitDirectory(repoPath: string): Promise<void> {
  try {
    await fs.access(path.join(repoPath, '.git'));
  } catch (error) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `指定されたパス "${repoPath}" はGitリポジトリではありません。.gitディレクトリが見つかりません。`
    );
  }
}

/**
 * .git/configファイルの内容をパースしてremote.origin.urlを取得する
 */
async function parseGitConfig(configPath: string): Promise<string> {
  const content = await fs.readFile(configPath, 'utf-8');
  const lines = content.split('\n');
  
  let inRemoteOrigin = false;
  for (const line of lines) {
    if (line.trim() === '[remote "origin"]') {
      inRemoteOrigin = true;
      continue;
    }
    
    if (inRemoteOrigin && line.includes('url = ')) {
      const url = line.trim().replace('url = ', '');
      return url;
    }
    
    // 別のセクションに入ったら検索終了
    if (inRemoteOrigin && line.trim().startsWith('[')) {
      break;
    }
  }
  return '';
}

/**
 * .git/configからリポジトリ情報を取得する
 */
export async function getRepoInfoFromGitConfig(repoPath: string): Promise<RepoInfo> {
  try {
    // .gitディレクトリの存在を確認
    await checkGitDirectory(repoPath);

    // .git/configファイルを読み込む
    const configPath = path.join(repoPath, '.git', 'config');
    const url = await parseGitConfig(configPath);

    if (!url) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Gitリモート "origin" が設定されていません（リポジトリパス: ${repoPath}）。\ngit remote add origin [URL] で設定してください。`
      );
    }
    
    // GitHub URLからオーナーとリポジトリ名を抽出
    const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)\.git$/);
    if (!match) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `GitHubリポジトリのURL形式が無効です（URL: ${url}）。\nリポジトリパス: ${repoPath}`
      );
    }

    return {
      owner: match[1],
      repo: match[2],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `リポジトリ情報の取得に失敗しました（リポジトリパス: ${repoPath}）: ${(error as Error).message}`
    );
  }
}

/**
 * リポジトリ情報を検証する
 */
export function validateRepoInfo(info: Partial<RepoInfo>): RepoInfo {
  if (!info.owner || !info.repo) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Both owner and repo are required'
    );
  }
  return info as RepoInfo;
}
