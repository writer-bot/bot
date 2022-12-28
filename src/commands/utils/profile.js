const { SlashCommandBuilder } = require('discord.js');
const User = require('../../classes/user');
const EmbeddedMessage = require('../../classes/embed');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Displays your user profile'),

    /**
     * Execute the profile command
     * @param interaction
     * @param client
     * @param db
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        // Defer the reply.
        await interaction.deferReply();

        // Get the user.
        const user = new User(interaction.user.id, db, interaction);

        profile = {
            'lvlxp': await user.getXPBar(),
            'words': await user.getStat('total_words_written'),
            'words_sprints': await user.getStat('sprints_words_written'),
            'sprints_started': await user.getStat('sprints_started'),
            'sprints_completed': await user.getStat('sprints_completed'),
            'sprints_won': await user.getStat('sprints_won'),
            'challenges_completed': await user.getStat('challenges_completed'),
            'daily_goals_completed': await user.getStat('daily_goals_completed'),
            'weekly_goals_completed': await user.getStat('weekly_goals_completed'),
            'monthly_goals_completed': await user.getStat('monthly_goals_completed'),
            'yearly_goals_completed': await user.getStat('yearly_goals_completed'),
        };

        // Build the fields for the embedded message.
        let fields = [];
        fields.push({ name: 'Level (XP)', value: `${profile['lvlxp']}`, inline: true});
        fields.push({ name: 'Words Written', value: `${profile['words'] ? profile['words'] : '0'}`, inline: true});
        fields.push({ name: 'Words Written in Sprints', value: `${profile['words_sprints'] ? profile['words_sprints'] : '0'}`, inline: true});
        fields.push({ name: 'Sprints Started', value: `${profile['sprints_started'] ? profile['sprints_started'] : '0'}`, inline: true});
        fields.push({ name: 'Sprints Completed', value: `${profile['sprints_completed'] ? profile['sprints_completed']: '0'}`, inline: true});
        fields.push({ name: 'Sprints Won', value: `${profile['sprints_won'] ? profile['sprints_won'] : '0'}`, inline: true});
        fields.push({ name: 'Challenges Completed', value: `${profile['challenges_completed'] ? profile['challenges_completed'] : '0'}`, inline: true});
        fields.push({ name: 'Daily Goals Completed', value: `${profile['daily_goals_completed'] ? profile['daily_goals_completed'] : '0'}`, inline: true});
        fields.push({ name: 'Weekly Goals Completed', value: `${profile['weekly_goals_completed'] ? profile['weekly_goals_completed'] : '0'}`, inline: true});
        fields.push({ name: 'Monthly Goals Completed', value: `${profile['monthly_goals_completed'] ? profile['monthly_goals_completed'] : '0'}`, inline: true});
        fields.push({ name: 'Yearly Goals Completed', value: `${profile['yearly_goals_completed'] ? profile['yearly_goals_completed'] : '0'}`, inline: true});

        // Build embedded message.
        const embed = new EmbeddedMessage(interaction.user)
        .build({
            title: interaction.user.username,
            description: 'Your Profile',
            fields: fields
        });
        
        // Send the reply.
        return interaction.editReply({ embeds: [embed] });
        
    }
};