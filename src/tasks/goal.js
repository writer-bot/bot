const Helper = require('../classes/helper');
const User = require('../classes/user');
const logger = require('./../utils/logger');

const func = async (client, db, task) => {

    // Reset is the only type of goal task.
    if (task.type === 'reset') {

        // Find all the goals which are due a reset.
        const now = Helper.getUnixTimestamp();
        const records = await db.get_all_sql('SELECT * FROM user_goals WHERE reset <= ?', [now]);
        let completed = 0;
        let total = 0;

        if (records) {

            total = records.length;

            for (let row of records) {

                // Get the user whose goal this is.
                const user = new User(row.user, db);
                await user.resetGoal(row);
                completed++;

            }

        }

        logger.info('[TASK]['+task.object+']['+task.type+'] Task completed for ' + completed + '/' + total + ' records');

        return true;

    } else {
        return false;
    }

};

module.exports = func;