# `@natoboram/sv-kysely`

[![Node.js CI](https://github.com/NatoBoram/sv-kysely/actions/workflows/node.js.yaml/badge.svg)](https://github.com/NatoBoram/sv-kysely/actions/workflows/node.js.yaml) [![GitHub Downloads](https://img.shields.io/github/downloads/natoboram/sv-kysely/total?logo=github&color=0969da)](https://github.com/natoboram/sv-kysely/releases) [![NPM Downloads](https://img.shields.io/npm/dt/%40natoboram/sv-kysely?logo=npm&color=CB3837)](https://www.npmjs.com/package/@natoboram/sv-kysely)

[Kysely](https://github.com/kysely-org/kysely) is a type-safe TypeScript SQL query builder.

## Usage

```sh
sv add @natoboram/sv-kysely
```

## What you get

- a setup that keeps your database access in SvelteKit's server files
- an `.env.local` file to store your credentials
- a Docker configuration to help with running a local database

> [!NOTE]
> For compatibility with the Better Auth add-on, you need to manually import its SQL migration into your Kysely migrations. See [Generating Schema](https://better-auth.com/docs/concepts/database#generating-schema) and [Core Schema](https://better-auth.com/docs/concepts/database#core-schema) for more details.

## License

This _Source Code Form_ is subject to the terms of the **Mozilla Public License v2.0**. If a copy of the MPL was not distributed with this file, You can obtain one at <https://mozilla.org/MPL/2.0>.
