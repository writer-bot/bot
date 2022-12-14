const { SlashCommandBuilder } = require('discord.js');
const Helper = require('./../../classes/helper');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('reassure')
        .setDescription('Send a random reassuring message to another user or yourself')
        .addUserOption((option) => 
            option.setName('who')
                .setDescription('Who do you want to reassure?')
                .setRequired(false)
        ),

    /**
     * Execute the reassure command
     * @param interaction
     * @param client
     * @returns {Promise<void>}
    */

    async execute(interaction, client) {

        // Defer the reply.
        await interaction.deferReply();

        let mention = '';

        if (interaction.options.getUser('who'))
            mention = interaction.options.getUser('who');
        else
            mention = interaction.user;

        // Get the reassure msgs from JSON assets.
        const messages = Helper.getJSONAsset('reassure');

        // Get a random number between 0 and {messages} length and pick a random msg.
        const rand = Math.floor(Math.random() * messages.length);
        const quote = messages[rand];

        // Send the reply.
        await interaction.editReply({ content:  `${mention}, ${quote}`});
    }
}