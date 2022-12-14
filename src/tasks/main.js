const logger = require('./../utils/logger');
const Helper = require('../classes/helper');
const DB = require('../classes/database');
const Task = require('../classes/task');

const cron = async function(client){

    logger.info(`[TASK] Checking for pending tasks...`);

    const db = new DB();
    await db.connect();

    // Check for pending tasks.
    const now = Helper.getUnixTimestamp();
    const pending = await db.get_all_sql('SELECT * FROM tasks WHERE time <= ? ORDER BY id ASC', [now]);
    if (pending) {
        for (let row of pending) {

            const task = new Task(row, client, db);
            await task.run();

        }
    }

    await db.end();

};

module.exports = cron;