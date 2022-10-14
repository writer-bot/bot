class Experience {

    static XP_CALC_KEY = 50;
    static XP_COMPLETE_SPRINT = 25;
    static XP_WIN_SPRINT = 100;
    static XP_COMPLETE_GOAL = {
        'daily': 100,
        'weekly': 250,
        'monthly': 500,
        'yearly': 2500,
    };

    /**
     * Construct an instance
     * @param xp
     */
    constructor(xp) {
        this.xp = xp;
    }

    /**
     * Update the amount of XP on the object.
     * @param amount
     */
    update(amount) {
        this.xp = amount;
    }

    /**
     * Get the user's level, based on their total XP.
     * @returns {number}
     */
    getLevel() {
        return Math.floor( Math.floor(Experience.XP_CALC_KEY + Math.sqrt( (Experience.XP_CALC_KEY * Experience.XP_CALC_KEY) + (4 * Experience.XP_CALC_KEY) * this.xp )) / (2 * Experience.XP_CALC_KEY) )
    }

    /**
     * Get the required XP for the given level
     * @param level
     * @returns {number}
     */
    getBoundary(level) {
        return Experience.XP_CALC_KEY * level * level - Experience.XP_CALC_KEY * level;
    }

    /**
     * Get how much XP is required to reach the next level.
     * @returns {number}
     */
    getNextLevelXP() {
        return this.getBoundary( this.getLevel() + 1 ) - this.xp
    }

    /**
     * Load an instance of the object
     * @param xp
     * @returns {Experience}
     */
    static load(xp) {
        return new Experience(xp);
    }

}

module.exports = Experience;