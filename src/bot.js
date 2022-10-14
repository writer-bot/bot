require('dotenv').config();

const client = require('./utils/client')
const { Collection } = require('discord.js')
const { DB } = require('./classes/database');
const ConsoleWriter = require('./classes/console')
const testTask = require('./tasks/test')
const Console = new ConsoleWriter();

// Load globals.
require('./utils/globals');

// Load all the commands onto the client object.
client.commands = new Collection();
require('./utils/commands')(client);

client.on('ready', () => {
    Console.green(`[LOGIN] ${client.user.tag} has logged in`);
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

    // TODO: Logging.

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

        Console.red('[ERROR] Error running command ('+interaction.commandName+'): ' + err);

        await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true
        });

    }

})

// Set interval for scheduled tasks.
Console.yellow('Creating scheduled task interval');
client.tasks = {
    'last': 0,
    'interval': setInterval(testTask, 5000),
};

// Login to the API.
client.login(process.env.TOKEN);
