require('dotenv').config();
const Cluster = require('discord-hybrid-sharding');
const path = require("node:path");
const logger = require('./utils/logger');

const manager = new Cluster.Manager(
    path.join(__dirname, 'bot.js'),
    {
        totalShards: 'auto',
        shardsPerClusters: 2,
        mode: 'process',
        token: process.env.TOKEN
    }
);

manager.on('clusterCreate', cluster => logger.debug(`Launched Cluster ${cluster.id}`));
manager.spawn({ timeout: -1 });