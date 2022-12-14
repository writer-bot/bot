const Helper = require('../classes/helper');
const Sprint = require('../classes/sprint');
const Task = require('../classes/task');
const logger = require('./../utils/logger');

const func = async (client, db, task) => {

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