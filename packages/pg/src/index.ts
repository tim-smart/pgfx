/**
 * @since 1.0.0
 */
import { Tag } from "@effect/data/Context"
import * as Debug from "@effect/data/Debug"
import type { Duration } from "@effect/data/Duration"
import { minutes } from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Config from "@effect/io/Config"
import * as ConfigSecret from "@effect/io/Config/Secret"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Pool from "@effect/io/Pool"
import type { Scope } from "@effect/io/Scope"
import * as Client from "@sqlfx/sql/Client"
import type { Connection } from "@sqlfx/sql/Connection"
import { SqlError } from "@sqlfx/sql/Error"
import type { Custom, Fragment, Primitive } from "@sqlfx/sql/Statement"
import * as Statement from "@sqlfx/sql/Statement"
import * as transform from "@sqlfx/sql/Transform"
import type { PendingQuery, PendingValuesQuery } from "postgres"
import postgres from "postgres"

export {
  /**
   * Column renaming helpers.
   *
   * @since 1.0.0
   */
  transform,
}

/**
 * @category model
 * @since 1.0.0
 */
export interface PgClient extends Client.Client {
  readonly config: PgClientConfig

  readonly json: (_: unknown) => Fragment
  readonly array: (_: ReadonlyArray<Primitive>) => Fragment
}

/**
 * @category tag
 * @since 1.0.0
 */
export const tag = Tag<PgClient>()

/**
 * @category constructor
 * @since 1.0.0
 */
export interface PgClientConfig {
  readonly url?: ConfigSecret.ConfigSecret

  readonly host?: string
  readonly port?: number
  readonly path?: string
  readonly ssl?: boolean
  readonly database?: string
  readonly username?: string
  readonly password?: ConfigSecret.ConfigSecret

  readonly idleTimeout?: Duration
  readonly connectTimeout?: Duration

  readonly minConnections?: number
  readonly maxConnections?: number
  readonly connectionTTL?: Duration

  readonly transformResultNames?: (str: string) => string
  readonly transformQueryNames?: (str: string) => string
}

const escape = Statement.defaultEscape('"')

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: PgClientConfig,
): Effect.Effect<Scope, never, PgClient> =>
  Effect.gen(function* (_) {
    const compiler = makeCompiler(options.transformQueryNames)

    const transformRows = Client.defaultRowTransform(
      options.transformResultNames!,
    )

    const opts: postgres.Options<{}> = {
      max: 1,
      max_lifetime: 0,
      idle_timeout: options.idleTimeout
        ? Math.round(options.idleTimeout.millis / 1000)
        : undefined,
      connect_timeout: options.connectTimeout
        ? Math.round(options.connectTimeout.millis / 1000)
        : undefined,

      host: options.host,
      port: options.port,
      ssl: options.ssl,
      path: options.path,
      database: options.database,
      username: options.username,
      password: options.password
        ? ConfigSecret.value(options.password)
        : undefined,
    }

    const makeConnection = pipe(
      Effect.acquireRelease(
        Effect.sync(() =>
          options.url
            ? postgres(ConfigSecret.value(options.url), opts)
            : postgres(opts),
        ),
        pg => Effect.promise(() => pg.end()),
      ),
      Effect.map((pg): Connection => {
        const run = (query: PendingQuery<any> | PendingValuesQuery<any>) =>
          Effect.asyncInterrupt<never, SqlError, ReadonlyArray<any>>(resume => {
            query
              .then(_ => resume(Debug.untraced(() => Effect.succeed(_))))
              .catch(error =>
                resume(
                  Debug.untraced(() =>
                    Effect.fail(
                      SqlError(error.message, { ...error.__proto__ }),
                    ),
                  ),
                ),
              )
            return Effect.sync(() => query.cancel())
          })

        const runTransform = options.transformResultNames
          ? (query: PendingQuery<any>) => Effect.map(run(query), transformRows)
          : run

        return {
          execute(statement) {
            const [sql, params] = compiler.compile(statement)
            return runTransform(pg.unsafe(sql, params as any))
          },
          executeWithoutTransform(statement) {
            const [sql, params] = compiler.compile(statement)
            return run(pg.unsafe(sql, params as any))
          },
          executeValues(statement) {
            const [sql, params] = compiler.compile(statement)
            return run(pg.unsafe(sql, params as any).values())
          },
          executeRaw(sql, params) {
            return runTransform(pg.unsafe(sql, params as any))
          },
          compile(statement) {
            return Effect.sync(() => compiler.compile(statement))
          },
        }
      }),
    )

    const pool = yield* _(
      Pool.makeWithTTL(
        makeConnection,
        options.minConnections ?? 1,
        options.maxConnections ?? 10,
        options.connectionTTL ?? minutes(45),
      ),
    )

    return Object.assign(Client.make(Effect.scoped(pool.get()), pool.get()), {
      config: options,
      json: (_: unknown) => PgJson(_),
      array: (_: ReadonlyArray<Primitive>) => PgArray(_),
    })
  })

/**
 * @category constructor
 * @since 1.0.0
 */
export const makeLayer = (config: Config.Config.Wrap<PgClientConfig>) =>
  Layer.scoped(tag, Effect.flatMap(Effect.config(Config.unwrap(config)), make))

/**
 * @category constructor
 * @since 1.0.0
 */
export const makeCompiler = (transform?: (_: string) => string) => {
  const pg = postgres({ max: 0 })
  return Statement.makeCompiler<PgCustom>(
    _ => `$${_}`,
    transform ? _ => escape(transform(_)) : escape,
    (placeholders, valueAlias, valueColumns, values) => [
      `(values ${placeholders}) AS ${valueAlias}${valueColumns}`,
      values.flat(),
    ],
    (type, placeholder) => {
      switch (type.kind) {
        case "PgJson": {
          return [placeholder(), [pg.json(type.i0 as any) as any]]
        }
        case "PgArray": {
          return [`ARRAY [${type.i0.map(placeholder).join(",")}]`, type.i0]
        }
      }
    },
  )
}

// custom types

type PgCustom = PgJson | PgArray

/** @internal */
interface PgJson extends Custom<"PgJson", unknown> {}
/** @internal */
const PgJson = Statement.custom<PgJson>("PgJson")

/** @internal */
interface PgArray extends Custom<"PgArray", ReadonlyArray<Primitive>> {}
/** @internal */
const PgArray = Statement.custom<PgArray>("PgArray")
