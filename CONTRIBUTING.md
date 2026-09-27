# Contributing Guide

Cheatsheet: [All official add-ons source code](https://github.com/sveltejs/cli/tree/main/packages/sv/src/addons)

Some convenient scripts are provided to help develop the add-on.

```sh
## create a new minimal project in the `demo` directory
pnpm run demo-create

## add the current add-on to the demo project
pnpm run demo-add

## run the tests
pnpm run test
```

## Building

This add-on is bundled with [tsdown](https://tsdown.dev/) into a single file in `dist/`. This bundles everything except `sv`, which is a peer dependency provided at runtime.

```sh
pnpm run build
```

## Publishing

This repository offers a GitHub Workflow to help automatically publish a version to NPM, GitHub Packages and GitHub Releases on the push of a tag.

Start by updating the version number:

```sh
git checkout main
git pull --autostash --prune --rebase

VERSION=$(pnpm version patch --json --no-git-tag-version | jq --raw-output '.[0].newVersion')
TAG="v$VERSION"
pnpm run format

git checkout -b "release/$TAG"
git commit --all --message "🔖 $TAG"
git push --set-upstream origin "release/$TAG"

gh pr create --assignee @me --base main --draft --fill-verbose --head "release/$TAG" --title "🔖 $TAG"
```

Once the CI passes, merge the pull request, wait for the CI to pass again then push a new tag:

```sh
git checkout main
git pull --autostash --prune --rebase
git tag "$TAG" --annotate --message "🔖 $TAG" --sign
git push --tags
```

> [!NOTE]
> `prepublishOnly` will automatically run the build before publishing.
