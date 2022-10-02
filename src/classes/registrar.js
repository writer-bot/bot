const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
require('dotenv').config();

class Registrar {

    /**
     * Construct the registrar object
     * @param commands Array of commands from register.js
     */
    constructor(commands) {
        this.commands = commands.map(a => a.data);
        this.clientID = process.env.CLIENT_ID;
        this.guildID = process.env.GUILD_ID;
        this.rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    }

    /**
     * Register all commands in the development server
     * @returns {Promise<void>}
     */
    async registerGuild() {

        await this.rest.put(
            Routes.applicationGuildCommands(this.clientID, this.guildID),
            { body: this.commands }
        ).then(() => console.log(`[GUILD] Successfully registered ${this.commands.length} guild commands`));

    };

    /**
     * Unregister all commands from the development server
     * @returns {Promise<void>}
     */
    async unregisterGuild() {

        await this.rest.put(Routes.applicationGuildCommands(this.clientID, this.guildID), { body: [] })
            .then(() => console.log(`[GUILD] Successfully deleted all guild commands from development server`))
            .catch(console.error);

    };

    /**
     * Register all the commands globally
     * @returns {Promise<void>}
     */
    async registerGlobal() {

        await this.rest.put(
            Routes.applicationCommands(this.clientID),
            { body: this.commands },
        ).then(() => console.log(`[GLOBAL] Successfully registered ${this.commands.length} guild commands`));

    };

    /**
     * Unregister all the commands from all servers globally
     * @returns {Promise<void>}
     */
    async unregisterGlobal() {

        await this.rest.put(Routes.applicationCommands(this.clientID), { body: [] })
            .then(() => console.log('[GLOBAL] Successfully deleted all application commands.'))
            .catch(console.error);

    };

}

module.exports = Registrar;