require('dotenv').config();
const Cluster = require('discord-hybrid-sharding');
const path = require("node:path");
const ConsoleWriter = require('./classes/console')

const Console = new ConsoleWriter();
const manager = new Cluster.Manager(
    path.join(__dirname, 'bot.js'),
    {
        totalShards: 'auto',
        shardsPerClusters: 2,
        mode: 'process',
        token: process.env.TOKEN
    }
);

manager.on('clusterCreate', cluster => Console.blue(`Launched Cluster ${cluster.id}`));
manager.spawn({ timeout: -1 });