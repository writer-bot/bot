const { SlashCommandBuilder } = require('discord.js');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('flip')
        .setDescription('Flip a coin'),

    /**
     * Execute the flip command
     * @param interaction
     * @param client
     * @returns {Promise<void>}
    */

    async execute(interaction, client){

        // Defer the reply.
        await interaction.deferReply();

        // Generate a random number of either 0 or 1.
        const rand = Math.round(Math.random());
        const side = rand === 0 ? 'heads' : 'tails';

        // Send the reply.
        await interaction.editReply({ content:  `It landed on ${side}!`});

    }

}