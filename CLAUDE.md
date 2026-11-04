# fluent-proto

TypeScript library for defining Protocol Buffer schemas in code. A single builder definition is the source of truth for three outputs: `.proto` text, Zod schemas, and inferred TS types. Published to npm. Its public API is what users depend on, so treat any change to exports, generated output or inferred types as a breaking change.

`README.md` is the user documentation. Read it first to learn what the library does and how it's used: the Quick start, then the Guide sections on fields, required vs optional, enums, oneof, imports, reserved numbers and custom schemas, then Limitations. This file covers only what's needed to work on the code.

## Map

- `src/fluent-proto.ts`: the `FluentProto` builder class (`syntax`, `package`, `import`, `enum`, `message`, `service`), plus all the type-level inference behind `.schemas`. Most changes land here.
- `src/proto-converter.ts`: serializes a builder to `.proto` text. Each definition serializes itself.
- `src/definitions/`: one class per proto construct, each with `serialize()`.
- `src/fields/`: field types (`f.string()`, `f.int()`, `f.ref()`, `f.map()`, `oneof`, ...) and the `f` factory in `field-builder.ts`.
- `src/index.ts`: main-entry exports. Anything not exported here is internal.
- `tests/`: there's one file per output: `schemas`, `proto-converter`, and `typelevel.test.ts` for inferred types. Shared complex definitions live in `fixtures.ts`.

## Working on it

```bash
npm test           # vitest, including type-level tests (typecheck enabled in vitest.config.ts)
npm run typecheck  # tsc --noEmit
npm run build      # tsc -> dist/
npm run format     # prettier over src/ and tests/
```

A change is done when `npm test` and `npm run typecheck` both pass. Any behavior change needs tests for every output it affects. If it touches inference, `tests/typelevel.test.ts` needs a test too.

If a change affects public behavior, generated output or limitations, update `README.md` in the same change. Its examples show real output, so re-run any example you touch and paste what it actually prints.

## Things that aren't obvious

- `module`/`moduleResolution: nodenext` with `"type": "commonjs"`: the package compiles to CommonJS, but relative imports still need the `.js` extension, including in `.ts` files.
- Runtime and types must agree. Every runtime behavior in `fluent-proto.ts` has a type-level mirror, so update both together.
- Generated `.proto` must be valid protobuf (for example, no labels inside a `oneof`). Tests compare strings and won't catch invalid output, so check serialization changes with `protoc` when it's installed.
