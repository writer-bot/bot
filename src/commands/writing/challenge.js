const { SlashCommandBuilder } = require('discord.js');
const Challenge = require('./../../classes/challenge');
const User = require('./../../classes/user');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('challenge')
        .setDescription('Generate a writing challenge to complete')
        .addSubcommand(subcommand =>
            subcommand.setName('start')
                .setDescription('Start a new writing challenge')
                .addStringOption((option) => {

                    option.setName('difficulty')
                        .setDescription('How difficult should the writing challenge be?')
                        .setRequired(false);

                    for (const [key, name] of Object.entries(Challenge.DIFFICULTIES)) {
                        option.addChoices({
                            name: name, value: key
                        });
                    }

                    return option;

                })
                .addIntegerOption(option =>
                    option.setName('length')
                        .setDescription('How long should the challenge last for (minutes)?')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('cancel')
                .setDescription('Cancel your current writing challenge')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('complete')
                .setDescription('Mark your current writing challenge as complete')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('check')
                .setDescription('Check what your current writing challenge is')
        ),

    /**
     * Execute the challenge command
     * @param interaction
     * @param client
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        const subCommand = interaction.options.getSubcommand();
        const user = new User(interaction.user.id, interaction.user.username, db);

        // Defer the reply.
        await interaction.deferReply();

        // TODO: Guild command disable check.

        // Get the user's current challenge, if one exists.
        const challenge = await user.getChallenge();

        if (subCommand === 'start') {

            // If they already have a challenge, can't start a new one yet.
            if (challenge) {
                return await interaction.editReply(`${user.getMention()}, you already have an active writing challenge: **${challenge.challenge}**`);
            } else {

                // Create the writing challenge.
                let wpm = Math.floor(Math.random() * (Challenge.WPM.max - Challenge.WPM.min + 1) + Challenge.WPM.min);
                let time = Math.floor(Math.random() * (Challenge.TIME.max - Challenge.TIME.min + 1) + Challenge.TIME.min);

                // If they specified a difficulty or length, then change the default random values.
                const difficulty = interaction.options.getString('difficulty');
                const length = interaction.options.getInteger('length');

                // Did they specify a difficulty?
                if (difficulty !== null) {

                    let newMin, newMax;

                    if (difficulty === 'easy') {
                        newMin = 3;
                        newMax = 5;
                    } else if (difficulty === 'normal') {
                        newMin = 10;
                        newMax = 15;
                    } else if (difficulty === 'hard') {
                        newMin = 20;
                        newMax = 30;
                    } else if (difficulty === 'hardcore') {
                        newMin = 35;
                        newMax = 45;
                    } else if (difficulty === 'insane') {
                        newMin = 50;
                        newMax = 60;
                    }

                    wpm = Math.floor(Math.random() * (newMax - newMin + 1) + newMin);

                }

                // Did they specify a length?
                if (length !== null) {
                    time = length;
                }

                // Calculate the word goal and XP.
                const goal = wpm * time;
                const xp = Challenge.calculateXp(wpm);
                const theChallenge = `Write at least ${goal} words, in ${time} minutes (${wpm} wpm)`;

                await user.setChallenge(theChallenge, xp);
                return await interaction.editReply(`${user.getMention()}, your new challenge is: **${theChallenge}**`);

            }

        } else if (subCommand === 'cancel') {

            if (challenge) {
                await user.deleteChallenge();
                return await interaction.editReply(`${user.getMention()}, you have cancelled your writing challenge`);
            } else {
                return await interaction.editReply(`${user.getMention()}, you do not have an active writing challenge`);
            }

        } else if (subCommand === 'complete') {

            if (challenge) {

                await user.completeChallenge(challenge);
                return await interaction.editReply(`${user.getMention()}, you have completed your writing challenge **${challenge.challenge}**      +${challenge.xp}xp`);

            } else {
                return await interaction.editReply(`${user.getMention()}, you do not have an active writing challenge`);
            }

        } else if (subCommand === 'check') {

            if (challenge) {
                return await interaction.editReply(`${user.getMention()}, your current challenge is: **${challenge.challenge}**`);
            } else {
                return await interaction.editReply(`${user.getMention()}, you do not have an active writing challenge`);
            }

        }

    }

};