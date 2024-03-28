---
title: Migrator.ts
nav_order: 3
parent: "@sqlfx/mysql2"
---

## Migrator overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructor](#constructor)
  - [makeLayer](#makelayer)
  - [run](#run)
- [loader](#loader)
  - [fromBabelGlob](#frombabelglob)
  - [fromDisk](#fromdisk)
  - [fromGlob](#fromglob)

---

# constructor

## makeLayer

**Signature**

```ts
export declare const makeLayer: (
  options: _.MigratorOptions
) => Layer.Layer<never, _.MigrationError | SqlError, Sql.MysqlClient>
```

Added in v1.0.0

## run

**Signature**

```ts
export declare const run: (
  options: _.MigratorOptions
) => Effect.Effect<ReadonlyArray<readonly [id: number, name: string]>, SqlError | _.MigrationError, Sql.MysqlClient>
```

Added in v1.0.0

# loader

## fromBabelGlob

**Signature**

```ts
export declare const fromBabelGlob: (migrations: Record<string, any>) => _.Loader
```

Added in v1.0.0

## fromDisk

**Signature**

```ts
export declare const fromDisk: (directory: string) => _.Loader
```

Added in v1.0.0

## fromGlob

**Signature**

```ts
export declare const fromGlob: (migrations: Record<string, () => Promise<any>>) => _.Loader
```

Added in v1.0.0
