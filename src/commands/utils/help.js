const { SlashCommandBuilder } = require('discord.js');
const EmbeddedMessage = require('../../classes/embed');
require('dotenv').config();

module.exports = {

    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Help with how to use the bot and its commands'),

    /**
     * Execute the help command
     * @param interaction
     * @param client
     * @returns {Promise<void>}
     */
    async execute(interaction, client) {

        // Defer the reply.
        await interaction.deferReply();

        // Build embedded message with invite link.
        const embed = new EmbeddedMessage(interaction.user)
            .build({
                title: 'Help',
                description: 'Use the above link to access the bot Wiki for help with commands',
                url: process.env.WIKI_URL,
            });

        await interaction.editReply({ embeds: [embed] });

    }

};