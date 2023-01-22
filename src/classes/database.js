class DB {

    /**
     * Construct the database object
     * @param connection
     */
    constructor() {
        const { connection } = require("./../utils/database");
        this.connection = connection;
    }

    /**
     * Get the connection to the database and return to the connection pointer.
     * @returns {Promise<void>}
     */
    async connect() {
        this.connection = await this.connection.getConnection();
    }

    /**
     * End the connection and release to pool.
     * @returns {Promise<void>}
     */
    async end() {
        await this.connection.end();
    }

    /**
     * Build the select query
     * @param table
     * @param where
     * @param fields
     * @param sort
     * @param limit
     * @returns {Promise<any>}
     * @private
     */
    async _build_get(table, where = null, fields = ['*'], sort = null, limit = null) {

        let params = [];
        let sql = '';

        sql += 'SELECT ' + fields.join(', ') + ' ' +
            'FROM ' + table + ' ';

        // Did we specify a where clause?
        if (where) {

            sql += 'WHERE ';

            let where_sql = [];
            for (let key in where) {

                // If the value is NULL, we want to change to "IS" not "=".
                if (where[key] === null) {
                    where_sql.push(key + ' IS NULL');
                } else {
                    where_sql.push(key + ' = ?');
                    params.push(where[key]);
                }

            }

            sql += where_sql.join(' AND ');

        }

        // Did we specify a sort order?
        if (sort) {
            sql += ' ORDER BY ' + sort.join(', ');
        }

        // Did we specify a limit?
        if (limit) {
            sql += ' LIMIT ' + limit;
        }

        return await this.connection.query(sql, params);

    }

    /**
     * Build the insert query
     * @param table
     * @param params
     * @returns {Promise<any>}
     * @private
     */
    async _build_insert(table, params) {

        let sql_params = Object.values(params);
        let placeholders = Array(sql_params.length).fill('?');
        let sql = '';
        sql += 'INSERT INTO ' + table + ' ' +
            '(' + Object.keys(params).join(', ') + ') ' +
            'VALUES ' +
            '(' + placeholders.join(', ') + ') ';

        return await this.connection.execute(sql, sql_params);

    }

    /**
     * Build the delete
     * @param table
     * @param params
     * @returns {Promise<any>}
     * @private
     */
    async _build_delete(table, params) {

        let sql_params = [];
        let sql = '';
        sql += 'DELETE FROM ' + table + ' WHERE ';

        let where_sql = [];
        for (let key in params) {

            // If the value is NULL, we want to change to "IS" not "=".
            if (params[key] === null) {
                where_sql.push(key + ' IS NULL');
            } else {
                where_sql.push(key + ' = ?');
                sql_params.push(params[key]);
            }

        }
        sql += where_sql.join(' AND ');

        return await this.connection.execute(sql, sql_params);

    }

    /**
     * Build the update
     * @param table
     * @param params
     * @param where
     * @returns {Promise<boolean|any>}
     * @private
     */
    async _build_update(table, params, where = null) {

        // id field must be present in order to update the record, if the where object is not specified.
        if (where === null && params['id'] === undefined) {
            return false;
        }

        let sql_params = [];
        let sql = '';
        sql += 'UPDATE ' + table + ' SET ';

        let set_sql = [];
        for (let key in params) {
            if (key !== 'id') {
                set_sql.push(key + ' = ?');
                sql_params.push(params[key]);
            }
        }
        sql += set_sql.join(', ');

        sql += ' WHERE ';
        if (where !== null) {

            let where_sql = [];
            for (let key in where) {

                // If the value is NULL, we want to change to "IS" not "=".
                if (where[key] === null) {
                    where_sql.push(key + ' IS NULL');
                } else {
                    where_sql.push(key + ' = ?');
                    sql_params.push(where[key]);
                }

            }

            sql += where_sql.join(' AND ');

        } else {
            sql += 'id = ?';
            sql_params.push(params['id']);
        }

        return await this.connection.execute(sql, sql_params);

    }

    /**
     * Get one result from the database
     * @param table
     * @param where
     * @param fields
     * @param sort
     * @returns {Promise<{length}|any|boolean>}
     */
    async get(table, where = null, fields = ['*'], sort = null) {
        let results = await this._build_get(table, where, fields, sort);
        return (results.length) ? results[0] : false;
    }

    /**
     * Get multiple results from the database
     * @param table
     * @param where
     * @param fields
     * @param sort
     * @returns {Promise<{length}|any|boolean>}
     */
    async get_all(table, where = null, fields = ['*'], sort = null, limit = null) {
        let results = await this._build_get(table, where, fields, sort, limit);
        return (results.length) ? results : false;
    }

    /**
     * Get one record from the database, using raw sql.
     * @param sql
     * @param params
     * @returns {Promise<{length}|any|boolean>}
     */
    async get_sql(sql, params = []) {
        let results = await this.connection.query(sql, params);
        return (results.length) ? results[0] : false;
    }

    /**
     * Get multiple records from the database, using raw sql.
     * @param sql
     * @param params
     * @returns {Promise<{length}|any|boolean>}
     */
    async get_all_sql(sql, params = []) {
        let results = await this.connection.query(sql, params);
        return (results.length) ? results : false;
    }

    /**
     * Insert data into a table
     * @param table
     * @param params
     * @returns {Promise<number>}
     */
    async insert(table, params) {
        let result = await this._build_insert(table, params);
        return parseInt(result.insertId);
    }

    /**
     * Delete a record from a table
     * @param table
     * @param params
     * @returns {Promise<number>}
     */
    async delete(table, params) {
        let result = await this._build_delete(table, params);
        return result.affectedRows;
    }

    /**
     * Delete a record from a table
     * @param table
     * @param params
     * @param where
     * @returns {Promise<number>}
     */
    async update(table, params, where = null) {
        let result = await this._build_update(table, params, where);
        return (result) ? result.affectedRows : false;
    }

    /**
     * Update a record if it exists, or insert it if it doesn't
     * @param table
     * @param where
     * @param params
     * @returns {Promise<number>}
     */
    async updateOrInsert(table, where, params) {

        // See if there is a record.
        let record = await this.get(table, where);

        // If there's a record, we can update it.
        if (record) {
            let merged = {...record, ...params};
            return this.update(table, merged);
        } else {
            // Otherwise, we need to insert it.
            let merged = {...where, ...params};
            return this.insert(table, merged);
        }

    }

    /**
     * Execute some raw SQL
     * @param sql
     * @param params
     * @returns {Promise<any>}
     */
    async execute(sql, params = []) {
        return await this.connection.execute(sql, params);
    }

}

module.exports = DB;