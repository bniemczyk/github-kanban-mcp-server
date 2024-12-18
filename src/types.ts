export interface IssueArgs {
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
}

export interface CreateIssueArgs {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

export interface UpdateIssueArgs {
  issue_number: number;
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
  assignees?: string[];
}

export interface ToolResponse {
  content: {
    type: string;
    text: string;
  }[];
  _meta?: Record<string, unknown>;
}
