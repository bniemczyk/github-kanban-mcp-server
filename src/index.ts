#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IssueArgs, CreateIssueArgs, UpdateIssueArgs, ToolResponse } from './types.js';

const execAsync = promisify(exec);

class KanbanServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'github-kanban-mcp-server',
        version: '0.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_issues',
          description: 'カンバンボードのissue一覧を取得します',
          inputSchema: {
            type: 'object',
            properties: {
              repo: {
                type: 'string',
                description: 'GitHubリポジトリ名',
              },
              state: {
                type: 'string',
                enum: ['open', 'closed', 'all'],
                description: 'issueの状態',
              },
              labels: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'フィルタリングするラベル',
              },
            },
            required: ['repo'],
          },
        },
        {
          name: 'create_issue',
          description: '新しいissueを作成します',
          inputSchema: {
            type: 'object',
            properties: {
              repo: {
                type: 'string',
                description: 'GitHubリポジトリ名',
              },
              title: {
                type: 'string',
                description: 'issueのタイトル',
              },
              body: {
                type: 'string',
                description: 'issueの本文',
              },
              labels: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'issueのラベル',
              },
              assignees: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'アサインするユーザー',
              },
            },
            required: ['repo', 'title'],
          },
        },
        {
          name: 'update_issue',
          description: '既存のissueを更新します',
          inputSchema: {
            type: 'object',
            properties: {
              repo: {
                type: 'string',
                description: 'GitHubリポジトリ名',
              },
              issue_number: {
                type: 'number',
                description: 'issue番号',
              },
              title: {
                type: 'string',
                description: '新しいタイトル',
              },
              body: {
                type: 'string',
                description: '新しい本文',
              },
              state: {
                type: 'string',
                enum: ['open', 'closed'],
                description: '新しい状態',
              },
              labels: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: '新しいラベル',
              },
              assignees: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: '新しいアサイン',
              },
            },
            required: ['repo', 'issue_number'],
          },
        },
        {
          name: 'delete_issue',
          description: 'カンバンボードのタスクを削除',
          inputSchema: {
            type: 'object',
            properties: {
              repo: {
                type: 'string',
                description: 'GitHubリポジトリ名',
              },
              issue_number: {
                type: 'string',
                description: 'タスク（Issue）のID',
              },
            },
            required: ['repo', 'issue_number'],
          },
        },
        {
          name: 'add_comment',
          description: 'タスクにコメントを追加',
          inputSchema: {
            type: 'object',
            properties: {
              repo: {
                type: 'string',
                description: 'GitHubリポジトリ名',
              },
              issue_number: {
                type: 'string',
                description: 'タスク（Issue）のID',
              },
              body: {
                type: 'string',
                description: 'コメントの内容（Markdown形式対応）',
              },
            },
            required: ['repo', 'issue_number', 'body'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<ToolResponse> => {
      try {
        const args = request.params.arguments as Record<string, unknown>;
        if (!args?.repo) {
          throw new McpError(ErrorCode.InvalidParams, 'Repository name is required');
        }

        switch (request.params.name) {
          case 'list_issues':
            return await this.handleListIssues({
              repo: args.repo as string,
              state: args?.state as IssueArgs['state'],
              labels: args?.labels as string[],
            });
          case 'create_issue': {
            if (!args?.title) {
              throw new McpError(ErrorCode.InvalidParams, 'Title is required');
            }
            return await this.handleCreateIssue({
              repo: args.repo as string,
              title: args.title as string,
              body: args?.body as string | undefined,
              labels: args?.labels as string[] | undefined,
              assignees: args?.assignees as string[] | undefined,
            });
          }
          case 'update_issue': {
            if (!args?.issue_number) {
              throw new McpError(ErrorCode.InvalidParams, 'Issue number is required');
            }
            return await this.handleUpdateIssue({
              repo: args.repo as string,
              issue_number: Number(args.issue_number),
              title: args?.title as string | undefined,
              body: args?.body as string | undefined,
              state: args?.state as 'open' | 'closed' | undefined,
              labels: args?.labels as string[] | undefined,
              assignees: args?.assignees as string[] | undefined,
            });
          }
          case 'delete_issue': {
            if (!args?.issue_number) {
              throw new McpError(ErrorCode.InvalidParams, 'Issue number is required');
            }
            return await this.handleDeleteIssue({
              repo: args.repo as string,
              issue_number: args.issue_number as string,
            });
          }
          case 'add_comment': {
            if (!args?.issue_number || !args?.body) {
              throw new McpError(ErrorCode.InvalidParams, 'Issue number and body are required');
            }
            return await this.handleAddComment({
              repo: args.repo as string,
              issue_number: args.issue_number as string,
              body: args.body as string,
            });
          }
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `GitHub API error: ${(error as Error).message}`
        );
      }
    });
  }

  private async handleListIssues(args: IssueArgs & { repo: string }): Promise<ToolResponse> {
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

  private async handleCreateIssue(args: CreateIssueArgs & { repo: string }): Promise<ToolResponse> {
    const labelsFlag = args.labels?.length ? `--label ${args.labels.join(',')}` : '';
    const assigneesFlag = args.assignees?.length ? `--assignee ${args.assignees.join(',')}` : '';
    
    // bodyの内容をファイルに書き出して、--body-fileオプションで渡す
    const tempFile = 'temp_issue_body.md';
    if (args.body) {
      await execAsync(`echo "${args.body.replace(/"/g, '\\"')}" > ${tempFile}`);
    }
    const bodyFlag = args.body ? `--body-file ${tempFile}` : '';

    try {
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
      // エラーが発生しても一時ファイルを確実に削除
      try {
        if (args.body) {
          await execAsync(`rm ${tempFile}`);
        }
      } catch (error) {
        console.error('Failed to remove temporary file:', error);
      }
    }
  }

  private async handleUpdateIssue(args: UpdateIssueArgs & { repo: string }): Promise<ToolResponse> {
    const titleFlag = args.title ? `--title "${args.title}"` : '';
    const stateFlag = args.state ? `--state ${args.state}` : '';
    const labelsFlag = args.labels?.length ? `--add-label ${args.labels.join(',')}` : '';
    const assigneesFlag = args.assignees?.length ? `--add-assignee ${args.assignees.join(',')}` : '';

    // bodyの内容をファイルに書き出して、--body-fileオプションで渡す
    const tempFile = 'temp_update_body.md';
    if (args.body) {
      await execAsync(`echo "${args.body.replace(/"/g, '\\"')}" > ${tempFile}`);
    }
    const bodyFlag = args.body ? `--body-file ${tempFile}` : '';

    try {
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
      // エラーが発生しても一時ファイルを確実に削除
      try {
        if (args.body) {
          await execAsync(`rm ${tempFile}`);
        }
      } catch (error) {
        console.error('Failed to remove temporary file:', error);
      }
    }
  }

  private async handleDeleteIssue(args: { repo: string; issue_number: string }): Promise<ToolResponse> {
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

  private async handleAddComment(args: { repo: string; issue_number: string; body: string }): Promise<ToolResponse> {
    // bodyの内容をファイルに書き出して、--body-fileオプションで渡す
    const tempFile = 'temp_comment_body.md';
    await execAsync(`echo "${args.body.replace(/"/g, '\\"')}" > ${tempFile}`);

    try {
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
      // エラーが発生しても一時ファイルを確実に削除
      try {
        await execAsync(`rm ${tempFile}`);
      } catch (error) {
        console.error('Failed to remove temporary file:', error);
      }
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub Kanban MCP server running on stdio');
  }
}

const server = new KanbanServer();
server.run().catch(console.error);
