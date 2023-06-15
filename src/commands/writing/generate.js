const { SlashCommandBuilder } = require('discord.js');
const Generator = require('./../../classes/generator');
const User = require('../../classes/user');
const Helper = require('../../classes/helper');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Random generator for character names, place names, book titles, story ideas, etc...')
        .addStringOption((option) => {
            option.setName('type')
                .setDescription('What do you want to generate?')
                .setRequired(true);

            for (const [key, name] of Object.entries(Generator.TYPES)) {
                option.addChoices({
                    name: name, value: key
                });
            }

            return option;
        })
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('How many do you want to generate (Where applicable)?')
                .setRequired(false)
        ),

    /**
     * Execute the generate command
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
        const type = interaction.options.getString('type');
        const amount = interaction.options.getInteger('amount');

        // Face is done differently.
        if (type === 'face') {
            let url = Generator.URLS['face'] + '?t=' + Helper.getUnixTimestamp();
            return interaction.editReply(url);
        }

        const generator = new Generator(type);
        const results = generator.generate(amount);

        let join = '\n';

        // For prompts, we want an extra line between them.
        if (type === 'prompt') {
            join += '\n';
        }

        const names = results['names'].join(join);
        return await interaction.editReply(`${user.getMention()}, ${results['message']}${names}`);

    }

};