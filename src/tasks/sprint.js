const Helper = require('../classes/helper');
const Sprint = require('../classes/sprint');
const Task = require('../classes/task');
const logger = require('./../utils/logger');

const func = async (client, db, task) => {

    // Rubbish collection - Clear out old sprint_user records to keep database size down and help performance of queries.
    if (task.type === 'rc') {

        const cutoff = Helper.getUnixTimestamp() - (Sprint.RUBBISH_COLLECTION * 86400);

        logger.info('[TASK]['+task.object+']['+task.type+'] Searching for sprint_users records created before ' + cutoff);

        const query = `
            SELECT su.id
            FROM sprint_users su
            JOIN sprints s ON s.id = su.sprint
            WHERE s.created <= ?`;

        const records = await db.get_all_sql(query, [cutoff]);

        if (records) {

            await db.execute(`
                DELETE FROM sprint_users WHERE id IN (
                    ${query}
                )
            `, [cutoff]);

        }

        logger.info('[TASK]['+task.object+']['+task.type+'] Deleted ' + (records ? records.length : 0) + ' sprint_users records identified for rubbish collection');

        // Now clean up old sprint which never got finished properly.
        logger.info('[TASK]['+task.object+']['+task.type+'] Searching for old unfinished sprints to delete');

        const one_day_ago = Helper.getUnixTimestamp() - 86400;
        const old_sprints = await db.get_all_sql('SELECT id FROM sprints WHERE completed = 0 AND end <= ?', [one_day_ago]);

        if (old_sprints) {

            for (const old_sprint of old_sprints) {

                // Remove the sprint.
                await db.delete('sprints', {'id': old_sprint.id});

                // Remove any sprint user records associated with it.
                await db.delete('sprint_users', {'sprint': old_sprint.id});

            }

        }

        logger.info('[TASK]['+task.object+']['+task.type+'] Deleted ' + (old_sprints ? old_sprints.length : 0) + ' old unfinished sprints identified for rubbish collection');

        return true;

    }

    // Get the sprint object we are using.
    const sprint = await Sprint.get(db, task.objectid);

    // Start the sprint after a delay.
    if (task.type === 'start') {

        if (!sprint || sprint.isFinished() || sprint.isComplete()) {
            logger.info('[TASK]['+task.object+']['+task.type+'][SPRINT#'+sprint.id+'] Sprint is invalid. Might already be complete.');
            return true;
        }

        // Post the starting message in the relevant channel.
        await sprint.post_start(null, client);

        // Then schedule the task to end the sprint.
        await Task.create(db, 'end', sprint.end, 'sprint', sprint.id);

        logger.info('[TASK]['+task.object+']['+task.type+'][SPRINT#'+sprint.id+'] Task completed');
        return true;

    } else if (task.type === 'end') {

        // End the sprint and post the message asking for word counts.
        if (!sprint || sprint.isComplete()) {
            logger.info('[TASK]['+task.object+']['+task.type+'][SPRINT#'+sprint.id+'] Sprint is invalid. Might already be complete.');
            return true;
        }

        // Print the end message.
        await sprint.end_sprint(null, client);

        logger.info('[TASK]['+task.object+']['+task.type+'][SPRINT#'+sprint.id+'] Task completed');
        return true;

    } else if (task.type === 'complete') {

        // End the sprint and post the message asking for word counts.
        if (!sprint || sprint.isComplete()) {
            logger.info('[TASK]['+task.object+']['+task.type+'][SPRINT#'+sprint.id+'] Sprint is invalid. Might already be complete.');
            return true;
        }

        // Print the end message.
        await sprint.complete_sprint(null, client);

        logger.info('[TASK]['+task.object+']['+task.type+'][SPRINT#'+sprint.id+'] Task completed');
        return true ;

    }

    else {
        return false;
    }

};

module.exports = func;