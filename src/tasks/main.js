const logger = require('./../utils/logger');

const cron = async function(client){

    logger.info(`[CLUSTER ${client.cluster.id} Running scheduled task: main`);

    // console.log(client.task);

    // let channelID = '727465366162374737';
    //
    // await client.cluster.broadcastEval(async (client, {chID}) => {
    //     let channel = await client.channels.cache.get(chID);
    //     if (channel) {
    //         return channel.send('testing!');
    //     }
    // }, {context: {chID: channelID}});

};

module.exports = cron;