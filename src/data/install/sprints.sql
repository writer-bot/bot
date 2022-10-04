CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY auto_increment,
    guild TEXT NOT NULL,
    channel TEXT NOT NULL,
    start BIGINT NOT NULL,
    end BIGINT NOT NULL,
    end_reference BIGINT NOT NULL,
    length BIGINT NOT NULL,
    createdby TEXT NOT NULL,
    created BIGINT NOT NULL,
    completed BIGINT DEFAULT 0
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;