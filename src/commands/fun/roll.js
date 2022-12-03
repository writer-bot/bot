const { SlashCommandBuilder } = require('discord.js');

const ROLL_MAX_SIDES = 1000000000000;
const ROLL_MAX_ROLLS = 100;

module.exports = {

    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll one or more dice and get the result')
        .addStringOption((option) => 
           option.setName('dice') 
                .setDescription('What dice do you want to roll? Format: {number}d{sides}, e.g. 1d6, 2d20, etc... Default: 1d6')
                .setRequired(false)
        ),

    /**
     * Execute the roll command
     * @param interaction
     * @param client
     * @returns {Promise<void>}
    */

    async execute(interaction, client) {

        //Defer the reply
        await interaction.deferReply();

        //Set default rolls and sides
        var rolls = 1;
        var sides = 6;

        //Read the input by user
        const dice = interaction.options.getString('dice');

        //If input is not empty check the format.
        if (dice) {

            //Make sure the format is correct.
            try {
                rolls = parseInt(dice.split('d')[0], 10);
                sides = parseInt(dice.split('d')[1], 10);
            } catch (error) {
                await interaction.editReply({ content:  `Dice option must be in format #d# (e.g. 1d6 or 2d20)`});     
                return;
            }
        }

        //Make sure the sides and rolls are valid.
        if (sides < 1)
            sides = 1;
        else if (sides > ROLL_MAX_SIDES)
            sides = self.ROLL_MAX_SIDES;

        if (rolls < 1)
            rolls = 1;
        else if (rolls > ROLL_MAX_ROLLS)
            rolls = ROLL_MAX_ROLLS

        var total = 0;
        var output = '';

        //Roll the dice {rolls} amount of times.
        for (var x = 1; x <= rolls; x++) {
            //generate a radnom number between 1 and {sides}
            const val = Math.floor(Math.random() * sides + 1);
            
            total += val;
            output += ` [ ${val} ] `

        }

        output += `\n**Total: ${total}**`

        //send the reply
        await interaction.editReply({ content:  output});
    }
}

