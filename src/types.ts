export interface IssueArgs {
  path: string;  // Gitリポジトリの絶対パス
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
}

export interface CreateIssueArgs {
  path: string;  // Gitリポジトリの絶対パス
  title: string;
  emoji?: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

export interface UpdateIssueArgs {
  path: string;  // Gitリポジトリの絶対パス
  issue_number: number;
  title?: string;
  emoji?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
  assignees?: string[];
}

export interface RepoArgs {
  path: string;  // Gitリポジトリの絶対パス
}

export interface ToolResponse {
  content: {
    type: string;
    text: string;
  }[];
  _meta?: Record<string, unknown>;
}
