import * as Effect from "@effect/io/Effect"
import * as Sql from "@sqlfx/sqlite/wasm"

export default Effect.flatMap(
  Sql.tag,
  sql =>
    sql`
      CREATE TABLE people (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at datetime NOT NULL DEFAULT current_timestamp
      )
    `,
)
