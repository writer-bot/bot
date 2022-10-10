const Helper = require('./helper');

class User {

    constructor(id, username, db) {
        this._db = db;
        this.id = id;
        this.username = username;
        this.stats = {};
    }

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

    async completeChallenge(challenge) {

        // Update the record.
        challenge.completed = Helper.getUnixTimestamp();
        await this._db.update('user_challenges', challenge);

        // TODO: Add the XP.
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

    async addXP(xp) {

    }

}

module.exports = User;