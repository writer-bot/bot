const { PermissionsBitField } = require('discord.js');
const Helper = require('./helper');
const User = require('./user');

class Sprint {

    static DEFAULT_POST_DELAY = 2;
    static WINNING_POSITION = 1;
    static DEFAULT_LENGTH = 20;
    static MAX_LENGTH = 60;
    static DEFAULT_IN_MINS = 2;
    static MAX_IN_MINS = 1440;
    static DEFAULT_MAX_WPM = 150;

    /**
     * Construct the sprint object from its DB record
     * @param record
     * @param db
     */
    constructor(record, db) {
        this._db = db;
        this.id = record.id;
        this.guild = parseInt(record.guild);
        this.channel = parseInt(record.channel);
        this.start = record.start;
        this.end = record.end;
        this.end_reference = record.end_reference;
        this.length = record.length;
        this.createdby = record.createdby;
        this.created = record.created;
        this.completed = record.completed;
    }

    /**
     * Check if the sprint is marked as completed
     * @returns {boolean}
     */
    isComplete() {
        return (this.completed === 1);
    }

    /**
     * Check if the sprint is finished (past its end time).
     * @returns {boolean}
     */
    isFinished() {
        const now = Helper.getUnixTimestamp();
        return (now > this.end);
    }

    /**
     * Check if word count declaration is finished for this sprint
     * @returns {Promise<boolean>}
     */
    async isDeclarationFinished() {

        const results = this._db.get_all_sql('SELECT * FROM sprint_users WHERE sprint = ? AND ending_wc = 0 AND (sprint_type IS NULL OR sprint_type != ?)', [
            this.id, 'no-wordcount'
        ]);

        return (results.length === 0);

    }

    /**
     * Check if the sprint has started yet
     * @returns {boolean}
     */
    hasStarted() {
        const now = Helper.getUnixTimestamp();
        return (this.start <= now);
    }

    /**
     * Set a user as having joined the sprint
     * @param user_id
     * @param start
     * @param type
     * @param project_id
     * @returns {Promise<number>}
     */
    async join(user_id, start = 0, type = null, project_id = null) {

        let now = Helper.getUnixTimestamp();

        // If the sprint hasn't started yet, set the user's start time to the sprint start time, not the time now.
        if (!this.hasStarted()) {
            now = this.start;
        }

        return this._db.insert('sprint_users', {
            'sprint': this.id,
            'user': user_id,
            'starting_wc': start,
            'current_wc': start,
            'ending_wc': 0,
            'timejoined': now,
            'sprint_type': type,
            'project': project_id
        });

    }

    /**
     * Remove a user from the sprint
     * @param user_id
     * @returns {Promise<*>}
     */
    async leave(user_id) {
        return this._db.delete('sprint_users', {'sprint': this.id, 'user': user_id});
    }

    /**
     * Cancel the sprint
     * @returns {Promise<void>}
     */
    async cancel() {

        // Delete the sprints and sprint_users records.
        await this._db.delete('sprint_users', {'sprint': this.id});
        await this._db.delete('sprints', {'id': this.id});

        // TODO: Cancel task.

        // Decrement sprints created stat for creator.
        const creator = new User(this.createdby, this._db);
        await creator.addStat('sprints_started', -1);

    }

    /**
     * Get the users who are sprinting in this sprint
     * @returns {Promise<{length}|*|boolean>}
     */
    async getUsers() {
        return await this._db.get_all('sprint_users', {'sprint': this.id}, ['user']);
    }

    /**
     * Get an array of mentions for the users in this sprint
     * @returns {Promise<[]>}
     */
    async getMentions() {

        const users = await this.getUsers();
        const mentions = [];

        if (users) {
            for (const user of users) {
                let obj = new User(user.user);
                mentions.push(obj.getMention());
            }
        }

        return mentions;

    }

    /**
     * Check if a user is sprinting in this sprint
     * @param user_id
     * @returns {Promise<boolean>}
     */
    async isUserSprinting(user_id) {
        const record = await this.getUser(user_id);
        return (record !== false);
    }

    /**
     * Get the user's sprint record
     * @param user_id
     * @returns {Promise<*>}
     */
    async getUser(user_id) {
        return await this._db.get('sprint_users', {'sprint': this.id, 'user': user_id});
    }

    /**
     * Update a user's sprint record
     * @param user_id
     * @param start
     * @param current
     * @param ending
     * @param type
     * @param project_id
     * @returns {Promise<*>}
     */
    async updateUser(user_id, start = false, current = false, ending = false, type = false, project_id = false) {

        // Get the existing record for the user.
        const record = await this.getUser(user_id);

        // Update any fields which we passed through.
        if (start !== false) {
            record.starting_wc = start;
        }

        if (current !== false) {
            record.current_wc = current;
        }

        if (ending !== false) {
            record.ending_wc = ending;
        }

        if (type !== false) {
            record.sprint_type = type;
        }

        if (project_id !== false) {
            record.project = project_id;
        }

        return this._db.update('sprint_users', record);

    }

    /**
     * Calculate words per minute, from words written and seconds writing
     * @param words
     * @param seconds
     * @returns {number}
     */
    calculateWPM(words, seconds) {
        return Math.round(words /(seconds / 60), 1);
    }

    /**
     * Declare a word count for the user in the sprint
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @param user_sprint
     * @param amount
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    async setUserWordCount(interaction, db, sprint, user, user_sprint, amount) {

        // Before we update it, see if the WPM exceeds their max setting, in which case it's probably an error.
        const written = amount - parseInt(user_sprint.starting_wc);
        const writing_time = parseInt(sprint.end_reference) - parseInt(user_sprint.timejoined);
        const wpm = sprint.calculateWPM(written, writing_time);

        // Does the user have a setting for this?
        let max_wpm;
        const user_setting = await user.getSetting('maxwpm');
        if (user_setting) {
            max_wpm = user_setting.value;
        } else {
            max_wpm = Sprint.DEFAULT_MAX_WPM;
        }

        // If it exceeds this value, print an error because it's probably a mistake.
        if (wpm > max_wpm) {
            return await interaction.editReply(`${user.getMention()}, did you really mean to submit **${written}** words? That would be **${wpm}** wpm. If you did, please update your max WPM threshold by running \`/setting my update setting: Max WPM\``);
        }

        // Update the user's sprint record.
        if (sprint.isFinished()) {
            await sprint.updateUser(user.id, false, false, amount);
        } else {
            await sprint.updateUser(user.id, false, amount)
        }

        // Reload the user's sprint record.
        user_sprint = await sprint.getUser(user.id);

        // Which value are we displaying? Current or ending?
        let wc;
        if (sprint.isFinished()) {
            wc = user_sprint.ending_wc;
        } else {
            wc = user_sprint.current_wc;
        }

        await interaction.editReply(`${user.getMention()}, you updated your word count to **${wc}**. Total words written in this sprint: **${written}**`);

        // TODO: Task stuff.

    }

    /**
     * Run the start command
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @param length
     * @param in_mins
     * @returns {Promise<void>}
     */
    static async command_start(interaction, db, sprint, user, length, in_mins) {

        // If there is already a sprint which is finished, but not marked as complete, mark it now.
        if (sprint && sprint.isFinished() && await sprint.isDeclarationFinished()) {

            // Mark the sprint as completed.
            await sprint.complete();

            // Reload the sprint object.
            sprint = await Sprint.load(interaction.guildId, db);

        }

        // If a sprint already exists, we cannot start another one.
        if (sprint) {
            return await interaction.editReply(`${user.getMention()}, there is already a sprint running here.`);
        }

        // Make sure length and in_mins are valid.
        if (length < 1 || length > Sprint.MAX_LENGTH) {
            length = Sprint.DEFAULT_LENGTH;
        }

        let delay = 0;

        // If they set a delay, use that instead.
        if (in_mins) {

            // Though if it's invalid, use the default of 2 minutes.
            if (in_mins < 1 || in_mins > Sprint.MAX_IN_MINS) {
                in_mins = Sprint.DEFAULT_IN_MINS;
            }

            // Set the delay.
            delay = in_mins;

        }

        // Calculate the start and end times.
        const now = Helper.getUnixTimestamp();
        const start_time = now + (delay * 60);
        const end_time = start_time + (length * 60);

        // Create the sprint.
        const new_sprint = await Sprint.create(db, interaction.guildId, interaction.channelId, start_time, end_time, end_time, length, user.id, now);

        // Join the sprint.
        await new_sprint.join(user.id);

        // Increment the user's statistic for sprints created.
        await user.addStat('sprints_started', 1);

        // TODO: Task setup.


    }

    /**
     * Run the leave command.
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @returns {Promise<void>}
     */
    static async command_leave(interaction, db, sprint, user) {

        // Try the common checks to see if they pass.
        if (!await this.commonChecks(interaction, sprint, user)) {
            return;
        }

        await sprint.leave(user.id);
        await interaction.editReply(`${user.getMention()}, you have left the sprint.`);

        // If there are no more users sprinting, cancel it.
        const users = await sprint.getUsers();
        if (!users) {

            await sprint.cancel();
            await interaction.followUp(`**Sprint has been cancelled**\nEverybody left and I'm not doing this alone.`);

        }

    }

    /**
     * Run the status command.
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_status(interaction, db, sprint, user) {

        // Try the common checks to see if they pass.
        if (!await this.commonChecks(interaction, sprint, user)) {
            return;
        }

        // Make sure the user is sprinting.
        if (!await this.commonIsSprintingChecks(interaction, sprint, user)) {
            return;
        }

        const record = await sprint.getUser(user.id);

        // Build values to be passed to status message.
        const now = Helper.getUnixTimestamp();
        const written = record.current_wc - record.starting_wc;
        const writing_seconds = (now - parseInt(record.timejoined));
        const writing_time = Helper.formatSecondsToDays(writing_seconds);
        const left = Helper.formatSecondsToDays((parseInt(sprint.end) - now));
        const wpm = sprint.calculateWPM(written, writing_seconds);

        let message = '';

        // If they are sprinting without a word count, don't need to display the word count.
        if (record.type === Sprint.TYPE_NO_WORDCOUNT) {
            message += `${user.getMention()}, you are sprinting without a word count.\n`;
        } else {
            message += `${user.getMention()}, your current word count is: **${record.current_wc}** (**${written}** words in this sprint so far).\n`;
        }

        // If the sprint hasn't started, show the time until it does.
        if (!sprint.hasStarted()) {
            const left = Helper.formatSecondsToDays(parseInt(sprint.start) - now);
            message += `The sprint will begin in **${left}**\n`;
        } else if (sprint.isFinished()) {
            // If it's finished, display that message.
            message += 'Sprint has finished. Waiting for final word counts.\n';
        } else {
            message += `You have been sprinting for **${writing_time}**, averaging a WPM of **${wpm}**.\n`;
            message += `There are **${left}** left until this sprint ends.\n`;
        }

        return await interaction.editReply(message);

    }

    /**
     * Run the sprint wrote command
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @param amount
     * @returns {Promise<Message<BooleanCache<CacheType>>|*>}
     */
    static async command_wrote(interaction, db, sprint, user, amount) {

        // Try the common checks to see if they pass.
        if (!await this.commonChecks(interaction, sprint, user)) {
            return;
        }

        // User must be sprinting.
        if (!await this.commonIsSprintingChecks(interaction, sprint, user)) {
            return;
        }

        // Sprint must have started.
        if (!await this.commonHasStartedChecks(interaction, sprint, user)) {
            return;
        }

        const record = await sprint.getUser(user.id);
        if (record.type === 'no-wordcount') {
            return await interaction.editReply(`${user.getMention()}, you joined the sprint as a non-writing user. You do not have a word count.`);
        }

        const new_amount = amount + parseInt(record.current_wc);
        return sprint.setUserWordCount(interaction, db, sprint, user, record, new_amount);

    }

    /**
     * Run the sprint declare command
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @param amount
     * @returns {Promise<Message<BooleanCache<CacheType>>|*>}
     */
    static async command_declare(interaction, db, sprint, user, amount) {

        // Try the common checks to see if they pass.
        if (!await this.commonChecks(interaction, sprint, user)) {
            return;
        }

        // User must be sprinting.
        if (!await this.commonIsSprintingChecks(interaction, sprint, user)) {
            return;
        }

        // Sprint must have started.
        if (!await this.commonHasStartedChecks(interaction, sprint, user)) {
            return;
        }

        const record = await sprint.getUser(user.id);
        if (record.type === 'no-wordcount') {
            return await interaction.editReply(`${user.getMention()}, you joined the sprint as a non-writing user. You do not have a word count.`);
        }

        // If they declared less than they started with, they messed it up.
        if (amount < parseInt(record.starting_wc)) {
            const diff = parseInt(record.current_wc) - amount;
            return await interaction.editReply(`${user.getMention()}, word count **${amount}** is less than the word count you started with (**${record.starting_wc}**)!\nIf you joined with a starting word count, make sure to declare your new TOTAL word count, not just the amount you wrote in this sprint.\nIf you really are trying to lower your word count for this sprint, please run: \`/sprint wrote -${diff}\` instead, to decrement your current word count.`);
        }

        return sprint.setUserWordCount(interaction, db, sprint, user, record, amount);

    }

        /**
     * Run the join command
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @param initial
     * @param project_shortname
     * @param type
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_join(interaction, db, sprint, user, initial = null, project_shortname = null, type = null) {

        // Try the common checks to see if they pass.
        if (!await this.commonChecks(interaction, sprint, user)) {
            return;
        }

        // 'normal' is stored as null type.
        if (type === 'normal') {
            type = null;
        }

        // TODO: Project stuff.
        let project_id = null;

        let message = '';

        // If no initial word count set, use 0.
        if (!initial || initial < 0) {
            initial = 0;
        }

        // If it's the "join same" then we want to see if we can find their last sprint on this server.
        if (type === 'same') {

            const last_sprint = await user.getMostRecentSprint(sprint.id);

            // If there's no previous sprint, join this one normally.
            if (!last_sprint) {
                return Sprint.command_join(interaction, db, sprint, user);
            }

            initial = last_sprint.ending_wc;
            project_id = last_sprint.project;
            type = last_sprint.sprint_type;

        }

        // If the type is a non-word count one, set initial to 0.
        if (type === 'no-wordcount') {
            initial = 0;
        }

        // If they are already in the sprint, update their record.
        if (await sprint.isUserSprinting(user.id)) {

            await sprint.updateUser(user.id, initial, initial, false, type, project_id);
            if (type === 'no-wordcount') {
                message = 'you are now sprinting without a word count. You will not be included in the final tallies.';
            } else {
                message = `your starting word count has been set to **${initial}**.`;
            }

        } else {

            // Otherwise, create them a record.
            await sprint.join(user.id, initial, type, project_id);
            if (type === 'no-wordcount') {
                message = 'you have joined the sprint without a word count. You will not be included in the final tallies.';
            } else {
                message = `you have joined the sprint with **${initial}** words.`;
            }
        }

        // TODO: Append project message.

        return await interaction.editReply(`${user.getMention()}, ${message}`);

    }

    /**
     * Run the cancel command
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_cancel(interaction, db, sprint, user) {

        // Try the common checks to see if they pass.
        if (!await this.commonChecks(interaction, sprint, user)) {
            return;
        }

        // Do they have permission to cancel this sprint? (Sprint creator or MANAGE_MESSAGES permission).
        if (parseInt(sprint.createdby) !== parseInt(user.id) && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return await interaction.editReply(`${user.getMention()}, you do not have permission to cancel this sprint.`);
        }

        // Get an array of mentions to let users who are sprinting know its cancelled.
        const mentions = await sprint.getMentions();

        // Cancel the sprint.
        await sprint.cancel();

        return await interaction.editReply(`**Sprint has been cancelled**: ${mentions.join(', ')}`);

    }

    /**
     * Run the notify command to change getting notifications or not
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @param notifications
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_notify(interaction, db, sprint, user, notifications) {

        await user.updateSetting('sprint_notify', notifications, interaction.guildId);

        let message = '';
        if (notifications === 1) {
            message = 'You will be notified of any new sprints which are scheduled on this server';
        } else {
            message = 'You will no longer be notified of any new sprints which are scheduled on this server';
        }

        return await interaction.editReply(`${user.getMention()}, ${message}`);

    }

        /**
     * Common checks for anything which requires the sprint exists, prints error if it doesn't exist
     * @param interaction
     * @param sprint
     * @param user
     * @returns {Promise<boolean>}
     */
    static async commonChecks(interaction, sprint, user) {

        // If the sprint doesn't exist, we can't do the action we were trying to.
        if (!sprint) {
            await interaction.editReply(`${user.getMention()}, there is no sprint running on this server. Maybe you should start one? \`/sprint for\``);
            return false;
        }

        return true;

    }

    /**
     * Common checks to see if user is sprinting and print error if not
     * @param interaction
     * @param sprint
     * @param user
     * @returns {Promise<boolean>}
     */
    static async commonIsSprintingChecks(interaction, sprint, user) {

        // If the sprint doesn't exist, we can't do the action we were trying to.
        if (!sprint.isUserSprinting(user.id)) {
            await interaction.editReply(`${user.getMention()}, you are not currently sprinting. Maybe you should join? \`/sprint join\``);
            return false;
        }

        return true;

    }

    /**
     * Common checks to see if sprint has started and print error if not
     * @param interaction
     * @param sprint
     * @param user
     * @returns {Promise<boolean>}
     */
    static async commonHasStartedChecks(interaction, sprint, user) {

        // If the sprint doesn't exist, we can't do the action we were trying to.
        if (!sprint.hasStarted()) {
            await interaction.editReply(`${user.getMention()}, the sprint hasn't started yet.`);
            return false;
        }

        return true;

    }

    /**
     * Create a new sprint and return its object
     * @param db
     * @param guild_id
     * @param channel_id
     * @param start_time
     * @param end_time
     * @param end_reference
     * @param length
     * @param user_id
     * @param time
     * @returns {Promise<Sprint>}
     */
    static async create(db, guild_id, channel_id, start_time, end_time, end_reference, length, user_id, time) {

        await db.insert('sprints', {
            'guild': guild_id,
            'channel': channel_id,
            'start': start_time,
            'end': end_time,
            'end_reference': end_reference,
            'length': length,
            'createdby': user_id,
            'created': time
        });

        return Sprint.load(guild_id, db);

    }

    /**
     * Load the current sprint object if there is one on the specified guild
     * @param guild_id
     * @param db
     * @returns {Promise<Sprint|boolean>}
     */
    static async load(guild_id, db) {

        const record = await db.get('sprints', {'guild': guild_id, 'completed': 0});
        if (record) {
            return new Sprint(record, db);
        } else {
            return false;
        }

    }

}

module.exports = Sprint;