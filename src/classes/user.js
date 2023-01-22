const Helper = require('./helper');
const Experience = require('./experience');
const moment = require("moment/moment");

class User {

    constructor(id, db, interaction = null) {
        this._db = db;
        this.id = id;
        this.stats = {};
        this._client = null;
        this._interaction = interaction;
        this._channel = null;
    }

    /**
     * Set the bot client object into the user object.
     * @param client
     */
    setClient(client) {
        this._client = client;
    }

    /**
     * Set the channel to use, if we try to send messages from tasks.
     * @param channel
     */
    setChannel(channel) {
        this._channel = channel;
    }

    /**
     * Get the string to mention the user
     * @returns {string}
     */
    getMention() {
        return `<@${this.id}>`;
    }

    /**
     * Get the user's current writing challenge
     * @returns {Promise<*>}
     */
    async getChallenge() {
        return await this._db.get('user_challenges', {'user': this.id, 'completed': 0});
    }

    /**
     * Set a new challenge for the user
     * @param challenge
     * @param xp
     * @returns {Promise<number>}
     */
    async setChallenge(challenge, xp) {
        return await this._db.insert('user_challenges', {'user': this.id, 'challenge': challenge, 'xp': xp});
    }

    /**
     * Delete the current challenge
     * @returns {Promise<*>}
     */
    async deleteChallenge() {
        return await this._db.delete('user_challenges', {'user': this.id, 'completed': 0});
    }

    /**
     * Complete the current challenge.
     * @param challenge
     * @returns {Promise<void>}
     */
    async completeChallenge(challenge) {

        // Update the record.
        challenge.completed = Helper.getUnixTimestamp();
        await this._db.update('user_challenges', challenge);

        // Add the XP.
        await this.addXP(challenge.xp);

        // Add the statistic.
        await this.addStat('challenges_completed', 1);

    }

    /**
     * Get a named statistic for the user
     * @param name
     * @returns {Promise<number|*>}
     */
    async getStat(name) {

        // If it doesn't exist on the object, it hasn't been loaded yet.
        if (this.stats[name] === undefined) {
            let record = await this._db.get('user_stats', {'user': this.id, 'name': name});
            if (record !== false) {
                this.stats[name] = record.value;
            }
        }

        // If it still doesn't exist, there's no such stat record for the user.
        if (this.stats[name] !== undefined) {
            return this.stats[name];
        } else {
            return false;
        }

    }

    /**
     * Increment the user's named statisic by the specified amount
     * @param name
     * @param amount
     * @returns {Promise<*>}
     */
    async addStat(name, amount) {

        const stat = await this.getStat(name);
        if (stat) {
            amount = parseInt(stat) + amount;
        }

        return this.updateStat(name, amount);

    }

    /**
     * Either insert or update the statistic record
     * @param name
     * @param amount
     * @returns {Promise<number|*>}
     */
    async updateStat(name, amount) {

        // Get the current stat if there is one.
        const stat = await this.getStat(name);

        // Update the stats object on the user.
        this.stats[name] = amount;

        if (stat !== false) {
            return await this._db.update('user_stats', {'value': amount}, {'user': this.id, 'name': name});
        } else {
            return await this._db.insert('user_stats', {'user': this.id, 'name': name, 'value': amount});
        }

    }

    /**
     * Get the user's XP amount
     * @returns {Promise<*|boolean>}
     */
    async getXP() {

        let record = await this._db.get('user_xp', {'user': this.id});
        return (record) ? Experience.load(record['xp']) : false;

    }

    /**
     * Get the XP bar for the user
     * @returns {Promise<string>}
     */
    async getXPBar() {
        const record = await this.getXP();

        if (record) {
            const level = record.getLevel();
            const nextLevelXP = record.getNextLevelXP();
            const xp = record['xp'];

            const goal = xp + nextLevelXP;
            return `**Level ${level}** (${xp}/${goal})`;
        }
        return 'None';
    }
    
    /**
     * Add to the user's XP
     * @param amount
     * @returns {Promise<number|*>}
     */
    async addXP(amount) {

        const experience = await this.getXP();

        // If they already have some XP, add them together.
        if (experience) {
            amount += experience.xp;
        }

        return await this.updateXP(experience, amount);

    }

    /**
     * Update a user's XP to the given new amount.
     * @returns {Promise<number|*>}
     * @param existing
     * @param amount
     */
    async updateXP(existing, amount) {

        let existing_level = 1;

        if (existing) {
            existing_level = existing.getLevel();
            await this._db.update('user_xp', {'xp': amount}, {'user': this.id});
        } else {
            await this._db.insert('user_xp', {'user': this.id, 'xp': amount});
        }

        // Load an experience object with the new value.
        const user_xp = Experience.load(amount);

        // Have they just hit a new level?
        if (user_xp.getLevel() > existing_level) {
            await Helper.say(`:tada: Congratulations ${this.getMention()}, you are now **Level ${user_xp.getLevel()}**`, this._interaction, this._client, this._channel);
        }

    }

    /**
     * Get the goal record for a specific type for this user
     * @param type
     * @returns {Promise<*>}
     */
    async getGoal(type) {
        return await this._db.get('user_goals', {'user': this.id, 'type': type});
    }

    /**
     * Set a goal for the user
     * @param type
     * @param amount
     * @returns {Promise<number|*>}
     */
    async setGoal(type, amount) {

        const goal = await this.getGoal(type);

        // Calculate next reset time based on user's datetime.
        const reset = await this.calculateResetTime(type);

        if (goal) {
            goal.goal = amount;
            goal.reset = reset;
            return await this._db.update('user_goals', goal);
        } else {
            return await this._db.insert('user_goals', {
                'user': this.id, 'type': type, 'goal': amount, 'current': 0, 'completed': 0, 'reset': reset
            });
        }

    }

    /**
     * Go through all the user's goals and update the reset time, based on their current datetime setting.
     * @returns {Promise<void>}
     */
    async updateAllGoalResetTimes() {

        const goals = await this._db.get_all('user_goals', {'user': this.id});
        if (goals) {
            for (let goal of goals) {

                // By setting the goal again, it will update the reset time.
                await this.setGoal(goal.type, goal.goal);

            }
        }

    }

    /**
     * Calculate when the user's goal should reset
     * @param type
     * @returns {Promise<*>}
     */
    async calculateResetTime(type) {

        let offset = 0;

        // Get the user's datetime offset from the server.
        const setting = await this.getSetting('datetime');
        if (setting) {
            // We have to reverse the offset, because if they are behind, we want to go ahead, not behind more.
            offset = -parseInt(setting.value);
        }

        // To start with, get next midnight in server time (UTC).
        const server_time = moment();
        let server_midnight;

        // Now, change it depending on the goal type.
        if (type === 'weekly') {

            // Get midnight of Monday next week.
            server_midnight = server_time.add(1, 'week').startOf('isoWeek');

        } else if (type === 'monthly') {

            // Get midnight of the 1st of next month.
            server_midnight = server_time.add(1, 'month').startOf('month');

        } else if (type === 'yearly') {

            // Get midnight of the 1st of Jan next year.
            server_midnight = server_time.add(1, 'year').startOf('year');

        } else {

            // Get the next midnight - This is 'daily' and also the fallback option.
            server_midnight = server_time.add(1, 'days').startOf('day');

        }

        // Add the user's offset to the server midnight time.
        return server_midnight.unix() + (offset * 60);

    }

    /**
     * Reset the user's goal
     * @param goal
     * @returns {Promise<void>}
     */
    async resetGoal(goal) {

        const previous = await this.getPreviousGoalDate(goal.type);

        // Insert a record into the history table, so we can see historical goals.
        await this._db.insert('user_goals_history', {
            'user': goal.user,
            'type': goal.type,
            'date': previous,
            'goal': goal.goal,
            'result': goal.current,
            'completed': goal.completed,
        });

        // Calculate the next reset time for this goal.
        const next = await this.calculateResetTime(goal.type);

        // Update the goal record with the new reset time and resetting completed and current data.
        goal.completed = 0;
        goal.current = 0;
        goal.reset = next;
        await this._db.update('user_goals', goal);

    }

    /**
     * Get the previous period date for a goal, depending on the type.
     * E.g. the previous day, week, month, year
     * @param type
     * @returns {Promise<string>}
     */
    async getPreviousGoalDate(type) {

        let offset = 0;

        // Get the user's datetime offset from the server.
        const setting = await this.getSetting('datetime');
        if (setting) {
            offset = parseInt(setting.value);
        }

        const server_time = moment();
        const user_time = moment(server_time.unix() + (offset * 60), 'X');

        if (type === 'weekly') {
            const previous = user_time.subtract(1, 'week');
            return previous.format('DD MMM YYYY');
        } else if (type === 'monthly') {
            const previous = user_time.subtract(1, 'month');
            return previous.format('MMM YYYY');
        } else if (type === 'yearly') {
            const previous = user_time.subtract(1, 'year');
            return previous.format('YYYY');
        } else {
            const previous = user_time.subtract(1, 'day');
            return previous.format('DD MMM YYYY');
        }

    }

    /**
     * Delete one of the user's goals
     * @param type
     * @returns {Promise<*>}
     */
    async deleteGoal(type) {
        return await this._db.delete('user_goals', {
            'user': this.id, 'type': type
        });
    }

    /**
     * Update the user's goal record with a new amount for the current word count progress.
     * @param goal
     * @param amount
     * @returns {Promise<*>}
     */
    async updateGoal(goal, amount) {

        goal.current = amount;
        return await this._db.update('user_goals', goal);

    }

    /**
     * Get the progress of a user's goal
     * @param type
     * @returns {Promise<{str: string, current: number, goal: number, left: number, percent: number, done: number}>}
     */
    async getGoalProgress(type) {

        let progress = {
            'exists': false,
            'percent': 0,
            'done': 0,
            'left': 0,
            'goal': 0,
            'current': 0,
        };

        const now = Helper.getUnixTimestamp();
        const goal = await this.getGoal(type);
        if (goal) {

            progress.exists = true;
            progress.percent = Math.floor((goal.current / goal.goal) * 100);
            progress.goal = goal.goal;
            progress.current = goal.current;
            progress.time_left = Helper.formatSecondsToDays(parseInt(goal.reset) - now);
            progress.remaining = progress.goal - progress.current;

            // If they've gone over their goal, just set it as 0 remaining.
            if (progress.remaining < 0) {
                progress.remaining = 0;
                progress.daily_rate = 0;
            } else {
                // Work out daily word count required to meet goal.
                progress.daily_rate = Math.ceil(progress.remaining / ((parseInt(goal.reset) - now) / 86400));
            }

        }

        return progress;

    }

    /**
     * Get the user's goal history records
     * @param type
     * @returns {Promise<{length}|*|boolean>}
     */
    async getGoalHistory(type) {

        let max = null;

        if (type === 'daily') {
            max = 14;
        } else if (type === 'weekly') {
            max = 4;
        } else if (type === 'monthly') {
            max = 12;
        }

        return await this._db.get_all('user_goals_history', {
            'user': this.id,
            'type': type,
        }, ['*'], ['id DESC'], max);

    }

    /**
     * Get all of the user's settings
     * @returns {Promise<{}>}
     */
    async getSettings() {

        let results = {};
        let records = await this._db.get_all('user_settings', {'user': this.id});
        if (records) {
            for (let row of records) {
                results[row.setting] = row.value;
            }
        }

        return results;

    }

    /**
     * Get a specific setting for the user
     * @param setting
     * @param guild_id
     * @returns {Promise<*>}
     */
    async getSetting(setting, guild_id = null) {
        return await this._db.get('user_settings', {'user': this.id, 'setting': setting, 'guild': guild_id});
    }

    /**
     * Set a goal for the user
     * @returns {Promise<number|*>}
     * @param setting
     * @param value
     * @param guild_id
     */
    async updateSetting(setting, value, guild_id = null) {

        const record = await this.getSetting(setting, guild_id);

        if (record) {
            record.value = value;
            return await this._db.update('user_settings', record);
        } else {
            return await this._db.insert('user_settings', {
                'user': this.id, 'setting': setting, 'guild': guild_id, 'value': value
            });
        }

    }

    /**
     * Get a user record
     * @param name
     * @param guild_id
     * @returns {Promise<*>}
     */
    async getRecord(name) {
        return await this._db.get('user_records', {'user': this.id, 'record': name});
    }

    /**
     * Update a record for the user
     * @returns {Promise<number|*>}
     * @param record
     * @param value
     * @param guild_id
     */
    async updateRecord(record, value) {

        const user_record = await this.getRecord(record);

        if (user_record) {
            user_record.value = value;
            return await this._db.update('user_records', user_record);
        } else {
            return await this._db.insert('user_records', {
                'user': this.id, 'record': record, 'value': value
            });
        }

    }

    /**
     * Get the user's most recent sprint, not including current one.
     * @param sprint_id
     * @returns {Promise<{length}|*|boolean>}
     */
    async getMostRecentSprint(sprint_id) {
        return await this._db.get_sql('SELECT * FROM sprint_users WHERE user = ? AND sprint != ? ORDER BY id DESC', [
            this.id, sprint_id
        ])
    }

    /**
     * Add written words amount to all of the user's current goals.
     * @param amount
     * @returns {Promise<void>}
     */
    async addToGoals(amount) {

        const goals = await this._db.get_all('user_goals', {'user': this.id});
        if (goals) {
            for (let goal of goals) {

                // Add the words written to this goal.
                let value = parseInt(amount) + goal.current;
                if (value < 0) {
                    value = 0;
                }

                // Is the goal already completed?
                const already_completed = (goal.completed === 1);
                let now_completed = false;

                // If it is now completed and it wasn't before.
                if (value >= goal.goal && !already_completed) {
                    goal.completed = 1;
                    now_completed = true;
                }

                // Update the goal record.
                goal.current = value;
                await this._db.update('user_goals', goal);

                // If we just met the goal, add the XP.
                if (now_completed) {

                    // Increment goals completed stat.
                    await this.addStat(goal.type + '_goals_completed', 1);

                    // Increment XP.
                    await this.addXP(Experience.XP_COMPLETE_GOAL[goal.type]);

                    // Print message saying they've completed the goal.
                    await Helper.say(`${this.getMention()} has met their ${goal.type} goal of ${goal.goal} words!     +${Experience.XP_COMPLETE_GOAL[goal.type]}xp`, this._interaction, this._client, this._channel);

                }

            }
        }

    }

    /**
     * Reset user's entire stats, records, xp, etc...
     */
    async reset() {
        await this._db.delete('user_challenges', {'user': this.id})
        await this._db.delete('user_goals', {'user': this.id})
        await this._db.delete('user_records', {'user': this.id})
        await this._db.delete('user_stats', {'user': this.id})
        await this._db.delete('user_xp', {'user': this.id})
        await this._db.delete('projects', {'user': this.id})
    }

    /**
     * Delete all the user's projects.
     */
    async resetProjects() {
        await this._db.delete('projects', {'user': this.id})
    }

}

module.exports = User;