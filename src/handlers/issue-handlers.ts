import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { IssueArgs, CreateIssueArgs, UpdateIssueArgs, ToolResponse } from '../types.js';
import { execAsync, writeToTempFile, removeTempFile } from '../utils/exec.js';

/**
 * Issue一覧を取得する
 */
export async function handleListIssues(args: IssueArgs & { repo: string }): Promise<ToolResponse> {
  const stateFlag = args.state ? `--state ${args.state}` : '';
  const labelsFlag = args.labels?.length ? `--label ${args.labels.join(',')}` : '';
  
  const { stdout } = await execAsync(
    `gh issue list --repo ${args.repo} ${stateFlag} ${labelsFlag} --json number,title,state,labels,assignees,createdAt,updatedAt`
  );

  return {
    content: [
      {
        type: 'text',
        text: stdout,
      },
    ],
  };
}

/**
 * 新しいIssueを作成する
 */
export async function handleCreateIssue(args: CreateIssueArgs & { repo: string }): Promise<ToolResponse> {
  const labelsFlag = args.labels?.length ? `--label ${args.labels.join(',')}` : '';
  const assigneesFlag = args.assignees?.length ? `--assignee ${args.assignees.join(',')}` : '';
  
  const tempFile = 'temp_issue_body.md';
  let bodyFlag = '';

  try {
    if (args.body) {
      await writeToTempFile(args.body, tempFile, args.workingDir);
      const fullPath = args.workingDir ? `${args.workingDir}\\${tempFile}` : tempFile;
      bodyFlag = `--body-file "${fullPath}"`;
    }

    const { stdout } = await execAsync(
      `gh issue create --repo ${args.repo} --title "${args.title}" ${bodyFlag} ${labelsFlag} ${assigneesFlag}`
    );

    // URLから issue number を抽出
    const issueUrl = stdout.trim();
    const issueNumber = issueUrl.split('/').pop();

    // 作成したissueの詳細情報を取得
    const { stdout: issueData } = await execAsync(
      `gh issue view ${issueNumber} --repo ${args.repo} --json number,title,url`
    );

    return {
      content: [
        {
          type: 'text',
          text: issueData,
        },
      ],
    };
  } finally {
    if (args.body) {
      await removeTempFile(tempFile, args.workingDir);
    }
  }
}

/**
 * 既存のIssueを更新する
 */
export async function handleUpdateIssue(args: UpdateIssueArgs & { repo: string }): Promise<ToolResponse> {
  const titleFlag = args.title ? `--title "${args.title}"` : '';
  const stateFlag = args.state ? `--state ${args.state}` : '';
  const labelsFlag = args.labels?.length ? `--add-label ${args.labels.join(',')}` : '';
  const assigneesFlag = args.assignees?.length ? `--add-assignee ${args.assignees.join(',')}` : '';

  const tempFile = 'temp_update_body.md';
  let bodyFlag = '';

  try {
    if (args.body) {
      await writeToTempFile(args.body, tempFile);
      bodyFlag = `--body-file ${tempFile}`;
    }

    await execAsync(
      `gh issue edit ${args.issue_number} --repo ${args.repo} ${titleFlag} ${bodyFlag} ${stateFlag} ${labelsFlag} ${assigneesFlag}`
    );

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
  } finally {
    if (args.body) {
      await removeTempFile(tempFile);
    }
  }
}

/**
 * Issueを削除する
 */
export async function handleDeleteIssue(args: { repo: string; issue_number: string }): Promise<ToolResponse> {
  const { stdout } = await execAsync(
    `gh issue delete ${args.issue_number} --repo ${args.repo} --yes`
  );

  return {
    content: [
      {
        type: 'text',
        text: stdout || 'Issue deleted successfully',
      },
    ],
  };
}

/**
 * Issueにコメントを追加する
 */
export async function handleAddComment(args: { repo: string; issue_number: string; body: string }): Promise<ToolResponse> {
  const tempFile = 'temp_comment_body.md';

  try {
    await writeToTempFile(args.body, tempFile);

    const { stdout } = await execAsync(
      `gh issue comment ${args.issue_number} --repo ${args.repo} --body-file ${tempFile}`
    );

    return {
      content: [
        {
          type: 'text',
          text: stdout || 'Comment added successfully',
        },
      ],
    };
  } finally {
    await removeTempFile(tempFile);
  }
}
