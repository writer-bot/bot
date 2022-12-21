const { SlashCommandBuilder } = require('discord.js');
const User = require('../../classes/user');
const Project = require('../../classes/project');

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

        // Update project with written words.
        if (project_shortname !== null) {

            const project = await Project.get(db, user.id, project_shortname);
            if (!project.is_valid()) {
                return await interaction.editReply(`${user.getMention()}, you do not have a project with that name`);
            }

            // Increment project word count.
            project.words += amount;
            await project.save();

            // Add to the message.
            let written = await user.getStat('total_words_written');
            if (written === null) {
                written = 0;
            }
            let total = parseInt(written) + amount;

            message += `added ${amount} to your project **${project.name} (${project.shortname})** (${project.words}) [${total}]`;

        }

        // Add words.
        await user.addStat('total_words_written', amount);

        // Get new amount.
        const total = await user.getStat('total_words_written');

        // Update goals with added words written.
        await user.addToGoals(amount);

        if (message === '') {
            message += `added ${amount} to your total words written **(${total})**`;
        }

        return await interaction.editReply(`${user.getMention()}, ${message}`);

    }

};