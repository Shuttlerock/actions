# Shuttlerock Github Actions

This repository contains a library of Github Actions used to automate development at Shuttlerock.

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
$ git clone git@github.com:nektos/act.git
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
