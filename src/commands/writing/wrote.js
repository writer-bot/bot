const { SlashCommandBuilder } = require('discord.js');
const User = require('../../classes/user');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('wrote')
        .setDescription('Add to your total words written statistic')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('How many words did you write? (Use negative numbers to remove words)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('project')
                .setDescription('The shortname of the project you wrote in')
                .setRequired(false)
        ),

    /**
     * Execute the wrote command
     * @param interaction
     * @param client
     * @param db
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        const user = new User(interaction.user.id, db, interaction);

        // Defer the reply.
        await interaction.deferReply();

        // Get the arguments.
        const amount = interaction.options.getInteger('amount');
        const project_shortname = interaction.options.getString('project');
        let message = '';

        // TODO: Project stuff.

        // Add words.
        await user.addStat('total_words_written', amount);

        // Get new amount.
        const total = await user.getStat('total_words_written');

        // Update goals with added words written.
        await user.addToGoals(amount);

        message += `added ${amount} to your total words written **(${total})**`;

        return await interaction.editReply(`${user.getMention()}, ${message}`);

    }

};