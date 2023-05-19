CREATE TABLE IF NOT EXISTS "sqlfx_migrations" (
        migration_id integer PRIMARY KEY NOT NULL,
        created_at datetime NOT NULL DEFAULT current_timestamp,
        name VARCHAR(255) NOT NULL
      );
CREATE TABLE people (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at datetime NOT NULL DEFAULT current_timestamp
      );
CREATE TABLE sqlite_sequence(name,seq);

INSERT INTO sqlfx_migrations VALUES(1,'2023-05-19 11:12:05','create people');