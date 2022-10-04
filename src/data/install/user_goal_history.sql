CREATE TABLE IF NOT EXISTS user_goals_history (
    id INTEGER PRIMARY KEY auto_increment,
    user TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    goal INTEGER NOT NULL,
    result INTEGER NOT NULL,
    completed BOOLEAN NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;