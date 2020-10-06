import { client } from '@sr-services/jira/Client'

export interface Issue {
  fields: {
    description: string
    issuetype: {
      name: 'Bug' | 'Chore' | 'Feature' | 'Story'
      subtask: boolean
    }
    subtasks: Issue[]
    summary: string
    // Added by us.
    repository?: string
  }
  id: string
  key: string
  names: {
    [name: string]: string
  }
  subtask: boolean
}

/**
 * Fetches the issue with the given key from Jira.s
 *
 * @param {string} key The key of the Jira issue (eg. 'STUDIO-236').
 *
 * @returns {Issue} The issue data.
 */
export const getIssue = async (key: string): Promise<Issue> => {
  const issue = (await client.findIssue(key, 'names')) as Issue

  // Find the repository, and include it explicitly. This is a bit ugly due to the way
  // Jira includes custom fields.
  const fieldName = Object.keys(issue.names).find(
    name => issue.names[name] === 'Repository'
  )
  if (fieldName) {
    issue.fields.repository = ((issue.fields as unknown) as {
      [customField: string]: { value: string }
    })[fieldName].value
  }

  return issue
}
