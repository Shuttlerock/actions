import { getInput } from '@actions/core'

import { debug } from '@sr-services/Log'

// To trigger this event manually:
//
// curl --header "Accept: application/vnd.github.v3+json" \
//      --header  "Authorization: token YOUR_TOKEN" \
//      --request POST \
//      --data    '{"ref": "develop", "inputs": { "email": "dave@shuttlerock.com", "event": "createPullRequestForJiraIssue", "param": "STUDIO-232" }}' \
//      https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches
export const createPullRequestForJiraIssue = async (
  email: string,
  param: string
): Promise<void> => {
  const jiraToken = await getInput('jira-token', { required: true })
  const repoToken = getInput('repo-token', { required: true })
  const writeToken = getInput('write-token', { required: true })

  debug('------------------------------')
  debug(email)
  debug(param)
  debug(jiraToken)
  debug(repoToken)
  debug(writeToken)
  debug('------------------------------')
}
