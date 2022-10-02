const fs = require('node:fs');
const path = require('node:path');
const Registrar = require('./classes/registrar');
require('dotenv').config();

const args = process.argv.slice(2);
const client = {};
client.commands = [];

const dirpath = path.join(__dirname, 'commands');

// Loop through command type directories inside `commands` directory.
for (const dir of fs.readdirSync(dirpath, {withFileTypes: true}).filter(item => item.isDirectory()).map(item => item.name)) {

    const commandpath = path.join(dirpath, dir);

    // Loop through command files inside the command type directory.
    for (const file of fs.readdirSync(commandpath).filter(file => file.endsWith('.js'))) {
        const command = require(path.join(commandpath, file));
        client.commands.push({
            type: dir,
            data: command.data.toJSON(),
        });
    }

}

const registrar = new Registrar(client.commands);

(async () => {
    try {

        console.log(`[${process.env.ENV}] Started refreshing ${client.commands.length} application (/) commands.`);

        // If we want to purge all commands from everywhere.
        // `npm run register -- purge`
        if (args[0] === 'purge') {
            await registrar.unregisterGlobal();
            await registrar.unregisterGuild();
        }

        // Production - Push all global commands.
        else if (process.env.ENV === 'prod') {
            await registrar.registerGlobal();
        }

        // Development - Push all guild commands.
        else if (process.env.ENV === 'dev') {
            await registrar.registerGuild();
        }

    } catch (error) {
        console.error(error);
    }
})();