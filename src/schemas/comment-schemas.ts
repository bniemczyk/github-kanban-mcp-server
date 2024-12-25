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
    state: {
      type: 'string',
      enum: ['open', 'closed'],
      description: 'コメント時に変更するissueの状態（オプション）',
    },
  },
  required: ['repo', 'issue_number', 'body'],
};
