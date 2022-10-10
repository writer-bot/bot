// const client = new Client({
//     intents: [GatewayIntentBits.Guilds]
// });

const Cluster = require('discord-hybrid-sharding');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    shards: Cluster.data.SHARD_LIST,
    shardCount: Cluster.data.TOTAL_SHARDS
});

client.cluster = new Cluster.Client(client);

module.exports = client;