export const listIssuesSchema = {
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
};

export const createIssueSchema = {
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
    emoji: {
      type: 'string',
      description: 'タイトルの先頭に付与する絵文字',
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
    }
  },
  required: ['repo', 'title'],
};

export const updateIssueSchema = {
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
    emoji: {
      type: 'string',
      description: 'タイトルの先頭に付与する絵文字',
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
};

export const addCommentSchema = {
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
};
