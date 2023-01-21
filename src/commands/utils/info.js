const { SlashCommandBuilder } = require('discord.js');
const EmbeddedMessage = require('../../classes/embed');
const HumanDate = require('human-date');
const moment = require('moment');
const Helper = require('../../classes/helper');
require('dotenv').config();

module.exports = {

    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Displays information and statistics about the bot'),

    /**
     * Execute the info command
     * @param interaction
     * @param client
     * @param db
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        // Defer the reply.
        await interaction.deferReply();

        const shardID = interaction.guild.shardId;
        const now = new Date();

        const promises = [
            client.cluster.fetchClientValues('guilds.cache.size'),
            client.cluster.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
        ];

        // Build the fields for the embedded message.
        let fields = [];
        fields.push({ name: 'Version', value: process.env.VERSION, inline: true });
        fields.push({ name: 'Up since', value: HumanDate.relativeTime(client.uptime / 1000, {futureSuffix: 'ago', allUnits: true}), inline: true });
        fields.push({ name: 'Latency', value: client.ws.ping.toString() + 'ms', inline: true });
        fields.push({ name: 'Server Time', value: moment(now).format('DD-MMM-YYYY, HH:mm'), inline: true });
        fields.push({ name: 'Shard #', value: shardID.toString(), inline: true });

        const active_sprints = await db.get_sql('SELECT COUNT(id) as cnt FROM sprints WHERE completed = 0 AND end >= ?', [Helper.getUnixTimestamp()]);
        const completed_sprints = await db.get_sql('SELECT COUNT(id) as cnt FROM sprints WHERE completed > 0');

        Promise.all(promises).then(results => {

            let stats = [];
            stats.push(`- Total Servers: ${results[0].reduce((acc, guildCount) => acc + guildCount, 0).toLocaleString()}`);
            stats.push(`- Total Users: ${results[1].reduce((acc, memberCount) => acc + memberCount, 0).toLocaleString()}`);
            stats.push(`- Total Active Sprints: ${active_sprints.cnt.toLocaleString()}`);
            stats.push(`- Total Completed Sprints: ${completed_sprints.cnt.toLocaleString()}`);
            fields.push({ name: 'General Statistics', value: stats.join("\n") });

            // Build embedded message with bot info.
            const embed = new EmbeddedMessage(interaction.user)
                .build({
                    title: 'About the bot',
                    url: process.env.SUPPORT_SERVER,
                    description: 'For help with the bot, please visit the Support Server (link above)',
                    fields: fields,
                });

            return interaction.editReply({ embeds: [embed] });

        });



    }

};