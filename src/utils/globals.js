const path = require('node:path');

// Define global variables.
global.APP_DIR = path.join(__dirname, '../');
global.LOG_DIR = path.join(APP_DIR, 'logs');

