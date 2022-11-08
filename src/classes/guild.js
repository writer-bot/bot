class Guild {

    /**
     * Construct the guild object
     * @param id
     * @param db
     */
    constructor(id, db) {
        this.id = id;
        this._db = db;
    }

    /**
     * Get all of the guild's settings
     * @returns {Promise<{}>}
     */
    async getSettings() {
        let results = {};
        let records = await this._db.get_all('guild_settings', {'guild': this.id});
        if (records) {
            for (let row of records) {
                results[row.setting] = row.value;
            }
        }
        return results;
    }

    /**
     * Get a specific setting for the guild
     * @param setting
     * @returns {Promise<*>}
     */
    async getSetting(setting) {
        return await this._db.get('guild_settings', {'guild': this.id, 'setting': setting});
    }

    /**
     * Set a setting for the guild
     * @returns {Promise<number|*>}
     * @param setting
     * @param value
     */
    async updateSetting(setting, value) {

        const record = await this.getSetting(setting);

        if (record) {
            record.value = value;
            return await this._db.update('guild_settings', record);
        } else {
            return await this._db.insert('guild_settings', {
                'guild': this.id, 'setting': setting, 'value': value
            });
        }

    }

}

module.exports = Guild;