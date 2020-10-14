import JiraClient from 'jira-client'

import { JiraEmail, JiraHost, JiraToken } from '@sr-services/Constants'

export const client = new JiraClient({
  apiVersion: '2',
  host: JiraHost,
  password: JiraToken,
  protocol: 'https',
  strictSSL: true,
  username: JiraEmail,
})
