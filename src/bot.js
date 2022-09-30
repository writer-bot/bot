const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
client.command_path = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(client.command_path).filter(file => file.endsWith('.js'))) {
    const command = require(path.join(client.command_path, file));
    client.commands.set(command.data.name, command);
}

client.on('ready', () => console.log(`${client.user.tag} has logged in`));

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }

})

client.login(process.env.TOKEN);