const chalk = require('chalk');

class ConsoleWriter {

    yellow(text) {
        console.log(chalk.yellow(text));
    }

    blue(text) {
        console.log(chalk.blue(text));
    }

    red(text) {
        console.log(chalk.red(text));
    }

    write(text) {
        console.log(text);
    }

    green(text) {
        console.log(chalk.green(text));
    }

}

module.exports = ConsoleWriter;