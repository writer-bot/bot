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

    /**
     * Make the first character of the string uppercase
     * @param text
     * @returns {string}
     */
    static firstUpper(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    /**
     * Convert a number of seconds to a nice, human-readable string
     * @param totalSeconds
     * @returns {string}
     */
    static formatSecondsToDays(totalSeconds) {

        const seconds = Math.floor(totalSeconds % 60);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const days = Math.floor(totalSeconds / (3600 * 24));

        const secondsStr = Helper.makeHumanReadable(seconds, 'second');
        const minutesStr = Helper.makeHumanReadable(minutes, 'minute');
        const hoursStr = Helper.makeHumanReadable(hours, 'hour');
        const daysStr = Helper.makeHumanReadable(days, 'day');

        const str = `${daysStr}${hoursStr}${minutesStr}${secondsStr}`.replace(/,\s*$/, '');
        return (str !== '') ? str : '0 seconds';

    }

    /**
     * Used by formatSecondsToDays to format a value with a label, e.g. "1" "second", or "2" "seconds"
     * @param value
     * @param label
     * @returns {string|string}
     */
    static makeHumanReadable(value, label) {
        return value > 0
            ? value + (value === 1 ? ` ${label}, ` : ` ${label}s, `)
            : '';
    }

    /**
     * Check if the given value is a number or can be converted to a number
     * @param value
     * @returns {boolean}
     */
    static isNumber(value) {
        return (!isNaN(parseInt(value)));
    }

}

module.exports = Helper;