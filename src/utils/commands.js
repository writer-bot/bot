const path = require("node:path");
const fs = require("node:fs");
const logger = require('./logger');

module.exports = async(client) => {

    const dir_path = path.join(__dirname, '../', 'commands');

    for (const dir of fs.readdirSync(dir_path, {withFileTypes: true}).filter(item => item.isDirectory()).map(item => item.name)) {

        const command_path = path.join(dir_path, dir);

        // Loop through command files inside the command type directory.
        for (const file of fs.readdirSync(command_path).filter(file => file.endsWith('.js'))) {
            logger.debug('Loading command: ' + dir + '/' + file);
            try {
                const command = require(path.join(command_path, file));
                await client.commands.set(command.data.name, command);
            } catch (err) {
                logger.error('Cannot load command: ' + err);
            }
        }

    }

};