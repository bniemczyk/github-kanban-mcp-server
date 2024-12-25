import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { IssueArgs, CreateIssueArgs, UpdateIssueArgs, ToolResponse } from '../types.js';
import { execAsync, writeToTempFile, removeTempFile } from '../utils/exec.js';

/**
 * ランダムな16進数カラーコードを生成する
 */
function generateRandomColor(): string {
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
async function getExistingLabels(repo: string): Promise<string[]> {
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
async function createLabel(repo: string, name: string): Promise<void> {
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
  const assigneesFlag = args.assignees?.length ? `--assignee ${args.assignees.join(',')}` : '';
  const tempFile = 'issue_body.md';
  let bodyFlag = '';

  try {
    // ラベルの存在確認と作成
    if (args.labels?.length) {
      const existingLabels = await getExistingLabels(args.repo);
      for (const label of args.labels) {
        if (!existingLabels.includes(label)) {
          await createLabel(args.repo, label);
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
      `gh issue create --repo ${args.repo} --title "${titleWithEmoji}" ${bodyFlag} ${labelsFlag} ${assigneesFlag}`
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
      await removeTempFile(tempFile);
    }
  }
}

/**
 * 既存のIssueを更新する
 */
export async function handleUpdateIssue(args: UpdateIssueArgs & { repo: string }): Promise<ToolResponse> {
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
        `gh issue ${command} ${args.issue_number} --repo ${args.repo}`
      );
    }

    // その他の更新を処理
    if (args.title || args.body || args.labels?.length || args.assignees?.length) {
      if (args.body) {
        const fullPath = await writeToTempFile(args.body, tempFile);
        bodyFlag = `--body-file "${fullPath}"`;
      }

      await execAsync(
        `gh issue edit ${args.issue_number} --repo ${args.repo} ${titleFlag} ${bodyFlag} ${labelsFlag} ${assigneesFlag}`
      );
    }

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
 * Issueにコメントを追加する
 */
export async function handleAddComment(args: { repo: string; issue_number: string; body: string }): Promise<ToolResponse> {
  const tempFile = 'comment_body.md';

  try {
    const fullPath = await writeToTempFile(args.body, tempFile);

    const { stdout } = await execAsync(
      `gh issue comment ${args.issue_number} --repo ${args.repo} --body-file "${fullPath}"`
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
