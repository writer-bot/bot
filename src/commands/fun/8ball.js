const { SlashCommandBuilder } = require('discord.js');

const EIGHT_BALL_ANSWERS = [
    ":blue_circle: It is certain",
    ":blue_circle: It is decidedly so",
    ":blue_circle: Without a doubt",
    ":blue_circle: Yes - definitely",
    ":blue_circle: You may rely on it",
    ":blue_circle: Of course",
    ":blue_circle: Most likely",
    ":blue_circle: Outlook good",
    ":blue_circle: Yes",
    ":blue_circle: Signs point to yes",
    ":white_circle: Reply hazy, try again",
    ":white_circle: Ask again later",
    ":white_circle: Better not tell you now",
    ":white_circle: Cannot predict now",
    ":white_circle: Concentrate and ask again",
    ":red_circle: Don't count on it",
    ":red_circle: My reply is no",
    ":red_circle: My sources say no",
    ":red_circle: Outlook not so good",
    ":red_circle: Very doubtful",
    ":red_circle: Absolutely not"
]

module.exports = {

    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball a question')
        .addStringOption((option) =>

            option.setName('question')
                .setDescription('What is your question for the magic 8-ball?')
                .setRequired(true)
        ),

    /**
     * Execute the 8ball command
     * @param interaction
     * @param client
     * @returns {Promise<void>}
    */

    async execute(interaction, client){

        //Defer the reply
        await interaction.deferReply();

        const question = interaction.options.getString('question');

        //choose an answer randomly
        const max = EIGHT_BALL_ANSWERS.length;
        const answer = EIGHT_BALL_ANSWERS[Math.floor(Math.random() * max)];

        //send the reply
        await interaction.editReply({ content:  `<@${interaction.user.id}>, You asked the magic 8-ball: **${question}**\n\n*${answer}*`});     
    }
}