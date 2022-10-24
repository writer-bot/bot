require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const DB = require("./classes/database");
const { readFile } = require('fs/promises');
const ConsoleWriter = require('./classes/console')
const db = new DB();
const Console = new ConsoleWriter();

(async() => {

    try {

        // Connect to database.
        await db.connect();

        Console.yellow('[DB] Installing database tables');

        try {

            const install_path = path.join(__dirname, 'data', 'install');
            for (const file of fs.readdirSync(install_path).filter(file => file.endsWith('.sql'))) {
                const file_path = path.join(install_path, file);
                const query = await readFile(file_path, 'utf-8');
                await db.execute(query);
                Console.write('[DB] Installed  ' + file);
            }

            Console.green('[DB] Finished installing database tables');

        } catch (err) {
            Console.red('[DB] Cannot install database table: ' + err);
        }

        await db.end();
        process.exit();

    } catch (err) {
        Console.red('[ERROR] Cannot cannot to database: ' + err);
        process.exit();
    }

})();
