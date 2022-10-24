require('dotenv').config();

const client = require('./utils/client')
const { Collection } = require('discord.js')
const DB = require('./classes/database');
const cron = require('./tasks/main')
const logger = require('./utils/logger');
const uuid = require('uuid');
const Task = require('./classes/task');

// Load globals.
require('./utils/globals');

// Load all the commands onto the client object.
client.commands = new Collection();
require('./utils/commands')(client);

client.on('ready', () => {
    logger.info(`[CLUSTER ${client.cluster.id}] [LOGIN] ${client.user.tag} has logged in`);
});

client.on('interactionCreate', async interaction => {

    // If it's not a slash command, stop.
    if (!interaction.isChatInputCommand()) {
        return;
    }

    // Get the command based on its name.
    const command = client.commands.get(interaction.commandName);
    if (!command) {
        return;
    }

    let uid = uuid.v4();

    // Log command usage.
    logger.info(`user ${interaction.user.id} called ${interaction.commandName} in server ${interaction.guildId}`, {
        options: interaction.options.data,
        uuid: uid
    });

    // Try and execute the command.
    try {

        // Create database connection to use in command.
        const db = new DB();
        await db.connect();

        // Execute the command.
        await command.execute(interaction, client, db);

        // Close database connection and free up pool slot.
        await db.end();

    } catch (err) {

        logger.error(`Error running command ${interaction.commandName}`, {
            uuid: uid,
            stack: err.stack
        })

        await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true
        });

    }

})

// Login to the API.
client.login(process.env.TOKEN).then(() => {

    // If we are on the first cluster, set up the scheduled tasks to run.
    if (client.cluster.id === 0) {

        logger.info(`[CLUSTER ${client.cluster.id}] Starting scheduled tasks`);

        (async () => {
            await Task.setup();
        })();

        // Start the main task.
        client.task = {
            last: 0,
            interval: setInterval(() => cron(client), 5000),
        };

    }

});
