const { SlashCommandBuilder } = require('discord.js');
const User = require('../../classes/user');
const fs = require('fs');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('export')
        .setDescription('Export your user data for importing into other bots')
        ,

    /**
     * Execute the export command
     * @param interaction
     * @param client
     * @param db
     * @returns {Promise<void>}
     */
    async execute(interaction, client, db) {

        // Defer the reply.
        await interaction.deferReply({ ephemeral: true });

        const user = new User(interaction.user.id, db, interaction);

        let json = {
            "stats": [],
            "records": [],
            "projects": [],
            "xp": "",
            "goals": []
        };

        // User stats.
        let stats = await db.get_all('user_stats', {'user': user.id});
        if (stats) {
            for (let stat of stats) {
                json['stats'].push({
                    "name": stat.name,
                    "value": stat.value
                });
            }
        }

        let records = await db.get_all('user_records', {'user': user.id});
        if (records) {
            for (let record of records) {
                json['stats'].push({
                    "record": record.record,
                    "value": record.value
                });
            }
        }

        // User XP.
        json['xp'] = await user.getXP();

        // User projects.
        let projects = await db.get_all('projects', {'user': user.id});
        if (projects) {
            for (let project of projects) {
                json['projects'].push({
                    "name": project.name,
                    "shortname": project.shortname,
                    "words": project.words,
                    "completed": project.completed.toString(),
                    "status": project.status,
                    "genre": project.genre,
                    "description": project.description,
                    "link": project.link,
                    "image": project.image
                });
            }
        }

        // User goals.
        let goals = await db.get_all('user_goals', {'user': user.id});
        if (goals) {
            for (let goal of goals) {
                json['goals'].push({
                    "type": goal.type,
                    "goal": goal.goal,
                    "current": goal.current,
                    "completed": goal.completed.toString()
                });
            }
        }

        let content = JSON.stringify(json);
        fs.writeFile('src/logs/export-' + user.id + '.json', content, function(){

        });

        // Send the reply.
        await interaction.editReply({
            content: 'Export file should be attached to this message',
            files: ['src/logs/export-' + user.id + '.json'],
            ephemeral: true
        });

    }
};
