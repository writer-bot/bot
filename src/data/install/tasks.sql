CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY auto_increment,
    time BIGINT NOT NULL,
    type VARCHAR(255) NOT NULL,
    object VARCHAR(255) NULL,
    objectid INTEGER NULL,
    processing INTEGER NOT NULL DEFAULT 0,
    recurring INTEGER NOT NULL DEFAULT 0,
    runeveryseconds INTEGER NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;