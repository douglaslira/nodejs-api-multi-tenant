# API server

## Getting started

* clone the project
* npm install
* look at `./config.js` and set env variables as required (see Configuration below)
* run `npm run setup` - initialises the database, ensures indexes, creates default admin user
* run `npm start`

## Architecture

This is the API back-end system.

Note that the system is designed to be multi-tenant, where tenant "domains" each host a separate
corpus stored in a separate mongodb database and indexed in a separate elasticsearch index.

Managing each domain in a separate DB gives us some flexibility to manage scale, back-ups, and other
issues in different ways for different domains. It also makes it easier to avoid accidentally leaking
data from one domain to another (e.g. you can't accidentally forget to filter your queries to the
correct domain).

User _accounts_ are stored per domain, so you must register separately with each domain.

Of course it is a compromise: in this case we're trading off flexibility, security and scalability against
complexity. For example we have to change the way we set up our mongoose models so that they are
initialised once for each domain using a separate connection (due to a mongoose implementation detail),
and we have to make sure to use the correct connection when querying or updating data for each domain.

Site-wide administration (administration of domains) uses separate administrator accounts in the `_ns_admin` database.

## Code

### formatting, es2017+, etc.

We're running `prettier` via githook, so you'll see it run when you commit. It is configured to not write
trailing semi-colons.

We have all the esXXXX things - es2015, es2016, es2017, object-rest-spread - courtesy of babel.

### Tests

We're testing via jest, with test files adjacent to the unit under test and named \*.test.js, eg.

```
├── defaultUser.js
├── defaultUser.test.js
```

There are a couple of handy scripts -

* `npm test` runs the tests once and then stops.
* `npm run test:watch` watches for file changes and runs the tests affected by any files modified
since last git commit at each save.
* `npm run test:watchAll` as above, but runs all tests, not just the ones affect by modified files.

### Configuration

Configuration uses 12factor-config, extracting all of the meaningful config properties to env
variables as described by [The Twelve Factor App](https://12factor.net/).

You'll need to set env vars for all of the non-default properties, and maybe override some of
the defaults too.

One way to do this in development is to create a .env file in the root of the project (it will
be .gitignored) and `source ./.env` before running the app.

In code you can access the config properties simply by importing `config.js` from the project root,
e.g. a file in ./src could use config like this:

```
import `../config`
console.log(`the bind port is ${config.bindPort}`)
```

### Logging

Logging is handled by [bunyan](https://github.com/trentm/node-bunyan). You'll need to install
bunyan globally because the default scripts pipe the output through bunyan in order to prettify
the json output.

`npm install -g bunyan`
