import { render as mustacheRender } from 'mustache'

interface TemplateVars {
  [key: string]: string | number | boolean | undefined
}

/**
 * Renders the given template string and returns the resulting string.
 *
 * @param {string} template The mustache.js template string.
 * @param {object} vars     The vars to replace in the template.
 *
 * @returns {string} The rendered template.
 */
export const render = (template: string, vars: TemplateVars): string =>
  mustacheRender(template, vars)

export const PullRequestForEpicTemplate = `
## {{&summary}}

[Jira {{issueType}}]({{&jiraUrl}})

{{description}}

## Pull Requests

...

## Jira Issues

...

## How to test

...

## Deployment Notes

...

## Epic Notes

Add notes here.
`

export const PullRequestForIssueTemplate = `
## {{&summary}}

[Jira {{issueType}}]({{&jiraUrl}})
{{#belongsToEpic}}
[Jira Epic]({{&epicUrl}})
{{/belongsToEpic}}

{{description}}

## How to test the PR

- How to test feature 1
  - Do this
  - Do that
  - Success
- How to test feature 2
- How to test feature 3

## Deployment Notes

It requires new Environmental variables:

- \`EXAMPLE_ENV_VARIABLE=content\`
- \`EXAMPLE_ENV_VARIABLE2=content\`
`
