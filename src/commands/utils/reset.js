const { SlashCommandBuilder } = require('discord.js');
const User = require('../../classes/user');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset some or all of your user statistics')
        .addStringOption((option) =>

            option.setName('statistic')
                .setDescription('What statistic do you want to reset? (This cannot be undone afterwards)')
                .setRequired(true)
                .addChoices(
                    { name: 'WPM Personal Best', value: 'wpm' },
                    { name: 'Words Written', value: 'wc' },
                    { name: 'Experience', value: 'xp' },
                    { name: 'Projects', value: 'projects' },
                    { name: 'Everything', value: 'all' }
                )
        ),

    /**
     * Execute the reset command
     * @param interaction
     * @param client
     * @param db
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        // Defer the reply.
        await interaction.deferReply();

        let output = '';

        // Read the input statistic by user.
        const statistic = interaction.options.getString('statistic');

        // Get the user.
        const user = new User(interaction.user.id, db, interaction);

        if (statistic === 'wpm') {
            await user.updateRecord('wpm', 0);
            output = 'Words per minute PB reset to 0';
        }

        else if (statistic === 'wc') {
            await user.updateStat('total_words_written', 0);
            output = 'Total word count reset to 0';
        }

        else if (statistic === 'xp') {
            const xp = await user.getXP();
            await user.updateXP(xp, 0);
            output = 'Level/XP reset to 0';
        }

        else if (statistic === 'projects') {
            await user.resetProjects();
            output = 'Projects reset';
        }

        else if (statistic === 'all') {
            await user.reset();
            output = 'Profile reset';
        }

        // Send the reply.
        await interaction.editReply({ content: output, ephemeral: true });
    }
};
