require('dotenv').config();
const path = require('node:path');
const { ShardingManager } = require('discord.js');
const ConsoleWriter = require('./classes/console')

const Console = new ConsoleWriter();

const manager = new ShardingManager(path.join(__dirname, 'bot.js'), { token: process.env.TOKEN });
manager.on('shardCreate', shard => Console.blue(`[SHARD] ${shard.id} launched`));
manager.spawn();