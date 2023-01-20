const Helper = require('./helper');
const EmbeddedMessage = require('./embed');

class Project {

    static MAX_FIELDS = 25;

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

        // If we are marking the project as Published/Finished for the first time, set it to completed.
        if ((this.status === 'finished' || this.status === 'published') && !this.isComplete()) {
            this.completed = Helper.getUnixTimestamp();
        }

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
     * Check if the project has been completed.
     * @returns {boolean}
     */
    isComplete() {
        return (this.completed > 0);
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
        fields.push({ name: 'Status', value: status, inline: true });
        fields.push({ name: 'Genre', value: genre, inline: true });
        fields.push({ name: 'Word Count', value: this.words.toLocaleString(), inline: true });

        return new EmbeddedMessage(interaction.user)
            .build({
                title: this.name,
                url: url,
                description: (desc !== null) ? Helper.truncate(desc, 4000) : null,
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
     * View a list of projects, filtered by genre and status
     * @param interaction
     * @param db
     * @param user
     * @param genre
     * @param status
     * @returns {Promise<Message<BooleanCache<CacheType>>>}
     */
    static async command_list(interaction, db, user, genre, status, is_public) {

        // This filters array is just used for display at the end.
        const filters = [];

        if (genre !== null) {
            filters.push(genre);
        }

        if (status !== null) {
            filters.push(status);
        }

        const projects = await Project.all(db, user.id, genre, status);

        // If they have no projects, don't go any further.
        if (projects.length < 1) {
            return await interaction.editReply(`You do not have any projects.`);
        }

        // Build an embedded message for the response.
        let all_fields = [];
        let fields = [];

        for (let project of projects) {

            let title = `${project.name} [${project.shortname}]`;
            let description = '';

            if (project.genre !== null && Project.GENRES[project.genre] !== undefined) {
                description += Project.GENRES[project.genre].emote + ' ' + Project.GENRES[project.genre].name + ' ---- ';
            }

            if (project.status !== null && Project.STATUSES[project.status] !== undefined) {
                description += Project.STATUSES[project.status].emote + ' ' + Project.STATUSES[project.status].name + ' ---- ';
            }

            description += ':keyboard: ' + project.words.toLocaleString();

            if (project.description !== null) {
                description += '\n_' + Helper.truncate(project.description, 100) + '_\n';
            }

            if (project.link !== null) {
                description += project.link;
            }

            // No description or status/genre.
            if (description === '') {
                description = 'No description yet';
            }

            // If we've hit the field limit, send these fields to the array to send in the next embedded message.
            if (fields.length >= Project.MAX_FIELDS) {

                // Add current stack of fields into the all_fields array and then reset.
                all_fields.push(fields);
                fields = [];

            }

            // Append project to field array.
            fields.push({ name: title, value: description, inline: false });

        }

        // If we have any leftover fields in the fields array, move them to all_fields.
        if (fields.length > 0) {
            all_fields.push(fields);
        }

        // Can't delete the ephemeral reply, so just put some nonsense there.
        await interaction.editReply('Project list coming up... Here we go... Any moment now...');

        // Now go through the array of field arrays, splitting them into multiple messages if too many characters.
        for (const split_fields of all_fields) {

            const embed = new EmbeddedMessage(interaction.user)
                .build({
                    title: 'Your Projects',
                    description: 'Here are your ' + filters.join(', ') + ' projects...',
                    fields: split_fields,
                });

            await interaction.followUp({embeds: [embed], ephemeral: !is_public});

        }

        return;

    }

    /**
     * View a project by its shortcode
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
            return await interaction.followUp({embeds: [embed], ephemeral: false});
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
            let message = `Project (**${code}**) ${subCommand} updated.`;

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

            // If we are changing the status to Published or Finished for the first time, apply XP.
            if (subCommand === 'status' && (field === 'finished' || field === 'published') && !project.isComplete()) {
                const xp = Math.max(10, Math.min(Math.ceil(project.words / 100), 5000) );
                await user.addXP(xp);
                message += `    +${xp} xp!`;
            }

            // Change the project field.
            project[subCommand] = field;
            await project.save();

            return await interaction.editReply(message);

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
     * Get a project record based on ID
     * @param db
     * @param id
     * @returns {Promise<*|boolean>}
     */
    static async get_by_id(db, id) {

        const record = await db.get('projects', {
            'id': id,
        });

        return new Project(db, record);

    }

    /**
     * Get all of a user's projects, filtered by status and genre
     * @param db
     * @param user_id
     * @param genre
     * @param status
     * @returns {Promise<[]>}
     */
    static async all(db, user_id, genre = null, status = null) {

        const results = [];

        const where = {
            'user': user_id
        };

        if (genre !== null) {
            where['genre'] = genre;
        }

        if (status !== null) {
            where['status'] = status;
        }

        const records = await db.get_all('projects', where, ['*'], ['name']);
        if (records) {
            for (const record of records) {
                results.push(new Project(db, record));
            }
        }

        return results;

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