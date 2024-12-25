import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  listIssuesSchema,
  createIssueSchema,
  updateIssueSchema,
  addCommentSchema,
} from './schemas/index.js';
import { handleToolRequest } from './handlers/tool-handlers.js';
import { handleServerError, handleProcessTermination } from './utils/error-handler.js';

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
    
    this.server.onerror = handleServerError;
    handleProcessTermination(this.server);
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
          name: 'add_comment',
          description: 'タスクにコメントを追加',
          inputSchema: addCommentSchema,
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, handleToolRequest);
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub Kanban MCP server running on stdio');
  }
}
