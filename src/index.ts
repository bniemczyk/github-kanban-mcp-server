#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import { IssueArgs, CreateIssueArgs, UpdateIssueArgs, ToolResponse } from './types.js';

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;

if (!GITHUB_TOKEN || !GITHUB_OWNER) {
  throw new Error('Required environment variables (GITHUB_TOKEN, GITHUB_OWNER) are not set');
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

class KanbanServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'github-kanban-mcp-server',
        version: '0.1.0',
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
    const { data: issues } = await octokit.issues.listForRepo({
      owner: GITHUB_OWNER!,
      repo: args.repo,
      state: args?.state || 'open',
      labels: args?.labels?.join(','),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            issues.map(issue => ({
              number: issue.number,
              title: issue.title,
              state: issue.state,
              labels: issue.labels.map(label => 
                typeof label === 'string' ? label : label.name
              ),
              assignees: issue.assignees?.map(assignee => assignee.login),
              created_at: issue.created_at,
              updated_at: issue.updated_at,
            })),
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleCreateIssue(args: CreateIssueArgs & { repo: string }): Promise<ToolResponse> {
    const { data: issue } = await octokit.issues.create({
      owner: GITHUB_OWNER!,
      repo: args.repo,
      title: args.title,
      body: args.body,
      labels: args.labels,
      assignees: args.assignees,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            number: issue.number,
            title: issue.title,
            url: issue.html_url,
          }, null, 2),
        },
      ],
    };
  }

  private async handleUpdateIssue(args: UpdateIssueArgs & { repo: string }): Promise<ToolResponse> {
    const { data: issue } = await octokit.issues.update({
      owner: GITHUB_OWNER!,
      repo: args.repo,
      issue_number: args.issue_number,
      title: args.title,
      body: args.body,
      state: args.state,
      labels: args.labels,
      assignees: args.assignees,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            url: issue.html_url,
          }, null, 2),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub Kanban MCP server running on stdio');
  }
}

const server = new KanbanServer();
server.run().catch(console.error);
