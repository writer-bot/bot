const { SlashCommandBuilder } = require('discord.js');
const User = require('../../classes/user');
const Project = require('../../classes/project');
const Setting = require("../../classes/setting");

module.exports = {

    data: new SlashCommandBuilder()
        .setName('project')
        .setDescription('Manage your writing projects')
        .addSubcommand(subcommand =>
            subcommand.setName('create')
                .setDescription('Create a new project')
                .addStringOption((option) =>
                    option.setName('shortcode')
                        .setDescription('A short one-word code for the project. For use when referring to the project.')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option.setName('title')
                        .setDescription('The full title of the project')
                        .setRequired(true)
                )

        )
        .addSubcommand(subcommand =>
            subcommand.setName('delete')
                .setDescription('Delete a project')
                .addStringOption((option) =>
                    option.setName('shortcode')
                        .setDescription('The shortcode of the project')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('view')
                .setDescription('View the full information of a project')
                .addStringOption((option) =>
                    option.setName('shortcode')
                        .setDescription('The shortcode of the project')
                        .setRequired(true)
                )
                .addBooleanOption((option) =>
                    option.setName('public')
                        .setDescription('Should the information be viewable by everyone else in the channel? (Default: no)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('update')
                .setDescription('Update the word count of a project')
                .addStringOption((option) =>
                    option.setName('shortcode')
                        .setDescription('The shortcode of the project')
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option.setName('words')
                        .setDescription('The new total word count to set for the project (See: `/wrote` for incrementing)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('List your projects (Max of 25 will be displayed)')
                .addStringOption((option) => {
                    option.setName('genre')
                        .setDescription('List only projects matching this genre')
                        .setRequired(false);

                    for (const [key, obj] of Object.entries(Project.GENRES)) {
                        option.addChoices({
                            name: obj.name, value: key
                        });
                    }

                    return option;
                })
                .addStringOption((option) => {
                    option.setName('status')
                        .setDescription('List only projects matching this status')
                        .setRequired(false);

                    for (const [key, obj] of Object.entries(Project.STATUSES)) {
                        option.addChoices({
                            name: obj.name, value: key
                        });
                    }

                    return option;
                })
                .addBooleanOption((option) =>
                    option.setName('hidden')
                        .setDescription('Should the information be hidden and only viewable by you? (Default: no)')
                        .setRequired(false)
                )
        )
        .addSubcommandGroup((group_edit) => {
            group_edit
                .setName('edit')
                .setDescription('Edit a project\'s details')
                .addSubcommand((edit_shortcode) => {
                    edit_shortcode
                        .setName('shortcode')
                        .setDescription('Change the shortcode of a project')
                        .addStringOption((option) =>
                            option.setName('current_code')
                                .setDescription('The current shortcode of the project')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option.setName('new_code')
                                .setDescription('The new shortcode you want')
                                .setRequired(true)
                        );
                    return edit_shortcode;
                })
                .addSubcommand((edit_title) => {
                    edit_title
                        .setName('title')
                        .setDescription('Change the shortcode of a project')
                        .addStringOption((option) =>
                            option.setName('shortcode')
                                .setDescription('The shortcode of the project')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option.setName('title')
                                .setDescription('The new title you want')
                                .setRequired(true)
                        );
                    return edit_title;
                })
                .addSubcommand((edit_desc) => {
                    edit_desc
                        .setName('description')
                        .setDescription('Change the description of a project')
                        .addStringOption((option) =>
                            option.setName('shortcode')
                                .setDescription('The shortcode of the project')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option.setName('description')
                                .setDescription('The new description you want')
                                .setRequired(true)
                        );
                    return edit_desc;
                })
                .addSubcommand((edit_genre) => {
                    edit_genre
                        .setName('genre')
                        .setDescription('Change the genre of a project')
                        .addStringOption((option) =>
                            option.setName('shortcode')
                                .setDescription('The shortcode of the project')
                                .setRequired(true)
                        )
                        .addStringOption((option) => {
                            option.setName('genre')
                                .setDescription('The new genre you want')
                                .setRequired(true);

                            for (const [key, obj] of Object.entries(Project.GENRES)) {
                                option.addChoices({
                                    name: obj.name, value: key
                                });
                            }

                            return option;
                        });
                    return edit_genre;
                })
                .addSubcommand((edit_status) => {
                    edit_status
                        .setName('status')
                        .setDescription('Change the status of a project')
                        .addStringOption((option) =>
                            option.setName('shortcode')
                                .setDescription('The shortcode of the project')
                                .setRequired(true)
                        )
                        .addStringOption((option) => {
                            option.setName('status')
                                .setDescription('The new status you want')
                                .setRequired(true);

                            for (const [key, obj] of Object.entries(Project.STATUSES)) {
                                option.addChoices({
                                    name: obj.name, value: key
                                });
                            }

                            return option;
                        });
                    return edit_status;
                })
                .addSubcommand((edit_link) => {
                    edit_link
                        .setName('link')
                        .setDescription('Change the link of a project')
                        .addStringOption((option) =>
                            option.setName('shortcode')
                                .setDescription('The shortcode of the project')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option.setName('link')
                                .setDescription('The new link you want (must be a valid url)')
                                .setRequired(true)
                        );
                    return edit_link;
                })
                .addSubcommand((edit_image) => {
                    edit_image
                        .setName('image')
                        .setDescription('Change the image of a project')
                        .addStringOption((option) =>
                            option.setName('shortcode')
                                .setDescription('The shortcode of the project')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option.setName('image')
                                .setDescription('The new image you want (must be a url to an image)')
                                .setRequired(true)
                        );
                    return edit_image;
                })

            return group_edit;
        }),

    /**
     * Execute the project command
     * @param interaction
     * @param client
     * @param db
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        // Defer the reply, and make it ephemeral so only the user sees it.
        await interaction.deferReply({ ephemeral: true });

        const user = new User(interaction.user.id, db, interaction);
        const subCommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup();

        if (subCommand === 'create') {
            const code = interaction.options.getString('shortcode');
            const title = interaction.options.getString('title');
            return await Project.command_create(interaction, db, user, code, title);
        } else if (group === 'edit') {
            return await Project.command_edit(interaction, db, user, subCommand);
        } else if (subCommand === 'delete') {
            const code = interaction.options.getString('shortcode');
            return await Project.command_delete(interaction, db, user, code);
        } else if (subCommand === 'update') {
            const code = interaction.options.getString('shortcode');
            const words = interaction.options.getInteger('words');
            return await Project.command_update(interaction, db, user, code, words);
        } else if (subCommand === 'view') {
            const code = interaction.options.getString('shortcode');
            const is_public = !interaction.options.getBoolean('hidden');
            return await Project.command_view(interaction, db, user, code, is_public);
        } else if (subCommand === 'list') {
            const genre = interaction.options.getString('genre');
            const status = interaction.options.getString('status');
            const is_public = !interaction.options.getBoolean('hidden');
            return await Project.command_list(interaction, db, user, genre, status, is_public);
        }

    }

};