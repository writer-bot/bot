require('dotenv').config();
const { ClusterManager } = require('discord-hybrid-sharding');
const path = require("node:path");
const logger = require('./utils/logger');

const manager = new ClusterManager(
    path.join(__dirname, 'bot.js'),
    {
        totalShards: (process.env.SHARDS === 'auto') ? 'auto' : parseInt(process.env.SHARDS),
        shardsPerClusters: 5,
        mode: 'process',
        token: process.env.TOKEN
    }
);

manager.on('clusterCreate', cluster => logger.debug(`Launched Cluster ${cluster.id}`));
manager.spawn({ timeout: -1 });