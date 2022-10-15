const Helper = require('./helper');
const Experience = require('./experience');

class User {

    constructor(id, username, db, interaction = false) {
        this._db = db;
        this.id = id;
        this.username = username;
        this.stats = {};
        this._client = false;
        this._interaction = interaction;
    }

    /**
     * Set the bot client object into the user object.
     * @param client
     */
    setClient(client) {
        this._client = client;
    }

    /**
     * Send a message, either as an interaction response or directly to a channel from a task
     * @param message
     * @returns {Promise<awaited Promise<Message<BooleanCache<Cached>>> | Promise<Message<BooleanCache<Cached>>> | Promise<Message<BooleanCache<Cached>>>>}
     */
    async say(message) {

        // If the interaction property is not false, that means we are responding to a command.
        if (this._interaction !== false) {
            return await this._interaction.followUp(message);
        } else if (this._client !== false) {
            // If the client property is not false, that means we are running a task and passed the whole client in.
            // TODO:
        } else {
            console.error('[ERROR] Cannot send message. Neither interaction or client object present on User');
        }

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
            if (record) {
                this.stats[name] = record.value;
            }
        }

        // If it still doesn't exist, there's no such stat record for the user.
        if (this.stats[name] !== undefined) {
            return this.stats[name];
        } else {
            return 0;
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

        if (stat) {
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
            await this.say(`:tada: Congratulations ${this.getMention()}, you are now **Level ${user_xp.getLevel()}**`);
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

        // TODO: Calculate next reset time based on user timezone.
        const reset = 0;

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

        const goal = await this.getGoal(type);
        if (goal) {

            progress.exists = true;
            progress.percent = Math.floor((goal.current / goal.goal) * 100);
            progress.done = Math.floor(progress.percent / 10);
            progress.left = 10 - progress.done;
            progress.goal = goal.goal;
            progress.current = goal.current;

            if (progress.done > 10) {
                progress.done = 10;
            }

            if (progress.left < 0) {
                progress.left = 0;
            }

        }

        return progress;

    }

}

module.exports = User;