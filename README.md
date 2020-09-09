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

Install the [act](https://github.com/nektos/act) utility to run actions locally:
```bash
$ brew install nektos/tap/act
```

List available actions:
```bash
$ act --list
```

Run a specific action
```bash
$ act --job test
```

Run a specific action, and pass a JSON payload:
```bash
$ act -j rebase_epic --eventpath src/actions/rebase-epic-action/__tests__/fixtures/synchronize-epic.json
```
