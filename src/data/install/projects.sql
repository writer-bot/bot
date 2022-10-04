CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY auto_increment,
    user TEXT NOT NULL,
    name TEXT NOT NULL,
    shortname TEXT NOT NULL,
    words INTEGER DEFAULT 0,
    completed BIGINT DEFAULT 0,
    status VARCHAR(255) NULL,
    genre VARCHAR(255) NULL,
    description TEXT NULL,
    link VARCHAR(255) NULL,
    image VARCHAR(255) NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;