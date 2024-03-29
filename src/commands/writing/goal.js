const { SlashCommandBuilder } = require('discord.js');
const User = require('../../classes/user');
const Goal = require('../../classes/goal');
const EmbeddedMessage = require('../../classes/embed');
const Helper = require('../../classes/helper');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('goal')
        .setDescription('Manage your writing goals')
        .addSubcommand(subcommand =>
            subcommand.setName('set')
                .setDescription('Set a writing goal')
                .addStringOption((option) => {
                    option.setName('type')
                        .setDescription('Which goal do you want to set?')
                        .setRequired(true)

                    for (const [key, name] of Object.entries(Goal.TYPES)) {
                        option.addChoices({
                            name: name, value: key
                        });
                    }

                    return option;

                })
                .addIntegerOption((option) =>
                    option.setName('amount')
                        .setDescription('Word count to set as the goal')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('delete')
                .setDescription('Delete one of your writing goals')
                .addStringOption((option) => {
                    option.setName('type')
                        .setDescription('Which goal do you want to delete?')
                        .setRequired(true)

                    for (const [key, name] of Object.entries(Goal.TYPES)) {
                        option.addChoices({
                            name: name, value: key
                        });
                    }

                    return option;

                })
        )
        .addSubcommand(subcommand =>
            subcommand.setName('update')
                .setDescription('Manually update your progress on a writing goal (without affecting level/xp/other goals)')
                .addStringOption((option) => {
                    option.setName('type')
                        .setDescription('Which goal do you want to update?')
                        .setRequired(true)

                    for (const [key, name] of Object.entries(Goal.TYPES)) {
                        option.addChoices({
                            name: name, value: key
                        });
                    }

                    return option;

                })
                .addIntegerOption((option) =>
                    option.setName('amount')
                        .setDescription('Word count to set as the goal\'s current progress')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('check')
                .setDescription('Check the progress of one or all of your writing goals')
                .addStringOption((option) => {
                    option.setName('type')
                        .setDescription('Which goal do you want to check?')
                        .setRequired(false)

                    for (const [key, name] of Object.entries(Goal.TYPES)) {
                        option.addChoices({
                            name: name, value: key
                        });
                    }

                    return option;

                })
        )
        .addSubcommand(subcommand =>
            subcommand.setName('time')
                .setDescription('Check how long until your goal resets')
                .addStringOption((option) => {
                    option.setName('type')
                        .setDescription('Which goal do you want to check?')
                        .setRequired(true)

                    for (const [key, name] of Object.entries(Goal.TYPES)) {
                        option.addChoices({
                            name: name, value: key
                        });
                    }

                    return option;

                })
        )
        .addSubcommand(subcommand =>
            subcommand.setName('history')
                .setDescription('Check the historical data for one of your writing goals')
                .addStringOption((option) => {
                    option.setName('type')
                        .setDescription('Which goal do you want to check?')
                        .setRequired(true)

                    for (const [key, name] of Object.entries(Goal.TYPES)) {
                        option.addChoices({
                            name: name, value: key
                        });
                    }

                    return option;

                })
        )
    ,


    /**
     * Execute the goal command
     * @param interaction
     * @param client
     * @param db
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        const user = new User(interaction.user.id, db, interaction);
        const subCommand = interaction.options.getSubcommand();

        // Defer the reply.
        await interaction.deferReply();

        // Set a goal.
        if (subCommand === 'set') {

            const type = interaction.options.getString('type');
            const amount = interaction.options.getInteger('amount');
            if (amount < 1) {
                return await interaction.editReply(`${user.getMention()}, please enter a valid amount.`);
            }

            // Set the user's goal.
            await user.setGoal(type, amount);
            return await interaction.editReply(`${user.getMention()}, ${type} goal set to **${amount}**. Now get writing!`);

        }

        // Delete a goal.
        else if (subCommand === 'delete') {

            const type = interaction.options.getString('type');

            await user.deleteGoal(type);
            return await interaction.editReply(`${user.getMention()}, you have deleted your ${type} goal.`);

        }

        // Update the progress of a goal manually.
        else if (subCommand === 'update') {

            const type = interaction.options.getString('type');
            const amount = interaction.options.getInteger('amount');
            if (amount < 0) {
                return await interaction.editReply(`${user.getMention()}, please enter a valid amount.`);
            }

            // Do they have a goal?
            const goal = await user.getGoal(type);
            if (goal) {
                await user.updateGoal(goal, amount);
                return await interaction.editReply(`${user.getMention()}, manually updated your ${type} goal progress to: **${amount}**.`);
            } else {
                return await interaction.editReply(`${user.getMention()}, you do not currently have a ${type} goal. Maybe you should set one?`);
            }

        }

        // Check the goal progress.
        else if (subCommand === 'check') {

            const type = interaction.options.getString('type');
            if (type) {

                const progress = await user.getGoalProgress(type);
                if (progress.exists) {
                    return await interaction.editReply(`${user.getMention()}, you are **${progress.percent}%** of the way to your ${type} goal. (${progress.current}/${progress.goal}).`);
                } else {
                    return await interaction.editReply(`${user.getMention()}, you do not currently have a ${type} goal. Maybe you should set one?`);
                }

            } else {

                let fields = [];

                for (const [type, name] of Object.entries(Goal.TYPES)) {

                    let text = '';
                    const progress = await user.getGoalProgress(type);

                    // Do they have this goal?
                    if (progress.exists) {

                        text += `Your ${type} goal is to write **${progress.goal}** words.\n`;
                        text += `You are **${progress.percent}%** of the way to your ${type} goal. (${progress.current}/${progress.goal})\n`;
                        text += `Approx ${progress.time_left} until ${type} goal reset.\n`;

                        // Show average rate needed to reach goal.
                        if (type !== 'daily' && progress.remaining > 0) {
                            text += `If you write approx ${progress.daily_rate} words per day, you should meet your ${type} goal!\n`;
                        } else if ( progress.remaining <= 0 ) {
                            // They met their goal.
                            text += `You have met your ${type} goal of ${progress.goal} words!\n`;
                        }

                    } else {
                        text = 'None';
                    }

                    fields.push({ name: Helper.firstUpper(type), value: text, inline: false });

                }

                const embed = new EmbeddedMessage(interaction.user)
                    .build({
                        title: 'Writing Goals',
                        fields: fields,
                    });

                return interaction.editReply({ embeds: [embed] });

            }

        }

        else if (subCommand === 'time') {

            const type = interaction.options.getString('type');
            const goal = await user.getGoal(type);
            if (goal) {

                const now = Helper.getUnixTimestamp();
                let left = Helper.formatSecondsToDays(parseInt(goal.reset) - now);
                if (left === '') {
                    left = 'no time';
                }
                return await interaction.editReply(`${user.getMention()}, ${left} left until ${type} goal resets.`);

            } else {
                return await interaction.editReply(`${user.getMention()}, you do not currently have a ${type} goal. Maybe you should set one?`);
            }

        }

        else if (subCommand === 'history') {

            const type = interaction.options.getString('type');
            const history = await user.getGoalHistory(type);
            let fields = [];
            if (history) {
                for (let record of history) {

                    let text = '';
                    text += record.result + '/' + record.goal;
                    if (record.completed) {
                        text += ' :white_check_mark:';
                    }
                    fields.push({ name: record.date, value: text, inline: false });

                }
            }

            const embed = new EmbeddedMessage(interaction.user)
                .build({
                    title: `${Helper.firstUpper(type)} Goal History`,
                    fields: fields,
                });

            return interaction.editReply({ embeds: [embed] });

        }

    }

};