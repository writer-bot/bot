const Helper = require('./helper');

class Generator {

    // All the things you can generate.
    static TYPES = {
        'char': 'Character',
        'place': 'Place',
        'land': 'Land',
        'idea': 'Idea',
        'book': 'Book',
        'book_fantasy': 'Fantasy Book',
        'book_horror': 'Horror Book',
        'book_hp': 'Harry Potter Book',
        'book_mystery': 'Mystery Book',
        'book_rom': 'Romance Book',
        'book_sf': 'Sci-Fi Book',
        'quote': 'Quote',
        'prompt': 'Prompt',
        'face': 'Face',
        'question_char': 'Character-building question',
        'question_world': 'World-building question',
    };

    static MAX_AMOUNT = 25;
    static DEFAULT_AMOUNT = 10;
    static MAX_RETRIES = 10;
    static SINGULAR = ['prompt', 'idea', 'quote'];
    static URLS = {
        'face': 'https://thispersondoesnotexist.com/',
    };

    /**
     * Construct the generator object
     * @param type
     */
    constructor(type) {
        this.type = type;
        this.last = '';
    }

    /**
     * Generate some random things
     * @param amount
     * @returns {{names: [], message: string}}
     */
    generate(amount) {

        let names = [];

        // If amount requested is higher than max, set to max.
        if (amount > Generator.MAX_AMOUNT) {
            amount = Generator.MAX_AMOUNT;
        }

        // If it's less than 1, set to default.
        if (amount < 1) {
            amount = Generator.DEFAULT_AMOUNT;
        }

        // Prompts is a max of 5, as otherwise it can go over 2000 characters.
        if (this.type === 'prompt') {
            amount = 5;
        }

        const file = 'gen_' + this.type;
        const source = Helper.getJSONAsset(file);
        let retry_attempts = 0;

        if (source) {

            const choices = source['names'];
            const formats = source['formats'];

            // Loop as many times as the amount we requested, and build up a generated name for each item.
            let x = 0;
            while (x < amount) {

                // Increment loop number.
                x += 1;

                // Pick a format.
                let format = Helper.choose(formats);

                // Reset variable used to store last chosen element, so we don't have the same thing twice in a row.
                this.last = '';

                // Generate a name.
                let name = this.replace(choices, format);
                name = name.trim();

                // If we've already had this exact one, try again.
                if (names.includes(name) && retry_attempts < Generator.MAX_RETRIES) {
                    x -= 1;
                    retry_attempts += 1;
                } else {
                    names.push(name);
                    retry_attempts = 0;
                }

            }

            // Sort results alphabetically.
            names.sort();

            // If it's not an idea, prompt or quote, capitalize each word.
            if (!Generator.SINGULAR.includes(this.type)) {
                names = names.map((item) => {
                    const words = item.split(' ');
                    return words.map(word => {
                        return word[0].toUpperCase() + word.substring(1);
                    }).join(' ');
                });
            }

        }

        return {
            'message': `Here are you ${amount} ${Generator.TYPES[this.type]} results:\n\n`,
            'names': names,
        };

    }

    /**
     * Replace the placeholders with actual values
     * @param choices
     * @param format
     * @returns {string}
     */
    replace(choices, format) {

        let last = this.last;

        let result = format.replace(/\$[a-z0-9]+/g, function (match) {

            match = match.replace('$', '');
            if (Object.keys(choices).includes(match)) {

                // Generate a choice.
                let choice = Helper.choose(choices[match]);

                // Make sure it's not the same as the last choice of this type.
                let i = 0;
                while (choice.length > 2 && choice == last && i < Generator.MAX_RETRIES) {
                    i += 1;
                    choice = Helper.choose(choices[match]);
                }

                return choice;

            } else {
                return match;
            }

        }).trim();

        this.last = result;
        return result;

    }

}

module.exports = Generator;