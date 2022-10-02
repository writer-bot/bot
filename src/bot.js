const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

const dirpath = path.join(__dirname, 'commands');

for (const dir of fs.readdirSync(dirpath, {withFileTypes: true}).filter(item => item.isDirectory()).map(item => item.name)) {

    const commandpath = path.join(dirpath, dir);

    // Loop through command files inside the command type directory.
    for (const file of fs.readdirSync(commandpath).filter(file => file.endsWith('.js'))) {
        const command = require(path.join(commandpath, file));
        client.commands.set(command.data.name, command);
    }

}

client.on('ready', () => console.log(`${client.user.tag} has logged in`));

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {

        // Execute the command.
        await command.execute(interaction, client);

    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }

})

client.login(process.env.TOKEN);