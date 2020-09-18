import {getInput} from '@actions/core'
import {Octokit} from '@octokit/rest'

const token = getInput('actions-write-token', {required: true})

export const client = new Octokit({auth: token})
