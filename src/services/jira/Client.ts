import { getInput } from '@actions/core'
import JiraClient from 'jira-client'

const email = getInput('jira-email', { required: true })
const token = getInput('jira-token', { required: true })

export const client = new JiraClient({
  apiVersion: '2',
  host: 'shuttlerock.atlassian.net',
  password: token,
  protocol: 'https',
  strictSSL: true,
  username: email,
})
