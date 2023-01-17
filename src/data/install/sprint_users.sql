CREATE TABLE IF NOT EXISTS sprint_users (
    id INTEGER PRIMARY KEY auto_increment,
    sprint INTEGER NOT NULL,
    user VARCHAR(255) NOT NULL,
    timejoined BIGINT DEFAULT 0,
    starting_wc INTEGER DEFAULT 0,
    current_wc INTEGER DEFAULT 0,
    ending_wc INTEGER DEFAULT 0,
    project INTEGER NULL,
    event INTEGER NULL,
    sprint_type VARCHAR(255) NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
