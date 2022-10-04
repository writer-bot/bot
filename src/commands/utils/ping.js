const { SlashCommandBuilder } = require('discord.js');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Displays the latency between client and bot'),

    /**
     * Execute the ping command
     * @param interaction
     * @param client
     * @returns {Promise<void>}
     */
    async execute(interaction, client) {

        // Defer the reply.
        await interaction.deferReply();

        // TODO: Guild command disable check.

        // Send a reply first, so we can measure time against it.
        const sent = await interaction.editReply({
            content: 'Pinging bot...',
            fetchReply: true,
        });

        const ping = sent.createdTimestamp - interaction.createdTimestamp;

        // Edit the reply and add the embed int.
        await interaction.editReply({ content: `Pong! **${ping}ms**`});

    }

};