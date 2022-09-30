const fs = require('node:fs');
const path = require('node:path');
const Registrar = require('./classes/registrar');
require('dotenv').config();

const args = process.argv.slice(2);
const client = {};

client.commands = [];
client.command_path = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(client.command_path).filter(file => file.endsWith('.js'))) {
    const command = require(path.join(client.command_path, file));
    client.commands.push(command.data.toJSON());
}

const registrar = new Registrar(client.commands);

(async () => {
    try {

        console.log(`[${process.env.ENV}] Started refreshing ${client.commands.length} application (/) commands.`);

        // If we want to purge all commands from everywhere.
        // `npm run register -- purge`
        if (args[0] === 'purge') {
            registrar.unregisterGlobal();
            registrar.unregisterGuild();
        }

        // Production - Push all global commands.
        else if (process.env.ENV === 'prod') {
            registrar.registerGlobal();
        }

        // Development - Push all guild commands.
        else if (process.env.ENV === 'dev') {
            registrar.registerGuild();
        }

    } catch (error) {
        console.error(error);
    }
})();