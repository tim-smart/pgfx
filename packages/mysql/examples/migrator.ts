import { pipe } from "@effect/data/Function"
import * as Config from "@effect/io/Config"
import * as ConfigSecret from "@effect/io/Config/Secret"
import * as Effect from "@effect/io/Effect"
import * as Sql from "@sqlfx/mysql"
import * as Migrator from "@sqlfx/mysql/Migrator"
import * as Layer from "@effect/io/Layer"

const program = Effect.gen(function* (_) {
  const sql = yield* _(Sql.tag)

  const [{ id }] = yield* _(
    Effect.zipRight(
      sql`INSERT INTO people (name) VALUES ('John')`,
      sql<{ id: number }>`SELECT LAST_INSERT_ID() AS id`,
    ),
  )

  const person = yield* _(sql`SELECT * FROM people WHERE id = ${id}`)
  console.log(person[0])
})

const SqlLive = Sql.makeLayer({
  database: Config.succeed("effect_dev"),
  username: Config.succeed("effect"),
  password: Config.succeed(ConfigSecret.fromString("password")),
  transformQueryNames: Config.succeed(Sql.transform.fromCamel),
  transformResultNames: Config.succeed(Sql.transform.toCamel),
})

const MigratorLive = Layer.provide(
  SqlLive,
  Migrator.makeLayer({
    loader: Migrator.fromDisk(`${__dirname}/migrations`),
    schemaDirectory: "examples/migrations",
  }),
)

pipe(
  program,
  Effect.provideLayer(Layer.mergeAll(SqlLive, MigratorLive)),
  Effect.tapErrorCause(Effect.logErrorCause),
  Effect.runFork,
)
