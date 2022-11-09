const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const User = require('./../../classes/user');
const Guild = require('./../../classes/guild');
const Setting = require('../../classes/setting');
const Helper = require('../../classes/helper');
const moment = require("moment/moment");

module.exports = {

    data: new SlashCommandBuilder()
        .setName('setting')
        .setDescription('Update or view bot settings')
        .addSubcommandGroup((group_my) => {
            group_my
                .setName('my')
                .setDescription('Update or view your personal settings for the bot')
                .addSubcommand((my_list) => {
                    my_list
                        .setName('list')
                        .setDescription('View a list of all your personal settings for the bot');
                    return my_list;
                })
                .addSubcommand((my_update) => {
                    my_update
                        .setName('update')
                        .setDescription('Update one of your personal settings for the bot')
                        .addStringOption((option) => {
                            option
                                .setName('setting')
                                .setDescription('Which setting do you want to update?')
                                .setRequired(true);

                            for (const [key, name] of Object.entries(Setting.MY_SETTINGS)) {
                                option.addChoices({
                                    name: name, value: key
                                });
                            }

                            return option;

                        })
                        .addStringOption((option) => {
                            option
                                .setName('value')
                                .setDescription('The value to set')
                                .setRequired(true);
                            return option;
                        });
                    return my_update;
                });
            return group_my;
        })
        .addSubcommandGroup((group_server) => {
            group_server
                .setName('server')
                .setDescription('Update or view the server settings for the bot')
                .addSubcommand((server_list) => {
                    server_list
                        .setName('list')
                        .setDescription('View a list of all the server settings for the bot');
                    return server_list;
                })
                .addSubcommand((server_update) => {
                    server_update
                        .setName('update')
                        .setDescription('Update one of the server settings for the bot')
                        .addStringOption((option) => {
                            option
                                .setName('setting')
                                .setDescription('Which setting do you want to update?')
                                .setRequired(true);

                            for (const [key, name] of Object.entries(Setting.GUILD_SETTINGS)) {
                                option.addChoices({
                                    name: name, value: key
                                });
                            }

                            return option;

                        })
                        .addStringOption((option) => {
                            option
                                .setName('value')
                                .setDescription('The value to set')
                                .setRequired(true);
                            return option;
                        });
                    return server_update;
                });
            return group_server;
        })
    ,
    /**
     * Execute the challenge command
     * @param interaction
     * @param client
     * @param db
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        const user = new User(interaction.user.id, db, interaction);

        // Defer the reply.
        await interaction.deferReply({ ephemeral: true });

        // My settings group.
        if (group === 'my') {

            // List my settings.
            if (subcommand === 'list') {

                let settings = await user.getSettings();
                let output = '';

                if (Object.entries(settings).length > 0) {

                    output = '```ini\n';
                    for (const [key, val] of Object.entries(settings)) {
                        output += key + ' = ' + val + '\n';
                    }
                    output += '```';

                } else {
                    output += 'No settings found';
                }

                return await interaction.editReply(`${output}`);

            }

            // Update settings.
            else if (subcommand === 'update') {

                const setting = interaction.options.getString('setting');
                const value = interaction.options.getString('value');

                // Max Words per minute.
                if (setting === 'maxwpm') {

                    // Make sure the value is a number.
                    if (!Helper.isNumber(value) || value <= 0) {
                        return await interaction.editReply('Max WPM setting must be a number greater than 0');
                    }

                    await user.updateSetting(setting, value);

                }

                // Time offset.
                else if (setting === 'datetime') {

                    // Datetime must have date and time in correct format to validate.
                    if(!moment(value, 'YYYY/MM/DD HH:mm', true).isValid()) {
                        return await interaction.editReply('Datetime must be in the format YYYY/MM/DD hh:mm E.g. `2022/11/29 09:45`');
                    }

                    // Work out the offset, which is what we will actually set.
                    const server_time = moment();
                    const user_time = moment(value, 'YYYY/MM/DD HH:mm');

                    // Get the offset between server time and user time.
                    const offset = user_time.diff(server_time, 'minutes');

                    // Set the value to be saved to be the offset.
                    await user.updateSetting(setting, offset);

                    // Update all the user's goals based on the new datetime.
                    await user.updateAllGoalResetTimes();

                }

                return await interaction.editReply(`Updated your setting \`${setting}\` to \`${value}\``);

            }

        } else if (group === 'server') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return await interaction.editReply('You do not have permission to run server setting commands in this server');
            }

            const guild = new Guild(interaction.guildId, db);

            // List my settings.
            if (subcommand === 'list') {

                let settings = await guild.getSettings();
                let output = '';

                if (Object.entries(settings).length > 0) {

                    output = '```ini\n';
                    for (const [key, val] of Object.entries(settings)) {
                        output += key + ' = ' + val + '\n';
                    }
                    output += '```';

                } else {
                    output += 'No settings found';
                }

                return await interaction.editReply(`${output}`);

            }

            // Update settings.
            else if (subcommand === 'update') {

                const setting = interaction.options.getString('setting');
                const value = interaction.options.getString('value');

                // Sprint delay must be a number.
                if (setting === 'sprint_delay_end' && !Helper.isNumber(value)) {
                    return await interaction.editReply('Value must be a number, greater than 0');
                }

                await guild.updateSetting(setting, value);
                return await interaction.editReply(`Updated server setting \`${setting}\` to \`${value}\``);

            }

        }

    }

};