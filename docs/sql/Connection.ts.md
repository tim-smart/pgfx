---
title: Connection.ts
nav_order: 2
parent: "@sqlfx/sql"
---

## Connection overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [model](#model)
  - [Connection (interface)](#connection-interface)
  - [Row (type alias)](#row-type-alias)
- [tag](#tag)
  - [Connection](#connection)

---

# model

## Connection (interface)

**Signature**

```ts
export interface Connection {
  readonly execute: <A extends object = Row>(
    statement: Statement<A>
  ) => Effect.Effect<never, SqlError, ReadonlyArray<A>>

  readonly executeWithoutTransform: <A extends object = Row>(
    statement: Statement<A>
  ) => Effect.Effect<never, SqlError, ReadonlyArray<A>>

  readonly executeValues: <A extends object = Row>(
    statement: Statement<A>
  ) => Effect.Effect<never, SqlError, ReadonlyArray<ReadonlyArray<Primitive>>>

  readonly executeRaw: <A extends object = Row>(
    sql: string,
    params?: ReadonlyArray<Primitive> | undefined
  ) => Effect.Effect<never, SqlError, ReadonlyArray<A>>

  readonly compile: <A>(
    statement: Statement<A>
  ) => Effect.Effect<never, SqlError, readonly [sql: string, params: ReadonlyArray<Primitive>]>
}
```

Added in v1.0.0

## Row (type alias)

**Signature**

```ts
export type Row = { readonly [column: string]: Primitive }
```

Added in v1.0.0

# tag

## Connection

**Signature**

```ts
export declare const Connection: Tag<Connection, Connection>
```

Added in v1.0.0
