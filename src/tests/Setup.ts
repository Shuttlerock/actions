import * as Core from '@actions/core'

// Hide actions logging.
jest.spyOn(Core, 'debug').mockImplementation((_message: unknown) => undefined)
jest.spyOn(Core, 'error').mockImplementation((_message: unknown) => undefined)
jest.spyOn(Core, 'info').mockImplementation((_message: unknown) => undefined)

jest.mock('@sr-services/Inputs', () => ({
  __esModule: true,
  circleCIToken: () => 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  credentialsApiPrefix: () => 'https://users.example.com/api/private/',
  credentialsApiSecret: () => 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  githubReadToken: () => 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  githubWriteToken: () => 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  jiraEmail: () => 'xxxx@example.com',
  jiraHost: () => 'example.atlassian.net',
  jiraToken: () => 'xxxxxxxxxxxxxxxxxxxxxxxx',
  organizationName: () => 'octokit',
  slackErrorChannelId: () => 'C0000000000',
  slackToken: () => 'xoxb-xxxxxxxxxx-xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx',
}))
