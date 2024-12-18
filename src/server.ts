import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import {
  listIssuesSchema,
  createIssueSchema,
  updateIssueSchema,
  deleteIssueSchema,
  addCommentSchema,
} from './schemas/index.js';
import {
  handleListIssues,
  handleCreateIssue,
  handleUpdateIssue,
  handleDeleteIssue,
  handleAddComment,
} from './handlers/index.js';
import { ToolResponse } from './types.js';

export class KanbanServer {
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
          inputSchema: listIssuesSchema,
        },
        {
          name: 'create_issue',
          description: '新しいissueを作成します',
          inputSchema: createIssueSchema,
        },
        {
          name: 'update_issue',
          description: '既存のissueを更新します',
          inputSchema: updateIssueSchema,
        },
        {
          name: 'delete_issue',
          description: 'カンバンボードのタスクを削除',
          inputSchema: deleteIssueSchema,
        },
        {
          name: 'add_comment',
          description: 'タスクにコメントを追加',
          inputSchema: addCommentSchema,
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
            return await handleListIssues({
              repo: args.repo as string,
              state: args?.state as 'open' | 'closed' | 'all',
              labels: args?.labels as string[],
            });
          case 'create_issue': {
            if (!args?.title) {
              throw new McpError(ErrorCode.InvalidParams, 'Title is required');
            }
            return await handleCreateIssue({
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
            return await handleUpdateIssue({
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
            return await handleDeleteIssue({
              repo: args.repo as string,
              issue_number: args.issue_number as string,
            });
          }
          case 'add_comment': {
            if (!args?.issue_number || !args?.body) {
              throw new McpError(ErrorCode.InvalidParams, 'Issue number and body are required');
            }
            return await handleAddComment({
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub Kanban MCP server running on stdio');
  }
}
