const fs = require("fs");
const path = require("node:path");

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

    /**
     * Get a JSON asset and return the JSON object
     * @param file
     * @returns {Promise<any>}
     */
    static getJSONAsset(file) {

        const file_path = path.join(APP_DIR, 'assets/json', file + '.json');
        return JSON.parse(fs.readFileSync(file_path));

    }

    /**
     * Choose a random item from an array
     * @param array
     * @returns {*}
     */
    static choose(array) {
        return array.sort(() => 0.5 - Math.random())[0];
    }

}

module.exports = Helper;