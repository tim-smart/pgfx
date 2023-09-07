import { pipe } from "@effect/data/Function"
import * as Config from "@effect/io/Config"
import * as ConfigSecret from "@effect/io/ConfigSecret"
import * as Effect from "@effect/io/Effect"
import * as Sql from "@sqlfx/mysql"

const SqlLive = Sql.makeLayer({
  database: Config.succeed("effect_dev"),
  username: Config.succeed("effect"),
  password: Config.succeed(ConfigSecret.fromString("password")),
  transformQueryNames: Config.succeed(Sql.transform.fromCamel),
  transformResultNames: Config.succeed(Sql.transform.toCamel),
})

const program = Effect.gen(function* (_) {
  const sql = yield* _(Sql.tag)
  const result = yield* _(
    sql.withTransaction(sql`SELECT * FROM people LIMIT 1`),
    sql.withTransaction,
  )
  console.log(result)
})

pipe(
  program,
  Effect.provideLayer(SqlLive),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork,
)
