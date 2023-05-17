/**
 * @since 1.0.0
 */
import { Tag } from "@effect/data/Context"
import type * as Effect from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import type { SqlError } from "@sqlfx/sql/Error"
import type { Primitive, Statement } from "@sqlfx/sql/Statement"

/**
 * @category model
 * @since 1.0.0
 */
export interface Connection {
  readonly execute: <A extends Row>(
    statement: Statement<A>,
  ) => Effect.Effect<never, SqlError, ReadonlyArray<A>>

  readonly executeValues: <A extends Row>(
    statement: Statement<A>,
  ) => Effect.Effect<never, SqlError, ReadonlyArray<ReadonlyArray<Primitive>>>

  readonly executeRaw: (
    sql: string,
    params?: ReadonlyArray<Primitive> | undefined,
  ) => Effect.Effect<never, SqlError, ReadonlyArray<Row>>
}

/**
 * @since 1.0.0
 */
export namespace Connection {
  /**
   * @category model
   * @since 1.0.0
   */
  export type Acquirer = Effect.Effect<Scope, SqlError, Connection>
}

/**
 * @category tag
 * @since 1.0.0
 */
export const Connection = Tag<Connection>()

/**
 * @category model
 * @since 1.0.0
 */
export type Row = { readonly [column: string]: Primitive }
