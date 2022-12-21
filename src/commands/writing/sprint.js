const { SlashCommandBuilder } = require('discord.js');
const User = require('../../classes/user');
const Sprint = require('../../classes/sprint');


module.exports = {

    data: new SlashCommandBuilder()
        .setName('sprint')
        .setDescription('Take part in writing sprints with other users on your server')
        .addSubcommand(subcommand =>
            subcommand.setName('for')
                .setDescription('Start a new writing sprint')
                .addIntegerOption((option) =>
                    option.setName('length')
                        .setDescription('How many minutes should the sprint last for? (Min: 1, Max: 60)')
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option.setName('in')
                        .setDescription('Start a sprint in (minutes) time from now (Min: 1, Max: 1440)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('cancel')
                .setDescription('Cancel the current writing sprint')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('end')
                .setDescription('End the current writing sprint early')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('leave')
                .setDescription('Leave the current writing sprint')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('status')
                .setDescription('Check the status of the current sprint')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('notify')
                .setDescription('Set whether or not you want to be notified of new sprints on this server')
                .addIntegerOption((option) =>
                    option.setName('notifications')
                        .setDescription('Do you want to be notified?')
                        .setRequired(true)
                        .addChoices({name: 'Yes', value: 1}, {name: 'No', value: 0})
                )
        )
        .addSubcommandGroup((group_join) => {
            group_join
                .setName('join')
                .setDescription('Join the current writing sprint')
                .addSubcommand((join_standard) => {
                    join_standard
                        .setName('normal')
                        .setDescription('Join the current sprint normally')
                        .addIntegerOption((option) =>
                            option.setName('initial')
                                .setDescription('Initial word count to start from (Default: 0)')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option.setName('project')
                                .setDescription('Project shortname to sprint in')
                                .setRequired(false)
                        );
                    return join_standard;
                })
                .addSubcommand((join_no_wc) => {
                    join_no_wc
                        .setName('no-wordcount')
                        .setDescription('Join the current sprint as an editing/non-writing user, with no word count')
                        .addStringOption((option) =>
                            option.setName('project')
                                .setDescription('Project shortname to sprint in')
                                .setRequired(false)
                        );
                    return join_no_wc;
                })
                .addSubcommand((join_same) => {
                    join_same
                        .setName('same')
                        .setDescription('Join the current sprint, starting where you left of last time (word count and project)');
                    return join_same;
                })
            return group_join;
        })
        .addSubcommand(subcommand =>
            subcommand.setName('wrote')
                .setDescription('Add/subtract words from your sprint word count')
                .addIntegerOption((option) =>
                    option.setName('amount')
                        .setDescription('How many words do you want to add to your word count? (Use negative to subtract)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('wc')
                .setDescription('Declare your word count for the sprint')
                .addIntegerOption((option) =>
                    option.setName('amount')
                        .setDescription('The word count to declare')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('pb')
                .setDescription('Check your personal best WPM for all sprints')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('purge')
                .setDescription('Remove a user from getting sprint notifications')
                .addUserOption((option) =>
                    option.setName('user')
                        .setDescription('(If they are not in the list - right click their name from the sprint notifications and Copy ID)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('project')
                .setDescription('Choose which of your projects you are sprinting in, to have the word count added to it')
                .addStringOption((option) =>
                    option.setName('shortname')
                        .setDescription('Project shortname')
                        .setRequired(true)
                )
        ),

    /**
     * Execute the sprint command
     * @param interaction
     * @param client
     * @param db
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        const user = new User(interaction.user.id, db, interaction);

        const group = interaction.options.getSubcommandGroup();
        const subCommand = interaction.options.getSubcommand();

        // Defer the reply.
        await interaction.deferReply();

        // Get the sprint object which is currently running, if there is one on this server.
        const sprint = await Sprint.load(interaction.guildId, db);

        if (subCommand === 'for') {

            // Start a sprint.
            const length = interaction.options.getInteger('length');
            const in_mins = interaction.options.getInteger('in');

            return await Sprint.command_start(interaction, db, sprint, user, length, in_mins);

        } else if (subCommand === 'cancel') {

            // Cancel a sprint.
            return await Sprint.command_cancel(interaction, db, sprint, user);

        } else if (subCommand === 'end') {

            // Cancel a sprint.
            return await Sprint.command_end(interaction, db, sprint, user);

        } else if (subCommand === 'leave') {

            // Leave a sprint.
            return await Sprint.command_leave(interaction, db, sprint, user);

        } else if (group === 'join') {

            // Join a sprint.
            const initial = interaction.options.getInteger('initial');
            const project_shortname = interaction.options.getString('project');

            return await Sprint.command_join(interaction, db, sprint, user, initial, project_shortname, subCommand);

        } else if (subCommand === 'status') {

            // Check your sprint status.
            return await Sprint.command_status(interaction, db, sprint, user);

        } else if (subCommand === 'notify') {

            // Change sprint notifications for the user.
            const notifications = interaction.options.getInteger('notifications');
            return await Sprint.command_notify(interaction, db, sprint, user, notifications);

        } else if (subCommand === 'wrote') {

            // Change sprint notifications for the user.
            const amount = interaction.options.getInteger('amount');
            return await Sprint.command_wrote(interaction, db, sprint, user, amount);

        } else if (subCommand === 'wc') {

            // Change sprint notifications for the user.
            const amount = interaction.options.getInteger('amount');
            return await Sprint.command_declare(interaction, db, sprint, user, amount);

        } else if (subCommand === 'pb') {

            // Check personal best WPM.
            return await Sprint.command_pb(interaction, db, sprint, user);

        } else if (subCommand === 'purge') {

            // Purge old notification users.
            const who = interaction.options.getUser('user');
            return await Sprint.command_purge(interaction, db, sprint, user, who);

        } else if (subCommand === 'project') {

            // Purge old notification users.
            const shortname = interaction.options.getString('shortname');
            return await Sprint.command_project(interaction, db, sprint, user, shortname);

        }

    }

};