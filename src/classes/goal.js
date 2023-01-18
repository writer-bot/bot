const logger = require('./../utils/logger');

class Goal {

    static TYPES = {
        'daily': 'Daily',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'yearly': 'Yearly',
    };

    // Task will run and check goals every 15 minutes.
    static TASK_RESET_TIME = 15 * 60;

    /**
     * Set up the task record for goal resets.
     * @param db
     * @returns {Promise<void>}
     */
    static async setupTasks(db) {

        logger.info('[TASK][GOAL] Setting up jobs');

        // Start off by deleting the existing goal task.
        await db.delete('tasks', {'object': 'goal', 'type': 'reset'});

        // Now re-create it, with default values, so we know it will run at correct time.
        await db.insert('tasks', {'object': 'goal', 'time': 0, 'type': 'reset', 'recurring': 1, 'runeveryseconds': Goal.TASK_RESET_TIME});

    }

}

module.exports = Goal;