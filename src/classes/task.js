const Goal = require('./goal');
const logger = require('./../utils/logger');
const DB = require('./database');
const Helper = require('../classes/helper');

class Task {

    /**
     * Construct the task record
     * @param record
     * @param client
     * @param db
     */
    constructor(record, client, db) {
        this._client = client;
        this._db = db;
        this.id = parseInt(record.id);
        this.time = parseInt(record.time);
        this.type = record.type;
        this.object = record.object;
        this.objectid = parseInt(record.objectid);
        this.processing = parseInt(record.processing);
        this.recurring = parseInt(record.recurring);
        this.runeveryseconds = parseInt(record.runeveryseconds);
    }

    /**
     * Check if the task is a recurring task
     * @returns {boolean}
     */
    isRecurring() {
        return (this.recurring === 1);
    }

    /**
     * Check if the task is already processing.
     * @returns {boolean}
     */
    isProcessing() {
        return (this.processing === 1);
    }

    /**
     * Mark the task as processing
     * @param val
     * @returns {*}
     */
    async setProcessing(val) {
        const params = {'id': this.id, 'processing': val};
        return this._db.update('tasks', params);
    }

    /**
     * Update the time on a recurring task, to when it should run next, based on "runeveryseconds" value.
     * @returns {*}
     */
    async setRecurTime() {
        const next = Helper.getUnixTimestamp() + this.runeveryseconds;
        const params = {'id': this.id, 'time': next};
        return this._db.update('tasks', params);
    }

    /**
     * Delete the task record
     * @returns {*}
     */
    async delete() {
        return this._db.delete('tasks', {'id': this.id});
    }

    /**
     * Run the task
     * @returns {Promise<boolean>}
     */
    async run() {

        // If the task is already processing, we don't need to do anything else.
        if (this.isProcessing()) {
            return true;
        }

        // Mark it as processing.
        await this.setProcessing(1);

        let result = false;

        logger.info('[TASK]['+this.object+']['+this.type+'] Running task...');

        // Goal task.
        if (this.object === 'goal') {

            const task = require('./../tasks/goal');
            result = await task(this._client, this._db, this);

        } else {
            logger.error('[TASK] Invalid task object: ' + this.object);
        }

        // If we finished the task, and it's not a recurring task, delete it.
        if (result && !this.isRecurring()) {
            await this.delete();
        } else {
            // Otherwise, set it's processing status to 0.
            await this.setProcessing(0);
        }

        // If it is a recurring task, update the time it should run next.
        if (this.isRecurring()) {
            await this.setRecurTime();
        }

    }

    /**
     * Setup all the core scheduled tasks which need to be run.
     * @returns void
     */
    static async setup() {

        // Create database connection to use in command.
        const db = new DB();
        await db.connect();

        logger.info('[TASK] Setting up scheduled tasks');

        // Set up the goal tasks, to reset goals for users.
        await Goal.setupTasks(db);

        // Close database connection.
        await db.end();

    }

}

module.exports = Task;