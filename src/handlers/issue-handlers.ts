import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { IssueArgs, CreateIssueArgs, UpdateIssueArgs, ToolResponse } from '../types.js';
import { execAsync, writeToTempFile, removeTempFile } from '../utils/exec.js';
import { getExistingLabels, createLabel } from './label-handlers.js';
import { getRepoInfoFromGitConfig } from '../utils/repo-info.js';

/**
 * リポジトリ情報を取得する
 */
async function getRepoInfo(args: { path: string }): Promise<{ owner: string; repo: string }> {
  if (!args.path) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'リポジトリのパスを指定してください。'
    );
  }
  
  return await getRepoInfoFromGitConfig(args.path);
}

/**
 * Issue一覧を取得する
 */
export async function handleListIssues(args: IssueArgs): Promise<ToolResponse> {
  try {
  const { owner, repo } = await getRepoInfo(args);
  const stateFlag = args.state ? `--state ${args.state}` : '';
  const labelsFlag = args.labels?.length ? `--label ${args.labels.join(',')}` : '';
  
  const { stdout } = await execAsync(
    `gh issue list --repo ${owner}/${repo} ${stateFlag} ${labelsFlag} --json number,title,state,labels,assignees,createdAt,updatedAt`
  );

  return {
    content: [
      {
        type: 'text',
        text: stdout,
      },
    ],
  };
  } catch (error as Error) {
	  const trace = error.stack.replace(/^\s+at /m, '');
	  return {
		  content: [
			  { type: 'text',
		            text: `Error: ${error.message}\nStack Trace: ${trace}`
			  },
		  ],
	  }
  }
}

/**
 * 新しいIssueを作成する
 */
export async function handleCreateIssue(args: CreateIssueArgs): Promise<ToolResponse> {
  const { owner, repo } = await getRepoInfo(args);
  const assigneesFlag = args.assignees?.length ? `--assignee ${args.assignees.join(',')}` : '';
  const tempFile = 'issue_body.md';
  let bodyFlag = '';

  try {
    // ラベルの存在確認と作成
    if (args.labels?.length) {
      const existingLabels = await getExistingLabels(args.path);
      for (const label of args.labels) {
        if (!existingLabels.includes(label)) {
          await createLabel(args.path, label);
        }
      }
    }
    const labelsFlag = args.labels?.length ? `--label ${args.labels.join(',')}` : '';

    if (args.body) {
      const fullPath = await writeToTempFile(args.body, tempFile);
      bodyFlag = `--body-file "${fullPath}"`;
    }

    // タイトルに絵文字を付与（指定がある場合）
    const titleWithEmoji = args.emoji ? `${args.emoji} ${args.title}` : args.title;

    const { stdout } = await execAsync(
      `gh issue create --repo ${owner}/${repo} --title "${titleWithEmoji}" ${bodyFlag} ${labelsFlag} ${assigneesFlag}`
    );

    // URLから issue number を抽出
    const issueUrl = stdout.trim();
    const issueNumber = issueUrl.split('/').pop();

    // 作成したissueの詳細情報を取得
    const { stdout: issueData } = await execAsync(
      `gh issue view ${issueNumber} --repo ${owner}/${repo} --json number,title,url`
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
 * 既存のIssueを更新する
 */
export async function handleUpdateIssue(args: UpdateIssueArgs): Promise<ToolResponse> {
  const { owner, repo } = await getRepoInfo(args);
  // タイトルが更新される場合は絵文字を付与（指定がある場合）
  const titleFlag = args.title ? `--title "${args.emoji ? `${args.emoji} ${args.title}` : args.title}"` : '';
  const labelsFlag = args.labels?.length ? `--add-label ${args.labels.join(',')}` : '';
  const assigneesFlag = args.assignees?.length ? `--add-assignee ${args.assignees.join(',')}` : '';

  const tempFile = 'update_body.md';
  let bodyFlag = '';

  try {
    // 状態の更新を処理
    if (args.state) {
      const command = args.state === 'closed' ? 'close' : 'reopen';
      await execAsync(
        `gh issue ${command} ${args.issue_number} --repo ${owner}/${repo}`
      );
    }

    // その他の更新を処理
    if (args.title || args.body || args.labels?.length || args.assignees?.length) {
      if (args.body) {
        const fullPath = await writeToTempFile(args.body, tempFile);
        bodyFlag = `--body-file "${fullPath}"`;
      }

      await execAsync(
        `gh issue edit ${args.issue_number} --repo ${owner}/${repo} ${titleFlag} ${bodyFlag} ${labelsFlag} ${assigneesFlag}`
      );
    }

    const { stdout: issueData } = await execAsync(
      `gh issue view ${args.issue_number} --repo ${owner}/${repo} --json number,title,state,url`
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
