import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { execAsync, writeToTempFile, removeTempFile } from '../utils/exec.js';
import { ToolResponse } from '../types.js';

/**
 * Issueにコメントを追加する
 */
export async function handleAddComment(args: {
  repo: string;
  issue_number: string;
  body: string;
  state?: 'open' | 'closed';
}): Promise<ToolResponse> {
  const tempFile = 'comment_body.md';

  try {
    // ステータスの変更が指定されている場合は先に処理
    if (args.state) {
      try {
        const command = args.state === 'closed' ? 'close' : 'reopen';
        await execAsync(
          `gh issue ${command} ${args.issue_number} --repo ${args.repo}`
        );
        console.log(`Issue status changed to ${args.state}`);
      } catch (error) {
        console.error('Failed to change issue status:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to change issue status: ${(error as Error).message}`
        );
      }
    }

    // コメントを追加
    const fullPath = await writeToTempFile(args.body, tempFile);
    try {
      await execAsync(
        `gh issue comment ${args.issue_number} --repo ${args.repo} --body-file "${fullPath}"`
      );
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to add comment: ${(error as Error).message}`
      );
    }

    // 更新後のissue情報を取得して返却
    try {
      const { stdout: issueData } = await execAsync(
        `gh issue view ${args.issue_number} --repo ${args.repo} --json number,title,state,url`
      );
      return {
        content: [
          {
            type: 'text',
            text: issueData,
          },
        ],
      };
    } catch (error) {
      console.error('Failed to get issue data:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get issue data: ${(error as Error).message}`
      );
    }
  } finally {
    await removeTempFile(tempFile);
  }
}
