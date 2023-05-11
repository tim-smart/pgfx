/**
 * @since 1.0.0
 */
import * as Data from "@effect/data/Data"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as NFS from "node:fs"
import * as Path from "node:path"
import * as Pg from "pgfx"

/**
 * @category model
 * @since 1.0.0
 */
export interface MigratorOptions {
  readonly directory: string
  readonly table?: string
}

interface Migration {
  readonly migrationid: number
  readonly name: string
  readonly createdat: Date
}

/**
 * @category errors
 * @since 1.0.0
 */
export interface MigrationError extends Data.Case {
  readonly _tag: "MigrationError"
  readonly reason: "bad-state" | "import-error" | "failed" | "duplicates"
  readonly message: string
}
/**
 * @category errors
 * @since 1.0.0
 */
export const MigrationError = Data.tagged<MigrationError>("MigrationError")

/**
 * @category constructor
 * @since 1.0.0
 */
export const run = ({
  directory,
  table = "pgfx_migrations",
}: MigratorOptions) =>
  Effect.gen(function* (_) {
    const sql = yield* _(Pg.tag)

    const ensureMigrationsTable = Effect.catchAll(
      sql`select ${table}::regclass`,
      () => sql`
        CREATE TABLE IF NOT EXISTS ${sql(table)} (
          migrationid serial primary key,
          createdat timestamp with time zone not null default now(),
          name text
        )
      `,
    )

    const lockMigrationsTable = sql`
      LOCK TABLE ${sql(table)} IN ACCESS EXCLUSIVE MODE
    `

    const insertMigration = (id: number, name: string) => sql`
      INSERT INTO ${sql(table)} (
        migrationid,
        name
      ) VALUES (
        ${id},
        ${name}
      )
    `

    const latestMigration = Effect.map(
      sql<Array<Migration>>`
        SELECT * FROM ${sql(table)} ORDER BY migrationid DESC LIMIT 1
      `,
      (_) => Option.fromNullable(_[0]),
    )

    const migrationsFromDisk = Effect.catchAllDefect(
      Effect.sync(() =>
        NFS.readdirSync(directory)
          .map((_) =>
            Option.fromNullable(Path.basename(_).match(/^(\d+)_([^.]+)\.js$/)),
          )
          .flatMap(
            Option.match(
              () => [],
              ([basename, id, name]) => [[Number(id), name, basename]] as const,
            ),
          )
          .sort(([a], [b]) => a - b),
      ),
      (_) =>
        Effect.as(Effect.log(`Could not load migrations from disk: ${_}`), []),
    )

    const loadMigration = (path: string) => {
      const fullPath = Path.join(directory, path)
      return pipe(
        Effect.tryCatchPromise(
          () => import(fullPath),
          () =>
            MigrationError({
              reason: "import-error",
              message: `Could not import migration: ${fullPath}`,
            }),
        ),
        Effect.flatMap((_) =>
          _.default
            ? Effect.succeed(_.default)
            : Effect.fail(
                MigrationError({
                  reason: "import-error",
                  message: `Default export not found for migration: ${fullPath}`,
                }),
              ),
        ),
        Effect.filterOrFail(
          (_): _ is Effect.Effect<never, never, unknown> => Effect.isEffect(_),
          () =>
            MigrationError({
              reason: "import-error",
              message: `Default export was not an Effect for migration: ${fullPath}`,
            }),
        ),
      )
    }

    const runMigration = (
      id: number,
      name: string,
      effect: Effect.Effect<never, never, unknown>,
    ) =>
      Effect.zipRight(
        Effect.orDieWith(effect, (_) =>
          MigrationError({
            reason: "failed",
            message: `Migration ${id}_${name} failed: ${JSON.stringify(_)}`,
          }),
        ),
        insertMigration(id, name),
      )

    // === run

    const run = Effect.gen(function* (_) {
      yield* _(lockMigrationsTable)

      const [latestMigrationId, current] = yield* _(
        Effect.all(
          Effect.map(
            latestMigration,
            Option.match(
              () => 0,
              (_) => _.migrationid,
            ),
          ),
          migrationsFromDisk,
        ),
      )

      if (new Set(current.map(([id]) => id)).size !== current.length) {
        yield* _(
          Effect.fail(
            MigrationError({
              reason: "duplicates",
              message: "Found duplicate migration id's",
            }),
          ),
        )
      }

      const required: Array<
        readonly [
          id: number,
          name: string,
          effect: Effect.Effect<never, never, unknown>,
        ]
      > = []

      for (const [currentId, currentName, basename] of current) {
        if (currentId <= latestMigrationId) {
          continue
        }

        required.push([
          currentId,
          currentName,
          yield* _(loadMigration(basename)),
        ])
      }

      yield* _(
        Effect.forEachDiscard(required, ([id, name, effect]) =>
          pipe(
            Effect.logWarning(`Running migration`),
            Effect.zipRight(runMigration(id, name, effect)),
            Effect.logAnnotate("migration_id", String(id)),
            Effect.logAnnotate("migration_name", name),
          ),
        ),
      )

      yield* _(
        latestMigration,
        Effect.flatMap(
          Option.match(
            () => Effect.logInfo(`Migrations complete`),
            (_) =>
              pipe(
                Effect.logInfo(`Migrations complete`),
                Effect.logAnnotate(
                  "latest_migration_id",
                  _.migrationid.toString(),
                ),
                Effect.logAnnotate("latest_migration_name", _.name),
              ),
          ),
        ),
      )
    })

    yield* _(ensureMigrationsTable)
    yield* _(sql.withTransaction(run))
  })

/**
 * @category constructor
 * @since 1.0.0
 */
export const makeLayer = (options: MigratorOptions) =>
  Layer.effectDiscard(run(options))