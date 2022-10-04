CREATE TABLE IF NOT EXISTS user_challenges (
    id INTEGER PRIMARY KEY auto_increment,
    user TEXT NOT NULL,
    challenge TEXT NOT NULL,
    completed BIGINT DEFAULT 0,
    xp INTEGER NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;