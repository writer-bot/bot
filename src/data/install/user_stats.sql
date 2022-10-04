CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY auto_increment,
    user TEXT NOT NULL,
    name TEXT NOT NULL,
    value INTEGER DEFAULT 0
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;