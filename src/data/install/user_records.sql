CREATE TABLE IF NOT EXISTS user_records (
    id INTEGER PRIMARY KEY auto_increment,
    user TEXT NOT NULL,
    record TEXT NOT NULL,
    value REAL DEFAULT 0
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;