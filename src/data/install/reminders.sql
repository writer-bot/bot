CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY auto_increment,
    user TEXT NULL,
    guild TEXT NULL,
    time BIGINT NOT NULL,
    channel TEXT NOT NULL,
    message VARCHAR(255) NOT NULL,
    intervaltime BIGINT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;