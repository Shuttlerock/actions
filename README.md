# Shuttlerock Github Actions

This repository contains a library of Github Actions used to automate development at Shuttlerock.

## Available Actions

* `check-suite-completed-action`:
  * Sends a Slack message to the author when a check suite succeeds.
  * Sends a Slack message to the author when a check suite fails, and moves the associated Jira issue to `Has Issues` state.
* `pull-request-closed-action`:
  * Creates a new release in Github and Jira if the pull request was a release.
  * Moves the associated Jira issue to `Validated` state if the pull request wasn't a release.
* `pull-request-converted-to-draft-action`:
  * Moves the associated Jira issue to `In Progress` state.
* `pull-request-labeled-action`:
  * If the pull request has been labeled `security` or `dependencies`, make sure an owner is assigned.
  * If the pull request has been labeled `dependencies`, make sure reviewers are assigned.
* `pull-request-ready-for-review-action`:
  * Makes sure an owner is assignerd.
  * Assigns reviewers.
  * Adds the `please-review` label.
  * Moves the associated Jira issue to `Ready for Review` state.
* `trigger-action` is used to trigger automation via HTTP (eg. from Slack or Jira). Some of these would probably benefit from being moved out of Github actions at some point, since the latency on startup makes the developer experience a bit slow.
  * `approvePullRequest`: Tell the `@sr-devops` Github user to approve the given pull request, as a workaround for branch protection on projects with no reviewers. This is only intended to be used in the early stages of the project, and is only available for whitelisted projects.
  * `createPullRequestForJiraIssue`: Creates a pull request for the given Jira issue, using the correct user's Github token.
  * `createRelease`: Creates a release pull request for the given repository, and populates the description with the list of pull requests and dependency updates in the release.
  * `jiraStoryPointsUpdated`: When an estimate for a Jira child issue changes, this re-calculates the sum of points in the parent issue.
    * We attempted to implement this in Jira automation directly, but there were edge cases that made it unreliable, so we implemented it outside of Jira.
    * This only triggers when the points field changes. If a new child is added for example, the sum will not be updated.
  * `jiraIssueTransitioned`:
    * If we're not in a planning status, moves the issue to the board.
    * If the issue is on the board, moves any child issues to the board as well.
    * Moves the parent issue to same state as the left-most child. Eg. if an issue is moved from `Ready for Review` to `In Progress`, its parent issue should also be moved from `Ready for Review` to `In Progress`.

## Triggering actions via HTTP

Github actions can easily be triggered via HTTP, and input parameters can be passed. For example, to trigger creation of a pull request via cURL, in the repository `compliance`, belonging to the user `someone@gmail.com`:

```shell
curl --header  "Accept: application/vnd.github.v3+json" \
     --header  "Authorization: token <YOUR GITHUB TOKEN>" \
     --request POST \
     --data    '{"ref": "master", "inputs": { "event": "createPullRequestForJiraIssue", "param": "compliance", "email": "someone@gmail.com" }}' \
 https://api.github.com/repos/Shuttlerock/compliance/actions/workflows/trigger-action.yml/dispatches
 ```

## Slack Integration

Slack can trigger automation via the [slack-bot](https://github.com/Shuttlerock/slack-bot) project (not currently open-sourced). To do this, the bot simply sends a HTTP request to the `trigger-action` action as described above, with the appropriate parameters.

## Jira Integration

Jira automation can be used to trigger Github actions. For example, to trigger `jiraStoryPointsUpdated`:

1. Open the project board, and click the lightning (Automation) icon in the top right.
1. Select `Manage Automation Rules` from the drop-down menu.
1. Click the `Create rule` button.
1. Select `Field value changed` as the `Trigger`, and select the `Story point estimate` field under `Fields to monitor for changes`, and click `Save`.
1. Add conditions as appropriate. For example, we might want to add a `User condition`, select `User who triggered the event`, and filter out our Jira bot user, so that we don't get into an infinite loop when our bot updates a field.
1. Select `New component` → `New action` → `Send web request`.
  * Enter the dispatch URL of your Github action as the  `Webhook URL` (eg. `https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches`).
  * Add headers as appropriate. Make sure to add your Github token with name `Authorization` and value `token YOUR_TOKEN_HERE`.
  * Select `POST` as the `HTTP method`.
  * Select `Custom data` for the `Webhook body`.
  * Fill in the custom data with the data required by the action. Eg. `{"ref": "master", "inputs": { "event": "jiraStoryPointsUpdated", "param": "{{key}}", "email": "{{initiator.emailAddress}}" }}`.

We have set up Jira automations to:

- Sum child issue estimates for in parent issues.
- Automatically create a pull request when an issue moves to `In Progress`, and send the user the pull request details via Slack.
- Automatically move parent issues to keep in sync with their children.

## Credential API

In order to integrate with other services such as Jira and Slack, we need to provide a credential API (currently closed-source). The credentials API is expected to have two endpoints:

1. `${credentialsApiPrefix}/credentials/${id}`
    This endpoint allows us to fetch information about a specific user, and link a github account to Slack and Jira accounts. The `id` is the base64-encoded email address or Jira user name.
    ```
    {
      "email":           "someone@gmail.com",
      "github_token":    "xxx",
      "github_username": "someone",
      "leads":           ["actions"], // The list of repositories that this user is the lead developer on.
      "reviews":         ["actions", "compliance"], // The list of repositories that this user is a reviewer for.
      "slack_id":        "xxx",
      "status":          "ok"
    }
    ```
2. `${credentialsApiPrefix}/repositories/${id}`
    This endpoint allows us to fetch information about a specific repository. The `id` is the base64-encoded repository name.
    ```
    {
      "allow_auto_review": false, // Allow the bot to approve PRs.
      "jira_project_id":   "EXAMPLE",
      "leads":             ["dhh"], // The list of lead developers for this repository.
      "reviewers":         ["dhh", "wycats"], // The list of reviewers for thid repository.
      "status":            "ok"
    }
    ```

Our Github actions will also send a `Shuttlerock-Signature` header to authenticate these requests (see `Credentials.ts` for details of the signature implementation).

## Getting Started

Install the dependencies
```bash
$ yarn install
```

Build the typescript and package it for distribution
```bash
$ yarn all
```

Attempt to fix lint and formatting issues
```bash
$ yarn format
```

Run the tests :heavy_check_mark:
```bash
$ yarn test

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```

## Adding a new action

Create a new folder under `src/actions`, and add an `action.yml` inside defining the action. See the [actions documentation](https://help.github.com/en/articles/metadata-syntax-for-github-actions) for details.

## Developing locally

First, install the [act](https://github.com/nektos/act) utility to run actions locally:
```bash
$ git clone git@github.com:nektos/act.git --branch v0.2.15
$ cd act
```

Edit the file `pkg/runner/step_context.go` and apply the following patch (it expects the `action.yml` file at the repository root, whereas we have it multiple actions in subfolders):

```bash
diff --git a/pkg/runner/step_context.go b/pkg/runner/step_context.go
index 5cb8952..d800b1c 100644
--- a/pkg/runner/step_context.go
+++ b/pkg/runner/step_context.go
@@ -52,7 +52,7 @@ func (sc *StepContext) Executor() common.Executor {
                actionDir := filepath.Join(rc.Config.Workdir, step.Uses)
                return common.NewPipelineExecutor(
                        sc.setupAction(actionDir, ""),
-                       sc.runAction(actionDir, ""),
+                       sc.runAction(actionDir, step.Uses),
                )
        case model.StepTypeUsesActionRemote:
                remoteAction := newRemoteAction(step.Uses)
```

Build `act`, and copy the resulting executable into your `PATH` somewhere:

```bash
$ go build
$ cp act ~/.bin
```

or:
```bash
$ make && make install
```

You will also need to provide a github token in the `.secrets` file:

```bash
$ cp .secrets.example .secrets
```

If you want to use system `git`, you need a more recent docker image than `act` uses by default (and you need to use `--platform ubuntu-latest=nektos/act-environments-ubuntu:18.04` when running `act`):

```bash
$ docker pull nektos/act-environments-ubuntu:18.04
```

Now that you have `act` patched, you can use it normally as per the [documentation](https://github.com/nektos/act#overview---):

List available actions:
```bash
$ act --list
```

Run a specific action
```bash
$ act --job test
```

Run a specific action, and pass a JSON payload plus secrets:
```bash
$ act --secret-file .secrets --job rebase_epic --eventpath src/actions/rebase-epic-action/__tests__/fixtures/synchronize-epic.json
```

