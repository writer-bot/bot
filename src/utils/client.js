const { ClusterClient, getInfo } = require('discord-hybrid-sharding');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    shards: getInfo().SHARD_LIST,
    shardCount: getInfo().TOTAL_SHARDS
});

client.cluster = new ClusterClient(client);

module.exports = client;