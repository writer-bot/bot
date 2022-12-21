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

        return new EmbedBuilder()
            .setColor(colour)
            .setTitle(title)
            .setDescription(description)
            .setURL(url)
            .addFields(fields)
            .setThumbnail(image)
            .setFooter({
                text: `Requested by ${this.user.username}#${this.user.discriminator}`,
                iconURL: this.user.avatarURL()
            });

    };

}

module.exports = EmbeddedMessage;