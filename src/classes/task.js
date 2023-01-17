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
     * Cancel tasks of a given object
     * @param db
     * @param object
     * @param object_id
     * @returns {Promise<*>}
     */
    static async cancel(db, object, object_id) {
        return db.delete('tasks', {'object': object, 'objectid': object_id});
    }

    /**
     * Create a new task (or update the time if it already exists)
     * @param db
     * @param type
     * @param time
     * @param object
     * @param object_id
     * @returns {Promise<number|*>}
     */
    static async create(db, type, time, object, object_id) {

        // Does the record already exist?
        let record = await db.get('tasks', {'type': type, 'object': object, 'objectid': object_id});
        if (record) {
            // Update the time of the task.
            record.time = time;
            return await db.update('tasks', record);
        } else {
            // Insert a new task.
            return await db.insert('tasks', {'type': type, 'time': time, 'object': object, 'objectid': object_id});
        }

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

        } else if (this.object === 'sprint') {

            const task = require('./../tasks/sprint');
            result = await task(this._client, this._db, this);

        } else {
            logger.error('[TASK] Invalid task object: ' + this.object);
        }

        // If we finished the task, and it's not a recurring task, delete it.
        if (result && !this.isRecurring()) {
            await this.delete();
        } else {
            // Otherwise, set its processing status to 0 to try again.
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
        const Goal = require('./goal');
        await Goal.setupTasks(db);

        // Set up sprint rubbish collection task.
        const Sprint = require('./sprint');
        await Sprint.setupTasks(db);

        // Close database connection.
        await db.end();

    }

}

module.exports = Task;