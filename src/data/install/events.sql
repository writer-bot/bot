CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY auto_increment,
    guild TEXT NOT NULL,
    channel TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    img VARCHAR(255) NULL,
    colour VARCHAR(255) NOT NULL DEFAULT '15105570',
    startdate BIGINT NULL,
    enddate BIGINT NULL,
    started INTEGER NOT NULL DEFAULT 0,
    ended INTEGER NOT NULL DEFAULT 0
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;