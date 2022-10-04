CREATE TABLE IF NOT EXISTS bot_settings (
    id INTEGER PRIMARY KEY auto_increment,
    setting TEXT NOT NULL,
    value TEXT NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;