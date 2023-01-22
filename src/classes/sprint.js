const { PermissionsBitField } = require('discord.js');
const Helper = require('./helper');
const User = require('./user');
const Guild = require('./guild');
const Task = require('./task');
const Experience = require('./experience');
const Project = require("./project");
const logger = require("../utils/logger");

class Sprint {

    static DEFAULT_POST_DELAY = 2;
    static WINNING_POSITION = 1;
    static DEFAULT_LENGTH = 20;
    static MAX_LENGTH = 60;
    static DEFAULT_IN_MINS = 2;
    static MAX_IN_MINS = 1440;
    static DEFAULT_MAX_WPM = 150;

    // This is how many days sprint_users records will be kept after the sprint is created.
    static RUBBISH_COLLECTION = 30;

    // This is how many seconds between job runs. (24 hours).
    static RUBBISH_COLLECTION_TASK = 86400;

    /**
     * Construct the sprint object from its DB record
     * @param record
     * @param db
     */
    constructor(record, db) {
        this._db = db;
        this.id = record.id;
        this.guild = record.guild;
        this.channel = record.channel;
        this.start = parseInt(record.start);
        this.end = parseInt(record.end);
        this.end_reference = parseInt(record.end_reference);
        this.length = parseInt(record.length);
        this.createdby = record.createdby;
        this.created = record.created;
        this.completed = record.completed;
    }

    /**
     * Check if the sprint is marked as completed
     * @returns {boolean}
     */
    isComplete() {
        return (this.completed > 0);
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

        const results = await this._db.get_all_sql('SELECT * FROM sprint_users WHERE sprint = ? AND ending_wc = 0 AND (sprint_type IS NULL OR sprint_type != ?)', [
            this.id, 'no-wordcount'
        ]);

        return (results === false || results.length === 0);

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

        // Cancel any tasks for this sprint.
        await Task.cancel(this._db, 'sprint', this.id);

        // Decrement sprints created stat for creator.
        const creator = new User(this.createdby, this._db);
        await creator.addStat('sprints_started', -1);

    }

    /**
     * Update the sprint record
     * @param params
     * @returns {Promise<void>}
     */
    async update(params) {
        params['id'] = this.id;
        await this._db.update('sprints', params);
    }

    /**
     * Complete the sprint and run all calculations and updates
     * @param interaction
     * @param client
     * @returns {Promise<ShardEvents.Message<BooleanCache<Cached>>>}
     */
    async complete_sprint(interaction = null, client = null) {

        // If the sprint has already completed, just stop.
        if (this.isComplete()) {
            return;
        }

        // Print the "Results coming" message.
        await Helper.say(`The word counts are in. Results coming up shortly...`, interaction, client, this.channel);

        // Mark the sprint as completed in the database.
        const now = Helper.getUnixTimestamp();
        await this.update({
            'completed': now
        });

        const results = [];

        // Build the array of results.
        const users = await this.getUsers();
        for (const user_id of users) {

            const user = new User(user_id, this._db, interaction);

            // Set the client and channel in case any level-up messages need to be sent from user class.
            user.setClient(client);
            user.setChannel(this.channel);

            const user_sprint = await this.getUser(user.id);

            // If they are sprinting as a non-wordcount user, we don't need to do anything with their word count.
            if (user_sprint.sprint_type === 'no-wordcount') {

                // Just give them their XP and stats.
                await user.addXP(Experience.XP_COMPLETE_SPRINT);
                await user.addStat('sprints_completed', 1);

                // Push them to the results array.
                results.push({
                    'user': user,
                    'wordcount': 0,
                    'xp': Experience.XP_COMPLETE_SPRINT,
                    'type': user_sprint.sprint_type,
                });

            } else {

                // Otherwise, they are a normal sprinter, so we want to calculate some stuff.
                // If they didn't submit an ending word count, use their current one.
                if (user_sprint.ending_wc === 0) {
                    user_sprint.ending_wc = user_sprint.current_wc;
                    await this.updateUser(user.id, false, false, user_sprint.ending_wc);
                }

                // Convert all word counts and time to ints for easier comparisons.
                user_sprint.starting_wc = parseInt(user_sprint.starting_wc);
                user_sprint.current_wc = parseInt(user_sprint.current_wc);
                user_sprint.ending_wc = parseInt(user_sprint.ending_wc);
                user_sprint.timejoined = parseInt(user_sprint.timejoined);

                // We only process their result if they have declared something, and it's different to their starting word count.
                if (user_sprint.ending_wc > 0 && user_sprint.ending_wc !== user_sprint.starting_wc) {

                    // Get their word count from their ending declaration.
                    let word_count = user_sprint.ending_wc - user_sprint.starting_wc;

                    // Get the actual time the user sprinted, based on their join time.
                    let time_sprinted = this.end_reference - user_sprint.timejoined;

                    // If for some reason the timejoined or sprint end_reference is 0, use the defined sprint length.
                    if (user_sprint.timejoined <= 0 || this.end_reference <= 0) {
                        time_sprinted = parseInt(this.length);
                    }

                    // Calculate their WPM based on their time sprinted.
                    let wpm = this.calculateWPM(word_count, time_sprinted);

                    // See if it's a new WPM record for the user.
                    let is_new_record = false;
                    const record = await user.getRecord('wpm');
                    if (!record || wpm > parseInt(record.value)) {
                        is_new_record = true;
                        await user.updateRecord('wpm', wpm);
                    }

                    // Give them their XP for finishing the sprint.
                    await user.addXP(Experience.XP_COMPLETE_SPRINT);

                    // Increment their stats.
                    await user.addStat('sprints_completed', 1);
                    await user.addStat('sprints_words_written', word_count);
                    await user.addStat('total_words_written', word_count);

                    // Add words written to goal.
                    await user.addToGoals(word_count);

                    // If they were sprinting in a project, update its word count.
                    if (user_sprint.project !== null) {
                        const project = await Project.get_by_id(this._db, user_sprint.project);
                        if (project.is_valid()) {
                            project.words += word_count;
                            await project.save();
                        }
                    }

                    // Push them to the results array.
                    results.push({
                        'user': user,
                        'wordcount': word_count,
                        'wpm': wpm,
                        'wpm_record': null,
                        'xp': Experience.XP_COMPLETE_SPRINT,
                        'type': user_sprint.sprint_type,
                    });


                }

            }

        }

        // Now we sort the users into the leaderboard.
        results.sort((a, b) => b.wordcount - a.wordcount);

        // Loop through them and apply extra XP for the top positions.
        let position = 1;
        let best_word_count = 0;

        for (const result of results) {

            // We use this variable, instead of just checking position, in case there is a tie for 1st place.
            if (result.wordcount > best_word_count) {
                best_word_count = result.wordcount;
            }

            // Are they the sprint winner? (Can be a tie, so based on word count, not position).
            const is_winner = result.wordcount === best_word_count;

            // If they finished in the top 5 (and weren't the only one sprinting), earn extra XP.
            if (position <= 5 && results.length > 1) {

                // If they are the sprint winner (can be a tie) use modifier of first place.
                let position_modifier = position;
                if (is_winner) {
                    position_modifier = 1;
                }

                // Add the extra xp to the result and the database.
                const extra_xp = Math.ceil(Experience.XP_WIN_SPRINT / position_modifier);
                result.xp += extra_xp;
                await result.user.addXP(extra_xp);

            }

            // If they won the sprint, increment their win stat.
            if (is_winner) {
                await result.user.addStat('sprints_won', 1);
            }

            // Increment position.
            position += 1;

        }

        // Post the final message with the results.
        let message = '';
        if (results.length > 0) {

            message = `:trophy: **Sprint results** :trophy:\nCongratulations to everyone.\n`;
            position = 1;

            for (const result of results) {

                // Non-word count sprinters just display their XP gain.
                if (result.type === 'no-wordcount') {
                    message += `${result.user.getMention()}\t\t+${result.xp} xp`;
                } else {
                    // Everyone else, display their position and WPM as well.
                    message += `${position}. ${result.user.getMention()} - **${result.wordcount} words** (${result.wpm} wpm)\t\t+${result.xp} xp`;
                    if (result.wpm_record) {
                        message += `\t\t:champagne: **NEW PB**`;
                    }
                }

                message += '\n';
                position += 1;

            }

        } else {
            message = `No-one submitted their word counts... I guess I'll just cancel the sprint then... :frowning:`;
        }

        return await Helper.say(message, interaction, client, this.channel);

    }

    /**
     * End the current sprint
     * @param interaction
     * @param client
     * @returns {Promise<void>}
     */
    async end_sprint(interaction = null, client = null) {

        // Mark the sprint as ended in the database.
        await this.update({'end': 0});

        // Get the users to notify.
        const mentions = await this.getMentions();

        // How long do they have to submit their word counts?
        const guild = new Guild(this.guild, this._db);

        let delay = await guild.getSetting('sprint_delay_end');
        if (delay) {
            delay = parseInt(delay.value);
        } else {
            delay = Sprint.DEFAULT_POST_DELAY;
        }

        // Print the end message.
        let message = `**Time is up**\nPens down. Use \`/sprint wc amount:<amount>\` to submit your final word counts, you have ${delay} minute(s).`;
        message += `\n:bell: ${mentions.join(', ')}`;
        await Helper.say(message, interaction, client, this.channel);

        // If everyone is declared, just finish without waiting.
        if (await this.isDeclarationFinished()) {
            return await this.complete_sprint(interaction, client);
        }

        // Schedule a task to complete the sprint.
        const now = Helper.getUnixTimestamp();
        const task_time = now + (delay * 60);
        await Task.create(this._db, 'complete', task_time, 'sprint', this.id);

    }

    /**
     * Post the message to say a sprint has been scheduled.
     * @param interaction
     * @returns {Promise<ShardEvents.Message<BooleanCache<Cached>>|Promise<ShardEvents.Message<BooleanCache<Cached>>>>}
     */
    async post_delayed_start(interaction) {

        const now = Helper.getUnixTimestamp();
        const delay = Helper.formatSecondsToDays(this.start - now);
        let message = `**A new sprint has been scheduled**\nSprint will start in approx ${delay} and will run for ${this.length} minute(s). Use \`/sprint join\` to join this sprint.`;

        // Notify users.
        const notify = await this.getMentions(true);
        if (notify.length) {
            message += `\n:bell: ${notify.join(', ')}`;
        }

        return Helper.say(message, interaction, null);

    }

    /**
     * Post the sprint start message.
     * @param client
     * @param interaction
     * @param immediate
     * @returns {Promise<ShardEvents.Message<BooleanCache<Cached>>|Promise<ShardEvents.Message<BooleanCache<Cached>>>>}
     */
    async post_start(interaction = null, client = null, immediate = false) {

        // Build the message.
        let message = `**Sprint has started**\nGet writing! You have ${this.length} minute(s).`;

        // Notify users who joined the sprint that it is starting.
        const mentions = await this.getMentions();
        if (mentions.length) {
            message += `\n:bell: ${mentions.join(', ')}`;
        }

        // Notify users who asked to be notified.
        if (immediate) {
            const notify = await this.getMentions(true);
            if (notify.length) {
                message += `\n:bell: ${notify.join(', ')}`;
            }
        }

        return Helper.say(message, interaction, client, this.channel);

    }

    /**
     * Get the users who are sprinting in this sprint
     * @returns {Promise<{length}|*|boolean>}
     */
    async getUsers() {

        const users = await this._db.get_all('sprint_users', {'sprint': this.id}, ['user']);
        let user_ids = [];

        if (users) {
            for (const user of users) {
                user_ids.push(user.user);
            }
        }

        return user_ids;
    }

    /**
     * Get an array of the users to notify about new sprints.
     * @returns {Promise<*[]>}
     */
    async getNotifyUsers() {

        // First get the IDs of all the users actually on the sprint.
        const user_ids = await this.getUsers();

        // Then get the IDs of the users who want to be notified of sprints on this server.
        const notify_users = await this._db.get_all('user_settings', {'guild': this.guild, 'setting': 'sprint_notify', 'value': 1});
        let notify_ids = [];
        if (notify_users) {
            for (const notify_user of notify_users) {
                notify_ids.push(notify_user.user);
            }
        }

        // Return the users who want notifications, but who are not already on the sprint.
        return notify_ids.filter((e) => user_ids.indexOf(e) === -1);

    }

    /**
     * Get an array of mentions for the users in this sprint
     * @param notify
     * @returns {Promise<[]>}
     */
    async getMentions(notify = false) {

        let users;

        // Are we getting mentions for users who want notifications? Or users on the sprint?
        if (notify) {
            users = await this.getNotifyUsers();
        } else {
            users = await this.getUsers();
        }

        const mentions = [];

        if (users) {
            for (const user_id of users) {
                let obj = new User(user_id);
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

        // If they sprint for less than a minute, it can create odd wpm results.
        if (seconds < 60) {
            seconds = 60;
        }

        return Math.ceil(words /(seconds / 60), 1);

    }

    /**
     * Declare a word count for the user in the sprint
     * @param interaction
     * @param db
     * @param user
     * @param user_sprint
     * @param amount
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    async setUserWordCount(interaction, db, user, user_sprint, amount) {

        // Before we update it, see if the WPM exceeds their max setting, in which case it's probably an error.
        const written = amount - parseInt(user_sprint.starting_wc);
        const writing_time = parseInt(this.end_reference) - parseInt(user_sprint.timejoined);
        const wpm = this.calculateWPM(written, writing_time);

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
        if (this.isFinished()) {
            await this.updateUser(user.id, false, false, amount);
        } else {
            await this.updateUser(user.id, false, amount)
        }

        // Reload the user's sprint record.
        user_sprint = await this.getUser(user.id);

        // Which value are we displaying? Current or ending?
        let wc;
        if (this.isFinished()) {
            wc = user_sprint.ending_wc;
        } else {
            wc = user_sprint.current_wc;
        }

        await interaction.editReply(`${user.getMention()}, you updated your word count to **${wc}**. Total words written in this sprint: **${written}**`);

        // If everyone has now declared, we don't need to wait for the task, we can complete now.
        if (this.isFinished() && await this.isDeclarationFinished()) {
            await Task.cancel(db, 'sprint', this.id);
            await this.complete_sprint(interaction);
        }

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
            await sprint.complete_sprint();

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

        // Are we starting immediately?
        if (delay <= 0) {
            await Task.create(db, 'end', end_time, 'sprint', new_sprint.id)
            return await new_sprint.post_start(interaction, null, true);
        } else {
            await Task.create(db, 'start', start_time, 'sprint', new_sprint.id);
            return await new_sprint.post_delayed_start(interaction);
        }

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
        if (!users.length) {

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

        const now = Helper.getUnixTimestamp();
        const left = Helper.formatSecondsToDays((parseInt(sprint.end) - now));

        // If they aren't in the sprint, just show time left.
        if (!await sprint.isUserSprinting(user.id)) {

            // If the sprint hasn't started, show the time until it does.
            if (!sprint.hasStarted()) {
                const left = Helper.formatSecondsToDays(parseInt(sprint.start) - now);
                return await interaction.editReply(`The sprint will begin in **${left}**\n`);
            } else if (sprint.isFinished()) {
                // If it's finished, display that message.
                return await interaction.editReply('Sprint has finished. Waiting for final word counts.\n');
            } else {
                return await interaction.editReply(`There are **${left}** left until this sprint ends.\n`);
            }

        }

        const record = await sprint.getUser(user.id);

        // Build values to be passed to status message.
        const written = record.current_wc - record.starting_wc;
        const writing_seconds = (now - parseInt(record.timejoined));
        const writing_time = Helper.formatSecondsToDays(writing_seconds);
        const wpm = sprint.calculateWPM(written, writing_seconds);

        let message = '';

        // If they are sprinting without a word count, don't need to display the word count.
        if (record.sprint_type === 'no-wordcount') {
            message += `${user.getMention()}, you are sprinting without a word count.\n`;
        } else {
            message += `${user.getMention()}, your current word count is: **${record.current_wc}** (**${written}** words in this sprint so far).\n`;
        }

        // Are they sprinting in a project?
        if (record.project !== null) {
            const project = await Project.get_by_id(db, record.project);
            if (project) {
                message += `You are sprinting in your project **${project.name}**.\n`;
            }
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
        return sprint.setUserWordCount(interaction, db, user, record, new_amount);

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

        return sprint.setUserWordCount(interaction, db, user, record, amount);

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

        let project = null;
        let project_id = null;

        // Get the project and make sure it exists.
        if (project_shortname !== null) {
            project = await Project.get(db, user.id, project_shortname);
            if (!project.is_valid()) {
                return await interaction.editReply(`${user.getMention()}, you do not have a project with that name`);
            }
            project_id = project.id;
        }


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

            // If they are sprinting in the same project as before, load that so we can get its name.
            if (project_id !== null) {
                project = await Project.get_by_id(db, project_id);
            }

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

        // If they joined with a project.
        if (project !== null) {
            message += ` You are sprinting in your project **${project.name}**`;
        }

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
        if (sprint.createdby !== user.id && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return await interaction.editReply(`${user.getMention()}, you do not have permission to cancel this sprint.`);
        }

        // Get an array of mentions to let users who are sprinting know its cancelled.
        const mentions = await sprint.getMentions();

        // Cancel the sprint.
        await sprint.cancel();

        return await interaction.editReply(`**Sprint has been cancelled**: ${mentions.join(', ')}`);

    }

    /**
     * Run the end command
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_end(interaction, db, sprint, user) {

        // Try the common checks to see if they pass.
        if (!await this.commonChecks(interaction, sprint, user)) {
            return;
        }

        // Sprint must have started.
        if (!await this.commonHasStartedChecks(interaction, sprint, user)) {
            return;
        }

        // Do they have permission to end this sprint? (Sprint creator or MANAGE_MESSAGES permission).
        if (parseInt(sprint.createdby) !== parseInt(user.id) && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return await interaction.editReply(`${user.getMention()}, you do not have permission to end this sprint early.`);
        }

        // Update sprint end reference.
        await sprint.update({'end_reference': Helper.getUnixTimestamp()});

        // Cancel any pending tasks for this sprint.
        await Task.cancel(db, 'sprint', sprint.id);

        // Run the end bits to ask for word counts.
        return await sprint.end_sprint(interaction, null);

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
     * Run the pb command
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_pb(interaction, db, sprint, user) {

        // Do they have a pb?
        const pb = await user.getRecord('wpm');
        if (pb) {
            return await interaction.editReply(`${user.getMention()}, your personal best is **${pb.value}** wpm.`);
        } else {
            return await interaction.editReply(`${user.getMention()}, you do not yet have a wpm personal best. Get sprinting if you want one!`);
        }

    }

    /**
     * Run the purge command to remove notifications of users not in the server any more.
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @param who
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_purge(interaction, db, sprint, user, who) {

        // Do they have permission to remove people? (MANAGE_MESSAGES permission).
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return await interaction.editReply(`${user.getMention()}, you do not have permission to remove people from notifications list.`);
        }

        // User must exist - shouldn't get here is the user option type works.
        if (!who) {
            return await interaction.editReply(`${user.getMention()}, unable to find that user.`);
        }

        // Delete the setting for that user on this guild.
        await db.delete('user_settings', {
            'user': who.id,
            'guild': interaction.guildId,
            'setting': 'sprint_notify'
        });

        return await interaction.editReply(`${user.getMention()}, user removed from sprint notifications.`);

    }

    /**
     * Set the project to sprint in
     * @param interaction
     * @param db
     * @param sprint
     * @param user
     * @param project_shortname
     * @returns {Promise<void>}
     */
    static async command_project(interaction, db, sprint, user, project_shortname) {

        // Try the common checks to see if they pass.
        if (!await this.commonChecks(interaction, sprint, user)) {
            return;
        }

        // User must be sprinting.
        if (!await this.commonIsSprintingChecks(interaction, sprint, user)) {
            return;
        }

        // Get the project and make sure it exists.
        const project = await Project.get(db, user.id, project_shortname);
        if (!project.is_valid()) {
            return await interaction.editReply(`${user.getMention()}, you do not have a project with that name`);
        }

        // Set the project into their sprint record.
        await sprint.updateUser(user.id, false, false, false, false, project.id);
        return await interaction.editReply(`${user.getMention()}, you are now sprinting in your project **${project.name}**`);

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

    /**
     * Get a sprint object by its ID
     * @param db
     * @param id
     * @returns {Promise<Sprint|boolean>}
     */
    static async get(db, id) {
        const record = await db.get('sprints', {'id': id});
        if (record) {
            return new Sprint(record, db);
        } else {
            return false;
        }
    }

    /**
     * Set up the global task records
     * @param db
     * @returns {Promise<void>}
     */
    static async setupTasks(db) {

        logger.info('[TASK][SPRINT] Setting up jobs');

        // Start off by deleting the existing goal task.
        await db.delete('tasks', {'object': 'sprint', 'type': 'rc'});

        // Now re-create it, with default values, so we know it will run at correct time.
        await db.insert('tasks', {'object': 'sprint', 'time': 0, 'type': 'rc', 'recurring': 1, 'runeveryseconds': Sprint.RUBBISH_COLLECTION_TASK});

    }

}

module.exports = Sprint;