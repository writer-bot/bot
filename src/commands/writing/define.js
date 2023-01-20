const { SlashCommandBuilder } = require('discord.js');
const User = require("../../classes/user");
const fetch = require('node-fetch');
const EmbeddedMessage = require("../../classes/embed");
const Helper = require("../../classes/helper");

module.exports = {

    data: new SlashCommandBuilder()
        .setName('define')
        .setDescription('Get dictionary definition(s) for a word')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('Which word do you want to define?')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('thesaurus')
                .setDescription('Do you want to look it up in a thesaurus instead of dictionary?')
                .setRequired(false)
        ),

    /**
     * Execute the define command
     * @param interaction
     * @param client
     * @param db
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        const MAX_DEFINITIONS = 5;

        // Get the user object.
        const user = new User(interaction.user.id, db, interaction);

        // Defer the reply.
        await interaction.deferReply();

        // Get the arguments.
        const word = interaction.options.getString('word');
        const thesaurus = interaction.options.getBoolean('thesaurus');

        try {

            const url = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + word;
            const response = await fetch(url);
            const data = await response.json();
            const fields = [];
            let synonyms = [];
            let antonyms = [];

            for (const meaning of data[0].meanings) {

                // Thesaurus - Get all the synonyms and antonyms and put into an array.
                if (thesaurus) {

                    for (const syn of meaning.synonyms) {
                        synonyms.push(syn);
                    }

                    for (const ant of meaning.antonyms) {
                        antonyms.push(ant);
                    }

                } else {

                    // Max of 5 different meanings (noun/verb/etc...).
                    if (fields.length < MAX_DEFINITIONS) {

                        const definitions = [];

                        for (const def of meaning.definitions) {

                            // Max of 5 different definitions per meaning as well.
                            if (definitions.length < MAX_DEFINITIONS) {
                                definitions.push((definitions.length + 1) + '. ' + def.definition);
                            }

                        }

                        fields.push({name: meaning.partOfSpeech, value: definitions.join('\n')});

                    }

                }

            }

            // If thesaurus, strip duplicates and sort arrays and then send to embed fields.
            if (thesaurus) {

                // Remove duplicates.
                synonyms = [...new Set(synonyms)];
                antonyms = [...new Set(antonyms)];

                // Sort.
                synonyms.sort();
                antonyms.sort();

                // Add to embed.
                fields.push({name: 'Synonyms', value: (synonyms.length) ? synonyms.join('\n') : 'None found'});
                fields.push({name: 'Antonyms', value: (antonyms.length) ? antonyms.join('\n') : 'None found'});
            }

            const embed = new EmbeddedMessage(interaction.user)
                .build({
                    title: data[0].word,
                    fields: fields,
                });

            return await interaction.editReply({embeds: [embed]});

        } catch (err) {
            return await interaction.editReply(`${user.getMention()}, unable to find definition for that word. (If the word is valid, might be an issue with the API or a bug. Try again and report the issue if it persists)`);
        }

    }

};