const { SlashCommandBuilder } = require('discord.js');
const EmbeddedMessage = require('../../classes/embed');
require('dotenv').config();

module.exports = {

    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Generates a link to invite the bot to one of your servers'),

    /**
     * Execute the invite command
     * @param interaction
     * @param client
     * @returns {Promise<void>}
     */
    async execute(interaction, client) {

        // Defer the reply.
        await interaction.deferReply();

        // TODO: Guild command disable check.

        // Build embedded message with invite link.
        const embed = new EmbeddedMessage(interaction.user)
            .build({
                title: 'Invite link',
                description: 'Use the above link to invite the bot to your servers',
                url: process.env.INVITE_URL,
            });

        await interaction.editReply({ embeds: [embed] });

    }

};