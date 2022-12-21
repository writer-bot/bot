const Helper = require('./helper');
const EmbeddedMessage = require('./embed');

class Project {

    static GENRES = {
        'academic': {'name': 'Academic', 'emote': ':books:'},
        'action': {'name': 'Action', 'emote': ':gun:'},
        'adventure': {'name': 'Adventure', 'emote': ':mountain_snow:'},
        'challenge': {'name': 'Challenge', 'emote': ':mountain:'},
        'comic': {'name': 'Comic', 'emote': ':art:'},
        'crime': {'name': 'Crime', 'emote': ':oncoming_police_car:'},
        'drama': {'name': 'Drama', 'emote': ':performing_arts:'},
        'erotic': {'name': 'Erotic', 'emote': ':hot_pepper:'},
        'fanfic': {'name': 'Fan Fiction', 'emote': ':art:'},
        'fantasy': {'name': 'Fantasy', 'emote': ':man_mage:'},
        'fiction': {'name': 'Fiction', 'emote': ':blue_book:'},
        'horror': {'name': 'Horror', 'emote': ':skull:'},
        'kids': {'name': 'Kids', 'emote': ':children_crossing:'},
        'literary': {'name': 'Literary Fiction', 'emote': ':notebook_with_decorative_cover:'},
        'mystery': {'name': 'Mystery', 'emote': ':detective:'},
        'nonfiction': {'name': 'Non-Fiction', 'emote': ':bookmark:'},
        'romance': {'name': 'Romance', 'emote': ':heart:'},
        'scifi': {'name': 'Sci-Fi', 'emote': ':ringed_planet:'},
        'short': {'name': 'Short Fiction', 'emote': ':shorts:'},
        'suspense': {'name': 'Suspense', 'emote': ':worried:'},
        'thriller': {'name': 'Thriller', 'emote': ':scream:'},
        'ya': {'name': 'Young Adult', 'emote': ':adult:'},
    };

    static STATUSES = {
        'abandoned': {'name': 'Abandoned', 'emote': ':wastebasket:'},
        'accepted': {'name': 'Accepted', 'emote': ':ballot_box_with_check:'},
        'editing': {'name': 'Editing', 'emote': ':pencil:'},
        'finished': {'name': 'Finished', 'emote': ':white_check_mark:'},
        'hiatus': {'name': 'On Hiatus', 'emote': ':clock4:'},
        'planning': {'name': 'Planning', 'emote': ':thinking:'},
        'progress': {'name': 'In Progress', 'emote': ':writing_hand:'},
        'published': {'name': 'Published', 'emote': ':notebook_with_decorative_cover:'},
        'rejected': {'name': 'Rejected', 'emote': ':x:'},
        'rewriting': {'name': 'Re-writing', 'emote': ':repeat:'},
        'submitted': {'name': 'Submitted', 'emote': ':postbox:'},
    };

    /**
     * Construct the project object from a database record
     * @param db
     * @param record
     * @returns {Promise<void>}
     */
    constructor(db, record) {

        this._db = db;
        this.id = false;

        if (record) {
            this.id = record.id;
            this.user = record.user;
            this.name = record.name;
            this.shortname = record.shortname;
            this.words = record.words;
            this.completed = record.completed;
            this.status = record.status;
            this.genre = record.genre;
            this.description = record.description;
            this.link = record.link;
            this.image = record.image;
        }

    }

    /**
     * Save updates to the project
     * @returns {Promise<void>}
     */
    async save() {

        return await this._db.update('projects', {
            'id': this.id,
            'user': this.user,
            'name': this.name,
            'shortname': this.shortname,
            'words': this.words,
            'completed': this.completed,
            'status': this.status,
            'genre': this.genre,
            'description': this.description,
            'link': this.link,
            'image': this.image,
        });

    }

    /**
     * Check if the object is valid
     * @returns {boolean}
     */
    is_valid() {
        return (this.id !== false);
    }

    /**
     * Delete the project
     * @returns {Promise<*>}
     */
    async delete() {
        return this._db.delete('projects', {
            'id': this.id
        });
    }

    /**
     * Generate the embed response for viewing the project
     * @param interaction
     * @returns {Promise<EmbedBuilder>}
     */
    embed(interaction) {

        let url = (this.link) ?? null;
        let desc = (this.description) ?? null;
        let image = (this.image) ?? null;
        let genre = (this.genre) ?
            Project.GENRES[this.genre].emote + ' ' + Project.GENRES[this.genre].name
            : '-';
        let status = (this.status) ?
            Project.STATUSES[this.status].emote + ' ' + Project.STATUSES[this.status].name
            : '-';

        let fields = [];
        fields.push({ name: 'Status', value: genre, inline: true });
        fields.push({ name: 'Genre', value: status, inline: true });
        fields.push({ name: 'Word Count', value: this.words.toLocaleString(), inline: true });

        return new EmbeddedMessage(interaction.user)
            .build({
                title: this.name,
                url: url,
                description: desc,
                fields: fields,
                image: image,
            });

    }

    /**
     * Run the project create command.
     * @param interaction
     * @param db
     * @param user
     * @param shortcode
     * @param title
     * @returns {Promise<*>}
     */
    static async command_create(interaction, db, user, shortcode, title) {

        const validation = await Project.validate(db, user, shortcode, title);
        if (validation !== true) {
            return await interaction.editReply(validation);
        }

        await Project.create(db, user.id, shortcode, title);
        return await interaction.editReply(`New project created: **${title}** (**${shortcode}**).`);

    }

    /**
     * Delete a project by its shortcode
     * @param interaction
     * @param db
     * @param user
     * @param shortcode
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_delete(interaction, db, user, shortcode) {

        // Do they have a project with that code?
        const project = await Project.get(db, user.id, shortcode);
        if (!project.is_valid()) {
            return await interaction.editReply(`You do not have a project with that code (**${shortcode}**).`);
        }

        await project.delete();
        return await interaction.editReply(`Project deleted: **${project.name}** (**${project.shortname}**).`);

    }

    /**
     * Delete a project by its shortcode
     * @param interaction
     * @param db
     * @param user
     * @param shortcode
     * @param words
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_update(interaction, db, user, shortcode, words) {

        // Do they have a project with that code?
        const project = await Project.get(db, user.id, shortcode);
        if (!project.is_valid()) {
            return await interaction.editReply(`You do not have a project with that code (**${shortcode}**).`);
        }

        // Update the word count.
        project.words = words;
        await project.save();

        return await interaction.editReply(`Project word count updated: **${project.name}** (**${project.shortname}**) - **${words}** words.`);

    }

    /**
     * Delete a project by its shortcode
     * @param interaction
     * @param db
     * @param user
     * @param shortcode
     * @param is_public
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_view(interaction, db, user, shortcode, is_public) {

        // Do they have a project with that code?
        const project = await Project.get(db, user.id, shortcode);
        if (!project.is_valid()) {
            return await interaction.editReply(`You do not have a project with that code (**${shortcode}**).`);
        }

        const embed = project.embed(interaction);

        // If it's public, we can't edit reply, we have to send a new message. (Follow up also doesn't work as keeps initial ephemeral state).
        if (is_public) {
            await interaction.editReply('Posting as public message...One moment...');
            return await interaction.channel.send({embeds: [embed], ephemeral: false});
        } else {
            return await interaction.editReply({embeds: [embed]});
        }

    }

    /**
     * Run a command from the project edit command group
     * @param interaction
     * @param db
     * @param user
     * @param subCommand
     * @returns {Promise<void>}
     */
    static async command_edit(interaction, db, user, subCommand) {

        if (subCommand === 'shortcode') {

            const current_code = interaction.options.getString('current_code');
            const new_code = interaction.options.getString('new_code');

            // Do they have a project with that code?
            const project = await Project.get(db, user.id, current_code);
            if (!project.is_valid()) {
                return await interaction.editReply(`You do not have a project with that code (**${current_code}**).`);
            }

            // Is the new code a valid one?
            const validation = await Project.validate(db, user, new_code);
            if (validation !== true) {
                return await interaction.editReply(validation);
            }

            // Change the code.
            project.shortname = new_code;
            await project.save();

            return await interaction.editReply(`Project shortcode updated from **${current_code}** to **${new_code}**.`);

        } else if (subCommand === 'title') {

            const code = interaction.options.getString('shortcode');
            const title = interaction.options.getString('title');

            // Do they have a project with that code?
            const project = await Project.get(db, user.id, code);
            if (!project.is_valid()) {
                return await interaction.editReply(`You do not have a project with that code (**${code}**).`);
            }

            // Is the new title a valid one?
            const validation = await Project.validate(db, user, null, title);
            if (validation !== true) {
                return await interaction.editReply(validation);
            }

            // Change the title.
            project.name = title;
            await project.save();

            return await interaction.editReply(`Project (**${code}**) title updated to **${title}**.`);

        } else if (subCommand === 'description' || subCommand === 'genre' || subCommand === 'status' || subCommand === 'link' || subCommand === 'image') {

            const code = interaction.options.getString('shortcode');
            const field = interaction.options.getString(subCommand);

            // Do they have a project with that code?
            const project = await Project.get(db, user.id, code);
            if (!project.is_valid()) {
                return await interaction.editReply(`You do not have a project with that code (**${code}**).`);
            }

            // If it's the link or the image, make sure it's a valid URL.
            if ( (subCommand === 'link' || subCommand === 'image')) {
                if (!Helper.isUrl(field)) {
                    return await interaction.editReply(`Value supplied must be a valid URL.`);
                } else if (field.length >= 255) {
                    return await interaction.editReply(`URL is too long. Please shorten it to less than 255 characters.`);
                }
            }

            // Description max is 4096 characters.
            else if (subCommand === 'description' && field.length > 4096) {
                return await interaction.editReply(`Description is too long. Please shorten it to less than 4096 characters.`);
            }

            // Change the project field.
            project[subCommand] = field;
            await project.save();

            return await interaction.editReply(`Project (**${code}**) ${subCommand} updated.`);

        }

    }


    /**
     * Create a project record
     * @param db
     * @param user_id
     * @param shortcode
     * @param title
     * @returns {Promise<number>}
     */
    static async create(db, user_id, shortcode, title) {

        return await db.insert('projects', {
            'user': user_id,
            'shortname': shortcode,
            'name': title,
        });

    }

    /**
     * Get a project record based on user and shortcode
     * @param db
     * @param user_id
     * @param shortcode
     * @returns {Promise<*|boolean>}
     */
    static async get(db, user_id, shortcode) {

        const record = await db.get('projects', {
            'user': user_id,
            'shortname': shortcode
        });

        return new Project(db, record);

    }

    /**
     * Check if the code and title validate for the user
     * @param db
     * @param user
     * @param shortcode
     * @param title
     * @returns {Promise<string|boolean>}
     */
    static async validate(db, user, shortcode = null, title = null) {

        // Run common validation checks on a code and title for a project.
        if (title !== null && title.length > 100) {
            return 'Title cannot be more than 100 characters long';
        } else if (shortcode !== null && (shortcode.length > 10 || shortcode.indexOf(' ') !== -1)) {
            return 'Shortcode cannot be more than 10 characters long and must not have any spaces';
        }

        // Check they don't have one with this name already.
        if (shortcode !== null) {
            const project = await Project.get(db, user.id, shortcode);
            if (project.is_valid()) {
                return `You already have a project with that shortcode (**${shortcode}**)`;
            }
        }

        return true;

    }

}

module.exports = Project;