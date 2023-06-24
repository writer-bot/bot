const { EmbedBuilder, Colors } = require('discord.js');

class EmbeddedMessage {

    /**
     * Construct the embedded message
     * @param user
     */
    constructor(user) {
        this.user = user;
    }

    build({title, description = null, colour = Colors.Blue, url = null, fields = [], image = null}) {
        let author = `${this.user.username}#${this.user.discriminator}`;
        if (this.user.discriminator == '0') {
            author = `${this.user.username}`;
        }

        return new EmbedBuilder()
            .setColor(colour)
            .setTitle(title)
            .setDescription(description)
            .setURL(url)
            .addFields(fields)
            .setThumbnail(image)
            .setFooter({
                text: `Requested by ${author}`,
                iconURL: this.user.avatarURL()
            });

    };

}

module.exports = EmbeddedMessage;