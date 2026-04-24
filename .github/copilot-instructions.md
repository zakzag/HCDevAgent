## Project context

This is an autonomous agent project, which picks processes jira issues and implement them with tests, managing jira issue status and also manages CVS like git 

Used tech debt and Libraries

* language: NodeJs and TypeScript
* dependency injection: InversifyJS
* build tool: Vite
* server: Fastify
* testing: Vitest
* schema validation: runtypes
* database: MongoDB
* database driver: Mongoose
* logging: pino
* error handling: custom error classes
* documentation: markdown files in docs/\*
* monorepo: turbo if needed!
* linting: ESLint with Airbnb style guide

## General

* always keep SOLID principles and CLEAN CODING in mind
  * one function must have one responsibility
  * classes must be open for extension, but closed for modification
  * classes must depend on abstractions, not concretions
* use design patterns where appropriate
* write pure functions, and avoid side effects if possible
* switch on strict mode in tsconfig.json
* always handle errors, and never ignore them
* always write unit tests for new code, and cover all test cases, including error cases and edge cases
* always write documentation for new code, and update documentation if existing code is changed

## Styles

* use camelCase for variables and function names
* use PascalCase for classes
* always use inline export, instead of a one-export-all type of export
* always use async/await for async code

## Testing

* mock everything, don't use real dependencies
* cover all test cases, and code branches
* cover all error cases
* cover all edge cases
* cover all boundary cases
* use type "never" if the type not really important
* use type unknown if type not really known
* make a folder for mocking classes, functions, and keep it up-to-date, and use it for all tests, and never create mocks
in the test files

## Types

* keep types as simple as possible
* don't use "any" as a type, only if really necessary
* use "unknown" as a type if you don't know the type, and syntactically correct
* never made inline types like: const upserted = (result as { upsertedId?: unknown }).upsertedId != null;
* create new type instead of inline types
* always use inline export for exported entities, instead of a one-export-all type of export at the end of the file
* always use async/await for async code

## documentation

* add documentation for classes, functions, and types using JSDoc style comments, and use markdown files for higher
level documentation, such as architecture, design decisions, and usage guides
* architecture decisions and design decisions must be documented in the docs/ folder, and the documentation file name
must be in the following format, where HHmm is the current hour and minute 24h style:
YYYY-MM-DD-HHmm - architecture-decision-description.md
* if you add an example to the documentation, please add it to the same folder,
same datetime, but the filename should end with "-EXAMPLE.md"

### Error handling

* use custom error classes
* create new error classes if the error type does not fit to any of the existing ones

### Testing

* mock and stub folder is src/test/mocks/\*

