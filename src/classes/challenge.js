class Challenge {

    static DIFFICULTIES = {
        'easy': 'Easy',
        'normal': 'Normal',
        'hard': 'Hard',
        'hardcore': 'Hardcore',
        'insane': 'Insane',
    };

    static WPM = {
        'min': 5,
        'max': 30,
    };

    static TIME = {
        'min': 5,
        'max': 120,
    };

    /**
     * Calculate how much experience to give based on the WPM of the challenge.
     * @param wpm {number}
     * @returns {number}
     */
    static calculateXp(wpm){

        if (wpm <= 5) {
            return 20;
        } else if (wpm <= 15) {
             return 40;
        } else if (wpm <= 30) {
            return 75;
        } else if (wpm <= 45) {
            return 100;
        } else if (wpm > 45) {
            return 150;
        }

    };

}

module.exports = Challenge;