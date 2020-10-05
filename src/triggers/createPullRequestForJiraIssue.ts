import { client } from '@sr-services/jira/Client'
import { debug } from '@sr-services/Log'

/**
 * To trigger this event manually:
 *
 * $ act --job trigger_action --eventpath src/actions/trigger-action/__tests__/fixtures/createPullRequestForJiraIssue.ts.json
 *
 * or to trigger it via the Github API:
 *
 * $ curl --header "Accept: application/vnd.github.v3+json" \
 * --header  "Authorization: token YOUR_TOKEN" \
 * --request POST \
 * --data    '{"ref": "develop", "inputs": { "email": "dave@shuttlerock.com", "event": "createPullRequestForJiraIssue", "param": "STUDIO-232" }}' \
 * https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches
 *
 * @param {string} email    The email address of the user who will own the pull request.
 * @param {string} issueKey The key of the Jira issue we will base the pull request on.
 */
export const createPullRequestForJiraIssue = async (
  email: string,
  issueKey: string
): Promise<void> => {
  debug('------------------------------')
  debug(email)
  debug(issueKey)
  debug('------------------------------')

  const issue = await client.findIssue('STUDIO-232')
  debug(issue)
  debug('------------------------------')

  // 1. Fetch the Jira issue details.
  // 2. Check if a PR already exists for the issue.
  // 3. Check if this is an epic issue.
  // 4. If an epic issue, create an epic PR.
  // 5. If not an epic issue, check if it belongs to an epic.s
}
