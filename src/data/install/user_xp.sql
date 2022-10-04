CREATE TABLE IF NOT EXISTS user_xp (
    id INTEGER PRIMARY KEY auto_increment,
    user TEXT NOT NULL,
    xp INTEGER DEFAULT 0
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;