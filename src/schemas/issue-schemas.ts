export const listIssuesSchema = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: 'Gitリポジトリの絶対パス',
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
  required: [],
};

export const createIssueSchema = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: 'Gitリポジトリの絶対パス',
    },
    title: {
      type: 'string',
      description: 'issueのタイトル',
    },
    emoji: {
      type: 'string',
      description: 'タイトルの先頭に付与するユニークな絵文字',
    },
    body: {
      type: 'string',
      description: 'issueの本文（## の先頭には絵文字を付与して可読性を上げて）',
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
  required: ['title'],
};

export const updateIssueSchema = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: 'Gitリポジトリの絶対パス',
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
  required: ['issue_number'],
};
