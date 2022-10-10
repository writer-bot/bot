class Helper {

    /**
     * Get the unix timestamp
     * @returns {number}
     */
    static getUnixTimestamp() {
        return Math.floor(
            Date.now() / 1000
        );
    }

}

module.exports = Helper;