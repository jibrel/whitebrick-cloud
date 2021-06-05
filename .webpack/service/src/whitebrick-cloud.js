/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/dal.ts":
/*!********************!*\
  !*** ./src/dal.ts ***!
  \********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DAL = void 0;
const environment_1 = __webpack_require__(/*! ./environment */ "./src/environment.ts");
const whitebrick_cloud_1 = __webpack_require__(/*! ./whitebrick-cloud */ "./src/whitebrick-cloud.ts");
const pg_1 = __webpack_require__(/*! pg */ "pg");
const entity_1 = __webpack_require__(/*! ./entity */ "./src/entity/index.ts");
class DAL {
    constructor() {
        this.pool = new pg_1.Pool({
            database: environment_1.environment.dbName,
            host: environment_1.environment.dbHost,
            port: environment_1.environment.dbPort,
            user: environment_1.environment.dbUser,
            password: environment_1.environment.dbPassword,
            max: environment_1.environment.dbPoolMax,
            idleTimeoutMillis: environment_1.environment.dbPoolConnectionTimeoutMillis,
            connectionTimeoutMillis: environment_1.environment.dbPoolConnectionTimeoutMillis,
        });
    }
    static sanitize(str) {
        return str.replace(/[^\w%]+/g, "");
    }
    executeQuery(queryParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield this.executeQueries([queryParams]);
            return results[0];
        });
    }
    executeQueries(queriesAndParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            const results = [];
            try {
                yield client.query("BEGIN");
                for (const queryParams of queriesAndParams) {
                    whitebrick_cloud_1.log.debug(`dal.executeQuery QueryParams: ${queryParams.query}`, queryParams.params);
                    const response = yield client.query(queryParams.query, queryParams.params);
                    results.push({
                        success: true,
                        payload: response,
                    });
                }
                yield client.query("COMMIT");
            }
            catch (error) {
                yield client.query("ROLLBACK");
                whitebrick_cloud_1.log.error(JSON.stringify(error));
                results.push({
                    success: false,
                    message: error.message,
                    code: "PG_" + error.code,
                });
            }
            finally {
                client.release();
            }
            return results;
        });
    }
    tenants() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.tenants.*
        FROM wb.tenants
      `,
            });
            if (result.success)
                result.payload = entity_1.Tenant.parseResult(result.payload);
            return result;
        });
    }
    tenantById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.tenants.*
        FROM wb.tenants
        WHERE id=$1 LIMIT 1
      `,
                params: [id],
            });
            if (result.success)
                result.payload = entity_1.Tenant.parseResult(result.payload)[0];
            return result;
        });
    }
    tenantByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.tenants.*
        FROM wb.tenants
        WHERE name=$1 LIMIT 1
      `,
                params: [name],
            });
            if (result.success) {
                result.payload = entity_1.Tenant.parseResult(result.payload);
                if (result.payload.length == 0) {
                    return {
                        success: false,
                        message: `Could not find tenant where name=${name}`,
                    };
                }
                else {
                    result.payload = result.payload[0];
                }
            }
            return result;
        });
    }
    createTenant(name, label) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        INSERT INTO wb.tenants(
          name, label, created_at, updated_at
        ) VALUES($1, $2, $3, $4)
        RETURNING *
      `,
                params: [name, label, new Date(), new Date()],
            });
            if (result.success)
                result.payload = entity_1.Tenant.parseResult(result.payload)[0];
            return result;
        });
    }
    updateTenant(id, name, label) {
        return __awaiter(this, void 0, void 0, function* () {
            if (name == null && label == null) {
                return {
                    success: false,
                    message: "updateTenant: all parameters are null",
                };
            }
            let paramCount = 3;
            const params = [new Date(), id];
            let query = "UPDATE wb.tenants SET ";
            if (name != null)
                query += `name=$${paramCount}, `;
            params.push(name);
            paramCount++;
            if (label != null)
                query += `label=$${paramCount}, `;
            params.push(label);
            paramCount++;
            query += "updated_at=$1 WHERE id=$2 RETURNING *";
            const result = yield this.executeQuery({
                query: query,
                params: [new Date(), id],
            });
            if (result.success)
                result.payload = entity_1.Tenant.parseResult(result.payload)[0];
            return result;
        });
    }
    deleteTestTenants() {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield this.executeQueries([
                {
                    query: `
          DELETE FROM wb.tenant_users
          WHERE tenant_id IN (
            SELECT id FROM wb.tenants WHERE name like 'test_%'
          )
        `,
                },
                {
                    query: `
          DELETE FROM wb.tenants WHERE name like 'test_%'
        `,
                },
            ]);
            return results[results.length - 1];
        });
    }
    addUserToTenant(tenantId, userId, tenantRoleId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        INSERT INTO wb.tenant_users(
          tenant_id, user_id, role_id, created_at, updated_at
        ) VALUES($1, $2, $3, $4, $5)
      `,
                params: [tenantId, userId, tenantRoleId, new Date(), new Date()],
            });
            return result;
        });
    }
    removeUserFromTenant(tenantId, userId, tenantRoleId) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = `
      DELETE FROM wb.tenant_users
      WHERE tenant_id=$1 AND user_id=$2
    `;
            const params = [tenantId, userId];
            if (tenantRoleId)
                query += " AND role_id=$3";
            params.push(tenantRoleId);
            const result = yield this.executeQuery({
                query: query,
                params: params,
            });
            return result;
        });
    }
    usersByTenantId(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.users.*
        FROM wb.users
        WHERE tenant_id=$1
      `,
                params: [tenantId],
            });
            if (result.success)
                result.payload = entity_1.User.parseResult(result.payload);
            return result;
        });
    }
    userById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.users.*
        FROM wb.users
        WHERE id=$1 LIMIT 1
      `,
                params: [id],
            });
            if (result.success)
                result.payload = entity_1.User.parseResult(result.payload)[0];
            return result;
        });
    }
    userByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT * FROM wb.users
        WHERE email=$1 LIMIT 1
      `,
                params: [email],
            });
            if (result.success)
                result.payload = entity_1.User.parseResult(result.payload)[0];
            return result;
        });
    }
    createUser(email, firstName, lastName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        INSERT INTO wb.users(
          email, first_name, last_name, created_at, updated_at
        ) VALUES($1, $2, $3, $4, $5) RETURNING *
      `,
                params: [email, firstName, lastName, new Date(), new Date()],
            });
            if (result.success)
                result.payload = entity_1.User.parseResult(result.payload)[0];
            return result;
        });
    }
    updateUser(id, email, firstName, lastName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (email == null && firstName == null && lastName == null) {
                return { success: false, message: "updateUser: all parameters are null" };
            }
            let paramCount = 3;
            const params = [new Date(), id];
            let query = "UPDATE wb.users SET ";
            if (email != null)
                query += `email=$${paramCount}, `;
            params.push(email);
            paramCount++;
            if (firstName != null)
                query += `first_name=$${paramCount}, `;
            params.push(firstName);
            paramCount++;
            if (lastName != null)
                query += `last_name=$${paramCount}, `;
            params.push(lastName);
            paramCount++;
            query += "updated_at=$1 WHERE id=$2 RETURNING *";
            const result = yield this.executeQuery({
                query: query,
                params: params,
            });
            if (result.success)
                result.payload = entity_1.User.parseResult(result.payload)[0];
            return result;
        });
    }
    deleteTestUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        DELETE FROM wb.users
        WHERE email like 'test_%test.whitebrick.com'
      `,
                params: [],
            });
            return result;
        });
    }
    roleByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.roles.*
        FROM wb.roles
        WHERE name=$1 LIMIT 1
      `,
                params: [name],
            });
            if (result.success)
                result.payload = entity_1.Role.parseResult(result.payload)[0];
            return result;
        });
    }
    createSchema(name, label, tenantOwnerId, userOwnerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield this.executeQueries([
                {
                    query: `CREATE SCHEMA ${DAL.sanitize(name)}`,
                },
                {
                    query: `
          INSERT INTO wb.schemas(
            name, label, tenant_owner_id, user_owner_id, created_at, updated_at
          ) VALUES($1, $2, $3, $4, $5, $6) RETURNING *
        `,
                    params: [
                        name,
                        label,
                        tenantOwnerId,
                        userOwnerId,
                        new Date(),
                        new Date(),
                    ],
                },
            ]);
            const insertResult = results[results.length - 1];
            if (insertResult.success) {
                insertResult.payload = entity_1.Schema.parseResult(insertResult.payload)[0];
            }
            return insertResult;
        });
    }
    schemas(schemaNamePattern) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!schemaNamePattern)
                schemaNamePattern = "%";
            schemaNamePattern = DAL.sanitize(schemaNamePattern);
            const results = yield this.executeQueries([
                {
                    query: `
          SELECT information_schema.schemata.*
          FROM information_schema.schemata
          WHERE schema_name LIKE $1
          AND schema_name NOT LIKE 'pg_%'
          AND schema_name NOT IN ('${entity_1.Schema.SYS_SCHEMA_NAMES.join("','")}')
        `,
                    params: [schemaNamePattern],
                },
                {
                    query: `
          SELECT wb.schemas.*
          FROM wb.schemas
          WHERE name LIKE $1
        `,
                    params: [schemaNamePattern],
                },
            ]);
            if (results[0].success && results[1].success) {
                results[0].payload = entity_1.Schema.parseResult(results[0].payload);
                results[1].payload = entity_1.Schema.parseResult(results[1].payload);
                if (results[0].payload.length != results[1].payload.length) {
                    return {
                        success: false,
                        message: "wb.schemas out of sync with information_schema.schemata",
                    };
                }
            }
            return results[results.length - 1];
        });
    }
    schemaByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.schemas.*
        FROM wb.schemas
        WHERE name=$1 LIMIT 1
      `,
                params: [name],
            });
            if (result.success) {
                result.payload = entity_1.Schema.parseResult(result.payload);
                if (result.payload.length == 0) {
                    return {
                        success: false,
                        message: `Could not find schema where name=${name}`,
                    };
                }
                else {
                    result.payload = result.payload[0];
                }
            }
            return result;
        });
    }
    schemasByUserOwner(userEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.schemas.* FROM wb.schemas
        JOIN wb.users ON wb.schemas.user_owner_id=wb.users.id
        WHERE wb.users.email=$1
      `,
                params: [userEmail],
            });
            if (result.success) {
                const schemasWithRole = Array();
                for (const schema of entity_1.Schema.parseResult(result.payload)) {
                    schema.userRole = "schema_owner";
                    schemasWithRole.push(schema);
                }
                result.payload = schemasWithRole;
            }
            return result;
        });
    }
    removeOrDeleteSchema(schemaName, del) {
        return __awaiter(this, void 0, void 0, function* () {
            const queriesAndParams = [
                {
                    query: `
          DELETE FROM wb.schemas
          WHERE name=$1
        `,
                    params: [schemaName],
                },
            ];
            if (del) {
                queriesAndParams.push({
                    query: `DROP SCHEMA IF EXISTS ${DAL.sanitize(schemaName)} CASCADE`,
                });
            }
            const results = yield this.executeQueries(queriesAndParams);
            return results[results.length - 1];
        });
    }
    addUserToSchema(schemaId, userId, schemaRoleId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        INSERT INTO wb.schema_users(
          schema_id, user_id, role_id, created_at, updated_at
        ) VALUES($1, $2, $3, $4, $5)
      `,
                params: [schemaId, userId, schemaRoleId, new Date(), new Date()],
            });
            return result;
        });
    }
    removeUserFromSchema(schemaId, userId, schemaRoleId) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = `
      DELETE FROM wb.schema_users
      WHERE schema_id=$1 AND user_id=$2
    `;
            const params = [schemaId, userId];
            if (schemaRoleId)
                query += " AND role_id=$3";
            params.push(schemaRoleId);
            const result = yield this.executeQuery({
                query: query,
                params: params,
            });
            return result;
        });
    }
    removeAllUsersFromSchema(schemaName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        DELETE FROM wb.schema_users
        WHERE schema_id IN (
          SELECT id FROM wb.schemas WHERE name=$1
        )
      `,
                params: [schemaName],
            });
            return result;
        });
    }
    schemasByUser(userEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.schemas.*, wb.roles.name as role_name
        FROM wb.schemas
        JOIN wb.schema_users ON wb.schemas.id=wb.schema_users.schema_id
        JOIN wb.users ON wb.schema_users.user_id=wb.users.id
        JOIN wb.roles ON wb.schema_users.role_id=wb.roles.id
        WHERE wb.users.email=$1
      `,
                params: [userEmail],
            });
            if (result.success) {
                const schemasWithRole = Array();
                let schema;
                result.payload.rows.forEach((row) => {
                    schema = entity_1.Schema.parse(row);
                    schema.userRole = row.role_name;
                    schemasWithRole.push(schema);
                });
                result.payload = schemasWithRole;
            }
            return result;
        });
    }
    tables(schemaName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.tables.*
        FROM wb.tables
        JOIN wb.schemas ON wb.tables.schema_id=wb.schemas.id
        WHERE wb.schemas.name=$1
      `,
                params: [schemaName],
            });
            if (result.success)
                result.payload = entity_1.Table.parseResult(result.payload);
            return result;
        });
    }
    discoverTables(schemaName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT information_schema.tables.table_name
        FROM information_schema.tables
        WHERE table_schema=$1
      `,
                params: [schemaName],
            });
            if (result.success) {
                result.payload = result.payload.rows.map((row) => row.table_name);
            }
            return result;
        });
    }
    columns(schemaName, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.columns.*, information_schema.columns.data_type as type
        FROM wb.columns
        JOIN wb.tables ON wb.columns.table_id=wb.tables.id
        JOIN wb.schemas ON wb.tables.schema_id=wb.schemas.id
        JOIN information_schema.columns ON (
          wb.columns.name=information_schema.columns.column_name
          AND wb.schemas.name=information_schema.columns.table_schema
        )
        WHERE wb.schemas.name=$1 AND wb.tables.name=$2 AND information_schema.columns.table_name=$2
      `,
                params: [schemaName, tableName],
            });
            if (result.success)
                result.payload = entity_1.Column.parseResult(result.payload);
            return result;
        });
    }
    discoverColumns(schemaName, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT column_name as name, data_type as type
        FROM information_schema.columns
        WHERE table_schema=$1
        AND table_name=$2
      `,
                params: [schemaName, tableName],
            });
            if (result.success)
                result.payload = entity_1.Column.parseResult(result.payload);
            return result;
        });
    }
    foreignKeysOrReferences(schemaName, tableNamePattern, columnNamePattern, type) {
        return __awaiter(this, void 0, void 0, function* () {
            schemaName = DAL.sanitize(schemaName);
            tableNamePattern = DAL.sanitize(tableNamePattern);
            columnNamePattern = DAL.sanitize(columnNamePattern);
            let whereSql = "";
            switch (type) {
                case "FOREIGN_KEYS":
                    whereSql = `
          AND fk.table_name LIKE '${tableNamePattern}'
          AND fk.column_name LIKE '${columnNamePattern}'
        `;
                case "REFERENCES":
                    whereSql = `
          AND ref.table_name LIKE '${tableNamePattern}'
          AND ref.column_name LIKE '${columnNamePattern}'
        `;
                case "ALL":
                    whereSql = `
          AND fk.table_name LIKE '${tableNamePattern}'
          AND fk.column_name LIKE '${columnNamePattern}'
        `;
            }
            const result = yield this.executeQuery({
                query: `
        SELECT
        -- unique reference info
        ref.table_name       AS ref_table,
        ref.column_name      AS ref_column,
        refd.constraint_type AS ref_type, -- e.g. UNIQUE or PRIMARY KEY
        -- foreign key info
        fk.table_name        AS fk_table,
        fk.column_name       AS fk_column,
        fk.constraint_name   AS fk_name,
        map.update_rule      AS fk_on_update,
        map.delete_rule      AS fk_on_delete
        -- lists fk constraints AND maps them to pk constraints
        FROM information_schema.referential_constraints AS map
        -- join unique constraints (e.g. PKs constraints) to ref columns info
        INNER JOIN information_schema.key_column_usage AS ref
        ON  ref.constraint_catalog = map.unique_constraint_catalog
        AND ref.constraint_schema = map.unique_constraint_schema
        AND ref.constraint_name = map.unique_constraint_name
        -- optional: to include reference constraint type
        LEFT JOIN information_schema.table_constraints AS refd
        ON  refd.constraint_catalog = ref.constraint_catalog
        AND refd.constraint_schema = ref.constraint_schema
        AND refd.constraint_name = ref.constraint_name
        -- join fk columns to the correct ref columns using ordinal positions
        INNER JOIN information_schema.key_column_usage AS fk
        ON  fk.constraint_catalog = map.constraint_catalog
        AND fk.constraint_schema = map.constraint_schema
        AND fk.constraint_name = map.constraint_name
        AND fk.position_in_unique_constraint = ref.ordinal_position --IMPORTANT!
        WHERE ref.table_schema='${schemaName}'
        AND fk.table_schema='${schemaName}'
        ${whereSql}
      `,
            });
            if (!result.success)
                return result;
            const constraints = [];
            for (const row of result.payload.rows) {
                const constraint = {
                    constraintName: row.fk_name,
                    tableName: row.fk_table,
                    columnName: row.fk_column,
                    relTableName: row.ref_table,
                    relColumnName: row.ref_column,
                };
                constraints.push(constraint);
            }
            result.payload = constraints;
            return result;
        });
    }
    primaryKeys(schemaName, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            schemaName = DAL.sanitize(schemaName);
            tableName = DAL.sanitize(tableName);
            const result = yield this.executeQuery({
                query: `
        SELECT DISTINCT c.column_name, tc.constraint_name
        FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage AS ccu
        USING (constraint_schema, constraint_name)
        JOIN information_schema.columns AS c
        ON c.table_schema = tc.constraint_schema
        AND tc.table_name = c.table_name
        AND ccu.column_name = c.column_name
        WHERE constraint_type = 'PRIMARY KEY'
        AND c.table_schema='${schemaName}'
        AND tc.table_name = '${tableName}'
      `,
            });
            if (result.success) {
                const pKColsConstraints = {};
                for (const row of result.payload.rows) {
                    pKColsConstraints[row.column_name] = row.constraint_name;
                }
                result.payload = pKColsConstraints;
            }
            return result;
        });
    }
    deleteConstraint(schemaName, tableName, constraintName) {
        return __awaiter(this, void 0, void 0, function* () {
            schemaName = DAL.sanitize(schemaName);
            tableName = DAL.sanitize(tableName);
            constraintName = DAL.sanitize(constraintName);
            const result = yield this.executeQuery({
                query: `
        ALTER TABLE ${schemaName}.${tableName}
        DROP CONSTRAINT IF EXISTS ${constraintName}
      `,
            });
            return result;
        });
    }
    createPrimaryKey(schemaName, tableName, columnNames) {
        return __awaiter(this, void 0, void 0, function* () {
            schemaName = DAL.sanitize(schemaName);
            tableName = DAL.sanitize(tableName);
            const sanitizedColumnNames = [];
            for (const columnName of columnNames) {
                sanitizedColumnNames.push(DAL.sanitize(columnName));
            }
            const result = yield this.executeQuery({
                query: `
        ALTER TABLE ${schemaName}.${tableName}
        ADD PRIMARY KEY (${sanitizedColumnNames.join(",")});
      `,
            });
            return result;
        });
    }
    createForeignKey(schemaName, tableName, columnNames, parentTableName, parentColumnNames) {
        return __awaiter(this, void 0, void 0, function* () {
            whitebrick_cloud_1.log.debug(`dal.createForeignKey(${schemaName},${tableName},${columnNames},${parentTableName},${parentColumnNames})`);
            schemaName = DAL.sanitize(schemaName);
            tableName = DAL.sanitize(tableName);
            const sanitizedColumnNames = [];
            for (const columnName of columnNames) {
                sanitizedColumnNames.push(DAL.sanitize(columnName));
            }
            parentTableName = DAL.sanitize(parentTableName);
            const sanitizedParentColumnNames = [];
            for (const parentColumnName of parentColumnNames) {
                sanitizedParentColumnNames.push(DAL.sanitize(parentColumnName));
            }
            const result = yield this.executeQuery({
                query: `
        ALTER TABLE ${schemaName}.${tableName}
        ADD CONSTRAINT ${tableName}_${sanitizedColumnNames.join("_")}_fkey
        FOREIGN KEY (${sanitizedColumnNames.join(",")})
        REFERENCES ${schemaName}.${parentTableName}
          (${sanitizedParentColumnNames.join(",")})
        ON DELETE SET NULL
      `,
            });
            return result;
        });
    }
    tableBySchemaNameTableName(schemaName, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.tables.*
        FROM wb.tables
        JOIN wb.schemas ON wb.tables.schema_id=wb.schemas.id
        WHERE wb.schemas.name=$1 AND wb.tables.name=$2 LIMIT 1
      `,
                params: [schemaName, tableName],
            });
            if (result.success)
                result.payload = entity_1.Table.parseResult(result.payload)[0];
            return result;
        });
    }
    addOrCreateTable(schemaName, tableName, tableLabel, create) {
        return __awaiter(this, void 0, void 0, function* () {
            whitebrick_cloud_1.log.debug(`dal.addOrCreateTable ${schemaName} ${tableName} ${tableLabel} ${create}`);
            schemaName = DAL.sanitize(schemaName);
            tableName = DAL.sanitize(tableName);
            let result = yield this.schemaByName(schemaName);
            if (!result.success)
                return result;
            const queriesAndParams = [
                {
                    query: `
        INSERT INTO wb.tables(schema_id, name, label, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
                    params: [
                        result.payload.id,
                        tableName,
                        tableLabel,
                        new Date(),
                        new Date(),
                    ],
                },
            ];
            if (create) {
                queriesAndParams.push({
                    query: `CREATE TABLE "${schemaName}"."${tableName}"()`,
                });
            }
            const results = yield this.executeQueries(queriesAndParams);
            return results[results.length - 1];
        });
    }
    removeOrDeleteTable(schemaName, tableName, del) {
        return __awaiter(this, void 0, void 0, function* () {
            schemaName = DAL.sanitize(schemaName);
            tableName = DAL.sanitize(tableName);
            let result = yield this.schemaByName(schemaName);
            if (!result.success)
                return result;
            const queriesAndParams = [
                {
                    query: `
          DELETE FROM wb.tables
          WHERE schema_id=$1 AND name=$2
        `,
                    params: [result.payload.id, tableName],
                },
            ];
            if (del) {
                queriesAndParams.push({
                    query: `DROP TABLE IF EXISTS "${schemaName}"."${tableName}" CASCADE`,
                });
            }
            const results = yield this.executeQueries(queriesAndParams);
            return results[results.length - 1];
        });
    }
    updateTable(schemaName, tableName, newTableName, newTableLabel) {
        return __awaiter(this, void 0, void 0, function* () {
            schemaName = DAL.sanitize(schemaName);
            tableName = DAL.sanitize(tableName);
            let result = yield this.tableBySchemaNameTableName(schemaName, tableName);
            if (!result.success)
                return result;
            let params = [];
            let query = `
      UPDATE wb.tables SET
    `;
            let updates = [];
            if (newTableName) {
                updates.push("name=$" + (params.length + 1));
                params.push(newTableName);
            }
            if (newTableLabel) {
                updates.push("label=$" + (params.length + 1));
                params.push(newTableLabel);
            }
            query += `${updates.join(", ")} WHERE id=$${params.length + 1}`;
            params.push(result.payload.id);
            const queriesAndParams = [
                {
                    query: query,
                    params: params,
                },
            ];
            if (newTableName) {
                queriesAndParams.push({
                    query: `
          ALTER TABLE "${schemaName}"."${tableName}"
          RENAME TO ${newTableName}
        `,
                });
            }
            const results = yield this.executeQueries(queriesAndParams);
            return results[results.length - 1];
        });
    }
    addOrCreateColumn(schemaName, tableName, columnName, columnLabel, create, columnPGType) {
        return __awaiter(this, void 0, void 0, function* () {
            whitebrick_cloud_1.log.debug(`dal.addOrCreateColumn ${schemaName} ${tableName} ${columnName} ${columnLabel} ${columnPGType} ${create}`);
            schemaName = DAL.sanitize(schemaName);
            tableName = DAL.sanitize(tableName);
            columnName = DAL.sanitize(columnName);
            let result = yield this.tableBySchemaNameTableName(schemaName, tableName);
            if (!result.success)
                return result;
            const queriesAndParams = [
                {
                    query: `
          INSERT INTO wb.columns(table_id, name, label, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
                    params: [
                        result.payload.id,
                        columnName,
                        columnLabel,
                        new Date(),
                        new Date(),
                    ],
                },
            ];
            if (create) {
                queriesAndParams.push({
                    query: `
          ALTER TABLE "${schemaName}"."${tableName}"
          ADD ${columnName} ${columnPGType}
        `,
                });
            }
            const results = yield this.executeQueries(queriesAndParams);
            return results[results.length - 1];
        });
    }
    removeOrDeleteColumn(schemaName, tableName, columnName, del) {
        return __awaiter(this, void 0, void 0, function* () {
            schemaName = DAL.sanitize(schemaName);
            tableName = DAL.sanitize(tableName);
            columnName = DAL.sanitize(columnName);
            let result = yield this.tableBySchemaNameTableName(schemaName, tableName);
            if (!result.success)
                return result;
            const queriesAndParams = [
                {
                    query: `
          DELETE FROM wb.columns
          WHERE table_id=$1 AND name=$2
        `,
                    params: [result.payload.id, columnName],
                },
            ];
            if (del) {
                queriesAndParams.push({
                    query: `
          ALTER TABLE "${schemaName}"."${tableName}"
          DROP COLUMN IF EXISTS ${columnName} CASCADE
        `,
                });
            }
            const results = yield this.executeQueries(queriesAndParams);
            return results[results.length - 1];
        });
    }
    tableUser(userEmail, schemaName, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        SELECT wb.table_users.*
        FROM wb.table_users
        JOIN wb.tables ON wb.table_users.table_id=wb.tables.id
        JOIN wb.schemas ON wb.tables.schema_id=wb.schemas.id
        JOIN wb.users ON wb.table_users.user_id=wb.users.id
        WHERE wb.users.email=$1 AND wb.schemas.name=$2 AND wb.tables.name=$3
        LIMIT 1
      `,
                params: [userEmail, schemaName, tableName],
            });
            if (result.success) {
                result.payload = entity_1.TableUser.parseResult(result.payload)[0];
            }
            return result;
        });
    }
    removeTableUsers(schemaName, tableName, userEmails) {
        return __awaiter(this, void 0, void 0, function* () {
            let params = [schemaName, tableName];
            let query = `
      DELETE FROM wb.table_users
      WHERE wb.table_users.table_id IN (
        SELECT wb.tables.id FROM wb.tables
        JOIN wb.schemas ON wb.tables.schema_id=wb.schemas.id
        WHERE wb.schemas.name=$1
        AND wb.tables.name=$2
      )
    `;
            if (userEmails && userEmails.length > 0) {
                params.push(userEmails.join(","));
                query += `
        AND wb.table_users.user_id IN (
          SELECT wb.users.id from wb.users
          WHERE email IN $3
        )
      `;
            }
            const result = yield this.executeQuery({
                query: query,
                params: params,
            });
            return result;
        });
    }
    saveTableUserSettings(tableId, userId, roleId, settings) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.executeQuery({
                query: `
        INSERT INTO wb.table_users (
          table_id, user_id, role_id, settings
        )
        VALUES($1, $2, $3, $4)
        ON CONFLICT (table_id, user_id, role_id) 
        DO UPDATE SET settings = EXCLUDED.settings
      `,
                params: [tableId, userId, roleId, settings],
            });
            return result;
        });
    }
}
exports.DAL = DAL;


/***/ }),

/***/ "./src/entity/Column.ts":
/*!******************************!*\
  !*** ./src/entity/Column.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Column = void 0;
class Column {
    static parseResult(data) {
        if (!data)
            throw new Error("Column.parseResult: input is null");
        const columns = Array();
        data.rows.forEach((row) => {
            columns.push(Column.parse(row));
        });
        return columns;
    }
    static parse(data) {
        if (!data)
            throw new Error("Column.parse: input is null");
        const column = new Column();
        column.id = data.id;
        column.tableId = data.table_id;
        column.name = data.name;
        column.label = data.label;
        column.type = data.type;
        column.createdAt = data.created_at;
        column.updatedAt = data.updated_at;
        return column;
    }
}
exports.Column = Column;
Column.COMMON_TYPES = {
    Text: "text",
    Number: "integer",
    Decimal: "decimal",
    Boolean: "boolean",
    Date: "date",
    "Date & Time": "timestamp",
};


/***/ }),

/***/ "./src/entity/Role.ts":
/*!****************************!*\
  !*** ./src/entity/Role.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Role = void 0;
class Role {
    static parseResult(data) {
        if (!data)
            throw new Error("Role.parseResult: input is null");
        const roles = Array();
        data.rows.forEach((row) => {
            roles.push(Role.parse(row));
        });
        return roles;
    }
    static parse(data) {
        if (!data)
            throw new Error("Role.parse: input is null");
        const role = new Role();
        role.id = data.id;
        role.name = data.name;
        return role;
    }
}
exports.Role = Role;


/***/ }),

/***/ "./src/entity/Schema.ts":
/*!******************************!*\
  !*** ./src/entity/Schema.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Schema = void 0;
class Schema {
    static parseResult(data) {
        if (!data)
            throw new Error("Schema.parseResult: input is null");
        const schemas = Array();
        data.rows.forEach((row) => {
            schemas.push(Schema.parse(row));
        });
        return schemas;
    }
    static parse(data) {
        if (!data)
            throw new Error("Schema.parse: input is null");
        const schema = new Schema();
        schema.id = data.id;
        schema.name = data.name;
        schema.label = data.label;
        schema.tenantOwnerId = data.tenantOwnerId;
        schema.userOwnerId = data.userOwnerId;
        schema.createdAt = data.created_at;
        schema.updatedAt = data.updated_at;
        return schema;
    }
}
exports.Schema = Schema;
Schema.SYS_SCHEMA_NAMES = [
    "public",
    "information_schema",
    "hdb_catalog",
    "wb",
];


/***/ }),

/***/ "./src/entity/Table.ts":
/*!*****************************!*\
  !*** ./src/entity/Table.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Table = void 0;
class Table {
    static parseResult(data) {
        if (!data)
            throw new Error("Table.parseResult: input is null");
        const tables = Array();
        data.rows.forEach((row) => {
            tables.push(Table.parse(row));
        });
        return tables;
    }
    static parse(data) {
        if (!data)
            throw new Error("Table.parse: input is null");
        const table = new Table();
        table.id = data.id;
        table.schemaId = data.schema_id;
        table.name = data.name;
        table.label = data.label;
        table.createdAt = data.created_at;
        table.updatedAt = data.updated_at;
        return table;
    }
}
exports.Table = Table;


/***/ }),

/***/ "./src/entity/TableUser.ts":
/*!*********************************!*\
  !*** ./src/entity/TableUser.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TableUser = void 0;
class TableUser {
    static parseResult(data) {
        if (!data)
            throw new Error("TableUser.parseResult: input is null");
        const tableUsers = Array();
        data.rows.forEach((row) => {
            tableUsers.push(TableUser.parse(row));
        });
        return tableUsers;
    }
    static parse(data) {
        if (!data)
            throw new Error("TableUser.parse: input is null");
        const tableUser = new TableUser();
        tableUser.tableId = data.table_id;
        tableUser.userId = data.user_id;
        tableUser.roleId = data.role_id;
        tableUser.settings = data.settings;
        tableUser.createdAt = data.created_at;
        tableUser.updatedAt = data.updated_at;
        return tableUser;
    }
}
exports.TableUser = TableUser;


/***/ }),

/***/ "./src/entity/Tenant.ts":
/*!******************************!*\
  !*** ./src/entity/Tenant.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Tenant = void 0;
class Tenant {
    static parseResult(data) {
        if (!data)
            throw new Error("Tenant.parseResult: input is null");
        const tenants = Array();
        data.rows.forEach((row) => {
            tenants.push(Tenant.parse(row));
        });
        return tenants;
    }
    static parse(data) {
        if (!data)
            throw new Error("Tenant.parse: input is null");
        const tenant = new Tenant();
        tenant.id = data.id;
        tenant.name = data.name;
        tenant.label = data.label;
        tenant.createdAt = data.created_at;
        tenant.updatedAt = data.updated_at;
        return tenant;
    }
}
exports.Tenant = Tenant;


/***/ }),

/***/ "./src/entity/User.ts":
/*!****************************!*\
  !*** ./src/entity/User.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.User = void 0;
class User {
    static parseResult(data) {
        if (!data)
            throw new Error("User.parseResult: input is null");
        const users = Array();
        data.rows.forEach((row) => {
            users.push(User.parse(row));
        });
        return users;
    }
    static parse(data) {
        if (!data)
            throw new Error("User.parse: input is null");
        const user = new User();
        user.id = data.id;
        user.email = data.email;
        user.firstName = data.first_name;
        user.lastName = data.last_name;
        user.createdAt = data.created_at;
        user.updatedAt = data.updated_at;
        return user;
    }
}
exports.User = User;


/***/ }),

/***/ "./src/entity/index.ts":
/*!*****************************!*\
  !*** ./src/entity/index.ts ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(/*! ./Role */ "./src/entity/Role.ts"), exports);
__exportStar(__webpack_require__(/*! ./Schema */ "./src/entity/Schema.ts"), exports);
__exportStar(__webpack_require__(/*! ./Table */ "./src/entity/Table.ts"), exports);
__exportStar(__webpack_require__(/*! ./Column */ "./src/entity/Column.ts"), exports);
__exportStar(__webpack_require__(/*! ./TableUser */ "./src/entity/TableUser.ts"), exports);
__exportStar(__webpack_require__(/*! ./Tenant */ "./src/entity/Tenant.ts"), exports);
__exportStar(__webpack_require__(/*! ./User */ "./src/entity/User.ts"), exports);


/***/ }),

/***/ "./src/environment.ts":
/*!****************************!*\
  !*** ./src/environment.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.environment = void 0;
exports.environment = {
    secretMessage: process.env.SECRET_MESSAGE,
    dbName: process.env.DB_NAME,
    dbHost: process.env.DB_HOST,
    dbPort: parseInt(process.env.DB_PORT || ""),
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbPoolMax: parseInt(process.env.DB_POOL_MAX || ""),
    dbPoolIdleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MILLIS || ""),
    dbPoolConnectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MILLIS || ""),
    hasuraHost: process.env.HASURA_HOST,
    hasuraAdminSecret: process.env.HASURA_ADMIN_SECRET,
};


/***/ }),

/***/ "./src/hasura-api.ts":
/*!***************************!*\
  !*** ./src/hasura-api.ts ***!
  \***************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hasuraApi = void 0;
const axios_1 = __importDefault(__webpack_require__(/*! axios */ "axios"));
const environment_1 = __webpack_require__(/*! ./environment */ "./src/environment.ts");
const whitebrick_cloud_1 = __webpack_require__(/*! ./whitebrick-cloud */ "./src/whitebrick-cloud.ts");
const headers = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "x-hasura-admin-secret": environment_1.environment.hasuraAdminSecret,
};
class HasuraApi {
    constructor() {
        this.instance = null;
    }
    get http() {
        return this.instance != null ? this.instance : this.initHasuraApi();
    }
    initHasuraApi() {
        const http = axios_1.default.create({
            baseURL: environment_1.environment.hasuraHost,
            headers,
            withCredentials: false,
        });
        this.instance = http;
        return http;
    }
    post(type, args) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = { success: false };
            try {
                whitebrick_cloud_1.log.debug(`hasuraApi.post: type: ${type}`, args);
                const response = yield this.http.post("/v1/metadata", {
                    type: type,
                    args: args,
                });
                result = {
                    success: true,
                    payload: response,
                };
            }
            catch (error) {
                if (error.response && error.response.data) {
                    if (!HasuraApi.HASURA_IGNORE_CODES.includes(error.response.data.code)) {
                        whitebrick_cloud_1.log.error(error.response.data);
                        result = {
                            success: false,
                            message: error.response.data.error,
                            code: error.response.data.code,
                        };
                    }
                    else {
                        result = {
                            success: true,
                        };
                    }
                }
                else {
                    result = {
                        success: false,
                        message: error.message,
                    };
                }
            }
            return result;
        });
    }
    trackTable(schemaName, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.post("pg_track_table", {
                table: {
                    schema: schemaName,
                    name: tableName,
                },
            });
            if (!result.success &&
                result.code &&
                HasuraApi.HASURA_IGNORE_CODES.includes(result.code)) {
                return {
                    success: true,
                    payload: true,
                    message: result.code,
                };
            }
            return result;
        });
    }
    untrackTable(schemaName, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.post("pg_untrack_table", {
                table: {
                    schema: schemaName,
                    name: tableName,
                },
                cascade: true,
            });
            if (!result.success &&
                result.code &&
                HasuraApi.HASURA_IGNORE_CODES.includes(result.code)) {
                return {
                    success: true,
                    payload: true,
                    message: result.code,
                };
            }
            return result;
        });
    }
    createObjectRelationship(schemaName, tableName, columnName, parentTableName) {
        return __awaiter(this, void 0, void 0, function* () {
            whitebrick_cloud_1.log.debug(`hasuraApi.createObjectRelationship(${schemaName}, ${tableName}, ${columnName}, ${parentTableName})`);
            const result = yield this.post("pg_create_object_relationship", {
                name: `obj_${tableName}_${parentTableName}`,
                table: {
                    schema: schemaName,
                    name: tableName,
                },
                using: {
                    foreign_key_constraint_on: columnName,
                },
            });
            if (!result.success &&
                result.code &&
                HasuraApi.HASURA_IGNORE_CODES.includes(result.code)) {
                return {
                    success: true,
                    payload: true,
                    message: result.code,
                };
            }
            return result;
        });
    }
    createArrayRelationship(schemaName, tableName, childTableName, childColumnNames) {
        return __awaiter(this, void 0, void 0, function* () {
            whitebrick_cloud_1.log.debug(`hasuraApi.createArrayRelationship(${schemaName}, ${tableName}, ${childTableName}, ${childColumnNames})`);
            const result = yield this.post("pg_create_array_relationship", {
                name: `arr_${tableName}_${childTableName}`,
                table: {
                    schema: schemaName,
                    name: tableName,
                },
                using: {
                    foreign_key_constraint_on: {
                        column: childColumnNames[0],
                        table: {
                            schema: schemaName,
                            name: childTableName,
                        },
                    },
                },
            });
            if (!result.success &&
                result.code &&
                HasuraApi.HASURA_IGNORE_CODES.includes(result.code)) {
                return {
                    success: true,
                    payload: true,
                    message: result.code,
                };
            }
            return result;
        });
    }
    dropRelationships(schemaName, tableName, parentTableName) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.post("pg_drop_relationship", {
                table: {
                    schema: schemaName,
                    name: tableName,
                },
                relationship: `obj_${tableName}_${parentTableName}`,
            });
            if (!result.success &&
                (!result.code ||
                    (result.code && !HasuraApi.HASURA_IGNORE_CODES.includes(result.code)))) {
                return result;
            }
            result = yield this.post("pg_drop_relationship", {
                table: {
                    schema: schemaName,
                    name: parentTableName,
                },
                relationship: `arr_${parentTableName}_${tableName}`,
            });
            if (!result.success &&
                result.code &&
                HasuraApi.HASURA_IGNORE_CODES.includes(result.code)) {
                return {
                    success: true,
                    payload: true,
                    message: result.code,
                };
            }
            return result;
        });
    }
}
HasuraApi.HASURA_IGNORE_CODES = [
    "already-untracked",
    "already-tracked",
    "not-exists",
];
exports.hasuraApi = new HasuraApi();


/***/ }),

/***/ "./src/types/index.ts":
/*!****************************!*\
  !*** ./src/types/index.ts ***!
  \****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.schema = void 0;
const schema_1 = __webpack_require__(/*! ./schema */ "./src/types/schema.ts");
const tenant_1 = __webpack_require__(/*! ./tenant */ "./src/types/tenant.ts");
const user_1 = __webpack_require__(/*! ./user */ "./src/types/user.ts");
const table_1 = __webpack_require__(/*! ./table */ "./src/types/table.ts");
const lodash_1 = __webpack_require__(/*! lodash */ "lodash");
const apollo_server_lambda_1 = __webpack_require__(/*! apollo-server-lambda */ "apollo-server-lambda");
const graphql_constraint_directive_1 = __webpack_require__(/*! graphql-constraint-directive */ "graphql-constraint-directive");
const graphql_tools_1 = __webpack_require__(/*! graphql-tools */ "graphql-tools");
const typeDefs = apollo_server_lambda_1.gql `
  type Query {
    wbHealthCheck: String!
  }

  type Mutation {
    wbResetTestData: Boolean!
  }
`;
const resolvers = {
    Query: {
        wbHealthCheck: () => "All good",
    },
    Mutation: {
        wbResetTestData: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.resetTestData();
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.success;
        }),
    },
};
exports.schema = graphql_tools_1.makeExecutableSchema({
    typeDefs: [
        graphql_constraint_directive_1.constraintDirectiveTypeDefs,
        typeDefs,
        tenant_1.typeDefs,
        user_1.typeDefs,
        schema_1.typeDefs,
        table_1.typeDefs,
    ],
    resolvers: lodash_1.merge(resolvers, tenant_1.resolvers, user_1.resolvers, schema_1.resolvers, table_1.resolvers),
    schemaTransforms: [graphql_constraint_directive_1.constraintDirective()],
});


/***/ }),

/***/ "./src/types/schema.ts":
/*!*****************************!*\
  !*** ./src/types/schema.ts ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.resolvers = exports.typeDefs = void 0;
const apollo_server_lambda_1 = __webpack_require__(/*! apollo-server-lambda */ "apollo-server-lambda");
exports.typeDefs = apollo_server_lambda_1.gql `
  type Schema {
    id: ID!
    name: String!
    label: String!
    tenantOwnerId: Int
    userOwnerId: Int
    userRole: String
    context: JSON
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    wbSchemas(userEmail: String!): [Schema]
  }

  extend type Mutation {
    wbCreateSchema(
      name: String!
      label: String!
      tenantOwnerId: Int
      tenantOwnerName: String
      userOwnerId: Int
      userOwnerEmail: String
    ): Schema
  }
`;
exports.resolvers = {
    Query: {
        wbSchemas: (_, { userEmail }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.accessibleSchemas(userEmail);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
    },
    Mutation: {
        wbCreateSchema: (_, { name, label, tenantOwnerId, tenantOwnerName, userOwnerId, userOwnerEmail, }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.createSchema(name, label, tenantOwnerId, tenantOwnerName, userOwnerId, userOwnerEmail);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
    },
};


/***/ }),

/***/ "./src/types/table.ts":
/*!****************************!*\
  !*** ./src/types/table.ts ***!
  \****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.resolvers = exports.typeDefs = void 0;
const apollo_server_lambda_1 = __webpack_require__(/*! apollo-server-lambda */ "apollo-server-lambda");
const graphql_type_json_1 = __webpack_require__(/*! graphql-type-json */ "graphql-type-json");
exports.typeDefs = apollo_server_lambda_1.gql `
  scalar JSON

  type Table {
    id: ID!
    schemaId: Int!
    name: String!
    label: String!
    createdAt: String!
    updatedAt: String!
    columns: [Column]!
  }

  type Column {
    id: ID!
    tableId: Int!
    name: String!
    label: String!
    type: String!
    isPrimaryKey: Boolean!
    foreignKeys: [ConstraintId]!
    referencedBy: [ConstraintId]!
    createdAt: String!
    updatedAt: String!
  }

  type ConstraintId {
    constraintName: String!
    tableName: String!
    columnName: String!
    relTableName: String
    relColumnName: String
  }

  type TableUser {
    tableId: Int!
    userId: Int!
    roleId: Int!
    settings: JSON
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    wbTables(schemaName: String!): [Table]
    wbColumns(schemaName: String!, tableName: String!): [Column]
    wbTableUser(
      userEmail: String!
      schemaName: String!
      tableName: String!
    ): TableUser
  }

  extend type Mutation {
    wbAddOrCreateTable(
      schemaName: String!
      tableName: String!
      tableLabel: String!
      create: Boolean
    ): Boolean!
    wbUpdateTable(
      schemaName: String!
      tableName: String!
      newTableName: String
      newTableLabel: String
    ): Boolean!
    wbAddAllExistingTables(schemaName: String!): Boolean!
    wbAddOrCreateColumn(
      schemaName: String!
      tableName: String!
      columnName: String!
      columnLabel: String!
      create: Boolean
      columnType: String
    ): Boolean!
    wbCreateOrDeletePrimaryKey(
      schemaName: String!
      tableName: String!
      columnNames: [String]!
      del: Boolean
    ): Boolean!
    wbAddOrCreateForeignKey(
      schemaName: String!
      tableName: String!
      columnNames: [String]!
      parentTableName: String!
      parentColumnNames: [String]!
      create: Boolean
    ): Boolean!
    wbRemoveOrDeleteForeignKey(
      schemaName: String!
      tableName: String!
      columnNames: [String]!
      parentTableName: String!
      del: Boolean
    ): Boolean!
    wbSaveTableUserSettings(
      userEmail: String!
      schemaName: String!
      tableName: String!
      settings: JSON!
    ): Boolean!
  }
`;
exports.resolvers = {
    JSON: graphql_type_json_1.GraphQLJSON,
    Query: {
        wbTables: (_, { schemaName }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.tables(schemaName);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
        wbColumns: (_, { schemaName, tableName }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.columns(schemaName, tableName);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
        wbTableUser: (_, { schemaName, tableName, userEmail }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.tableUser(userEmail, schemaName, tableName);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
    },
    Mutation: {
        wbAddOrCreateTable: (_, { schemaName, tableName, tableLabel, create }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.addOrCreateTable(schemaName, tableName, tableLabel, create);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.success;
        }),
        wbUpdateTable: (_, { schemaName, tableName, newTableName, newTableLabel }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.updateTable(schemaName, tableName, newTableName, newTableLabel);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.success;
        }),
        wbAddAllExistingTables: (_, { schemaName }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.addAllExistingTables(schemaName);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.success;
        }),
        wbAddOrCreateColumn: (_, { schemaName, tableName, columnName, columnLabel, create, columnType }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.addOrCreateColumn(schemaName, tableName, columnName, columnLabel, create, columnType);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.success;
        }),
        wbCreateOrDeletePrimaryKey: (_, { schemaName, tableName, columnNames, del }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.createOrDeletePrimaryKey(schemaName, tableName, columnNames, del);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.success;
        }),
        wbAddOrCreateForeignKey: (_, { schemaName, tableName, columnNames, parentTableName, parentColumnNames, create, }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.addOrCreateForeignKey(schemaName, tableName, columnNames, parentTableName, parentColumnNames, create);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.success;
        }),
        wbRemoveOrDeleteForeignKey: (_, { schemaName, tableName, columnNames, parentTableName, parentColumnNames, del, }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.removeOrDeleteForeignKey(schemaName, tableName, columnNames, parentTableName, del);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.success;
        }),
        wbSaveTableUserSettings: (_, { schemaName, tableName, userEmail, settings }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.saveTableUserSettings(schemaName, tableName, userEmail, settings);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.success;
        }),
    },
};


/***/ }),

/***/ "./src/types/tenant.ts":
/*!*****************************!*\
  !*** ./src/types/tenant.ts ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.resolvers = exports.typeDefs = void 0;
const apollo_server_lambda_1 = __webpack_require__(/*! apollo-server-lambda */ "apollo-server-lambda");
exports.typeDefs = apollo_server_lambda_1.gql `
  type Tenant {
    id: ID!
    name: String!
    label: String!
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    wbTenants: [Tenant]
    wbTenantById(id: ID!): Tenant
    wbTenantByName(name: String!): Tenant
  }

  extend type Mutation {
    wbCreateTenant(name: String!, label: String!): Tenant
    wbUpdateTenant(id: ID!, name: String, label: String): Tenant
  }
`;
exports.resolvers = {
    Query: {
        wbTenants: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.tenants();
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
        wbTenantById: (_, { id }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.tenantById(id);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
        wbTenantByName: (_, { name }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.tenantByName(name);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
    },
    Mutation: {
        wbCreateTenant: (_, { name, label }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.createTenant(name, label);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
        wbUpdateTenant: (_, { id, name, label }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.updateTenant(id, name, label);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
    },
};


/***/ }),

/***/ "./src/types/user.ts":
/*!***************************!*\
  !*** ./src/types/user.ts ***!
  \***************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.resolvers = exports.typeDefs = void 0;
const apollo_server_lambda_1 = __webpack_require__(/*! apollo-server-lambda */ "apollo-server-lambda");
exports.typeDefs = apollo_server_lambda_1.gql `
  type User {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    wbUsersByTenantId(tenantId: ID!): [User]
    wbUserById(id: ID!): User
    wbUserByEmail(email: String!): User
  }

  extend type Mutation {
    wbCreateUser(email: String!, firstName: String, lastName: String): User
    wbUpdateUser(
      id: ID!
      email: String
      firstName: String
      lastName: String
    ): User
    """
    Tenant-User-Roles
    """
    wbAddUserToTenant(
      tenantName: String!
      userEmail: String!
      tenantRole: String!
    ): User
    """
    Schema-User-Roles
    """
    wbAddUserToSchema(
      schemaName: String!
      userEmail: String!
      schemaRole: String!
    ): User
  }
`;
exports.resolvers = {
    Query: {
        wbUsersByTenantId: (_, { tenantId }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.usersByTenantId(tenantId);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
        wbUserById: (_, { id }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.userById(id);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
        wbUserByEmail: (_, { email }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.userByEmail(email);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
    },
    Mutation: {
        wbCreateUser: (_, { email, firstName, lastName }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.createUser(email, firstName, lastName);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
        wbUpdateUser: (_, { id, email, firstName, lastName }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.updateUser(id, email, firstName, lastName);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
        wbAddUserToTenant: (_, { tenantName, userEmail, tenantRole }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.addUserToTenant(tenantName, userEmail, tenantRole);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
        wbAddUserToSchema: (_, { schemaName, userEmail, schemaRole }, context) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield context.wbCloud.addUserToSchema(schemaName, userEmail, schemaRole);
            if (!result.success)
                throw context.wbCloud.err(result);
            return result.payload;
        }),
    },
};


/***/ }),

/***/ "./src/whitebrick-cloud.ts":
/*!*********************************!*\
  !*** ./src/whitebrick-cloud.ts ***!
  \*********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.log = exports.graphqlHandler = void 0;
const apollo_server_lambda_1 = __webpack_require__(/*! apollo-server-lambda */ "apollo-server-lambda");
const tslog_1 = __webpack_require__(/*! tslog */ "tslog");
const dal_1 = __webpack_require__(/*! ./dal */ "./src/dal.ts");
const hasura_api_1 = __webpack_require__(/*! ./hasura-api */ "./src/hasura-api.ts");
const types_1 = __webpack_require__(/*! ./types */ "./src/types/index.ts");
const v = __webpack_require__(/*! voca */ "voca");
const entity_1 = __webpack_require__(/*! ./entity */ "./src/entity/index.ts");
exports.graphqlHandler = new apollo_server_lambda_1.ApolloServer({
    schema: types_1.schema,
    introspection: true,
    context: function () {
        return {
            wbCloud: new WhitebrickCloud(),
        };
    },
}).createHandler();
exports.log = new tslog_1.Logger({
    minLevel: "debug",
});
class WhitebrickCloud {
    constructor() {
        this.dal = new dal_1.DAL();
    }
    err(result) {
        if (result.success) {
            return new Error("WhitebrickCloud.err: result is not an error (success==true)");
        }
        let apolloError = "INTERNAL_SERVER_ERROR";
        if (result.apolloError)
            apolloError = result.apolloError;
        return new apollo_server_lambda_1.ApolloError(result.message, apolloError, {
            ref: result.code,
        });
    }
    addSchemaContext(schema) {
        schema.context = {
            defaultColumnTypes: entity_1.Column.COMMON_TYPES,
        };
        return schema;
    }
    resetTestData() {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.dal.schemas("test_%");
            if (!result.success)
                return result;
            for (const schema of result.payload) {
                result = yield this.removeOrDeleteSchema(schema.name, true);
                if (!result.success)
                    return result;
            }
            result = yield this.dal.deleteTestTenants();
            if (!result.success)
                return result;
            result = yield this.dal.deleteTestUsers();
            return result;
        });
    }
    tenants() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.tenants();
        });
    }
    tenantById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.tenantById(id);
        });
    }
    tenantByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.tenantByName(name);
        });
    }
    createTenant(name, label) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.createTenant(name, label);
        });
    }
    updateTenant(id, name, label) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.updateTenant(id, name, label);
        });
    }
    deleteTestTenants() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.deleteTestTenants();
        });
    }
    addUserToTenant(tenantName, userEmail, tenantRole) {
        return __awaiter(this, void 0, void 0, function* () {
            exports.log.debug(`whitebrickCloud.addUserToTenant: ${tenantName}, ${userEmail}, ${tenantRole}`);
            const userResult = yield this.dal.userByEmail(userEmail);
            if (!userResult.success)
                return userResult;
            const tenantResult = yield this.dal.tenantByName(tenantName);
            if (!tenantResult.success)
                return tenantResult;
            const roleResult = yield this.dal.roleByName(tenantRole);
            if (!roleResult.success)
                return roleResult;
            const result = yield this.dal.addUserToTenant(tenantResult.payload.id, userResult.payload.id, roleResult.payload.id);
            if (!result.success)
                return result;
            return userResult;
        });
    }
    usersByTenantId(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.usersByTenantId(tenantId);
        });
    }
    userById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.userById(id);
        });
    }
    userByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.userByEmail(email);
        });
    }
    createUser(email, firstName, lastName) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.createUser(email, firstName, lastName);
        });
    }
    updateUser(id, email, firstName, lastName) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.updateUser(id, email, firstName, lastName);
        });
    }
    roleByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.roleByName(name);
        });
    }
    createSchema(name, label, tenantOwnerId, tenantOwnerName, userOwnerId, userOwnerEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            exports.log.info(`
      wbCloud.createSchema name=${name},
      label=${label},
      tenantOwnerId=${tenantOwnerId},
      tenantOwnerName=${tenantOwnerName},
      userOwnerId=${userOwnerId},
      userOwnerEmail=${userOwnerEmail}
    `);
            let result;
            if (!tenantOwnerId && !userOwnerId) {
                if (tenantOwnerName) {
                    result = yield this.dal.tenantByName(tenantOwnerName);
                    if (!result.success)
                        return result;
                    tenantOwnerId = result.payload.id;
                }
                else if (userOwnerEmail) {
                    result = yield this.dal.userByEmail(userOwnerEmail);
                    if (!result.success)
                        return result;
                    userOwnerId = result.payload.id;
                }
                else {
                    return {
                        success: false,
                        message: "Owner could not be found",
                    };
                }
            }
            if (name.startsWith("pg_") || entity_1.Schema.SYS_SCHEMA_NAMES.includes(name)) {
                return {
                    success: false,
                    message: `Database name can not begin with 'pg_' or be in the reserved list: ${entity_1.Schema.SYS_SCHEMA_NAMES.join(", ")}`,
                };
            }
            return yield this.dal.createSchema(name, label, tenantOwnerId, userOwnerId);
        });
    }
    removeOrDeleteSchema(schemaName, del) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.dal.discoverTables(schemaName);
            if (!result.success)
                return result;
            for (const tableName of result.payload) {
                result = yield this.removeOrDeleteTable(schemaName, tableName, del);
                if (!result.success)
                    return result;
            }
            result = yield this.dal.removeAllUsersFromSchema(schemaName);
            if (!result.success)
                return result;
            return yield this.dal.removeOrDeleteSchema(schemaName, del);
        });
    }
    schemasByUserOwner(userEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.schemasByUserOwner(userEmail);
        });
    }
    addUserToSchema(schemaName, userEmail, schemaRole) {
        return __awaiter(this, void 0, void 0, function* () {
            const userResult = yield this.dal.userByEmail(userEmail);
            if (!userResult.success)
                return userResult;
            const schemaResult = yield this.dal.schemaByName(schemaName);
            if (!schemaResult.success)
                return schemaResult;
            const roleResult = yield this.dal.roleByName(schemaRole);
            if (!roleResult.success)
                return roleResult;
            const result = yield this.dal.addUserToSchema(schemaResult.payload.id, userResult.payload.id, roleResult.payload.id);
            if (!result.success)
                return result;
            return userResult;
        });
    }
    accessibleSchemas(userEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            const schemaOwnerResult = yield this.schemasByUserOwner(userEmail);
            if (!schemaOwnerResult.success)
                return schemaOwnerResult;
            const userRolesResult = yield this.dal.schemasByUser(userEmail);
            if (!userRolesResult.success)
                return userRolesResult;
            const schemas = [];
            for (const schema of schemaOwnerResult.payload.concat(userRolesResult.payload)) {
                schemas.push(this.addSchemaContext(schema));
            }
            return {
                success: true,
                payload: schemas,
            };
        });
    }
    tables(schemaName) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.dal.tables(schemaName);
            if (!result.success)
                return result;
            for (const table of result.payload) {
                const columnsResult = yield this.columns(schemaName, table.name);
                if (!columnsResult.success)
                    return columnsResult;
                table.columns = columnsResult.payload;
            }
            return result;
        });
    }
    columns(schemaName, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.dal.primaryKeys(schemaName, tableName);
            if (!result.success)
                return result;
            const pKColsConstraints = result.payload;
            const pKColumnNames = Object.keys(pKColsConstraints);
            result = yield this.dal.columns(schemaName, tableName);
            if (!result.success)
                return result;
            for (const column of result.payload) {
                column.isPrimaryKey = pKColumnNames.includes(column.name);
                const foreignKeysResult = yield this.dal.foreignKeysOrReferences(schemaName, tableName, column.name, "FOREIGN_KEYS");
                if (!foreignKeysResult.success)
                    return result;
                column.foreignKeys = foreignKeysResult.payload;
                const referencesResult = yield this.dal.foreignKeysOrReferences(schemaName, tableName, column.name, "REFERENCES");
                if (!referencesResult.success)
                    return result;
                column.referencedBy = referencesResult.payload;
            }
            return result;
        });
    }
    addOrCreateTable(schemaName, tableName, tableLabel, create) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!create)
                create = false;
            let result = yield this.dal.addOrCreateTable(schemaName, tableName, tableLabel, create);
            if (!result.success)
                return result;
            return yield hasura_api_1.hasuraApi.trackTable(schemaName, tableName);
        });
    }
    removeOrDeleteTable(schemaName, tableName, del) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!del)
                del = false;
            let result = yield hasura_api_1.hasuraApi.untrackTable(schemaName, tableName);
            if (!result.success)
                return result;
            result = yield this.dal.columns(schemaName, tableName);
            if (!result.success)
                return result;
            const columns = result.payload;
            for (const column of columns) {
                result = yield this.removeOrDeleteColumn(schemaName, tableName, column.name, del);
                if (!result.success)
                    return result;
            }
            result = yield this.dal.removeTableUsers(schemaName, tableName);
            if (!result.success)
                return result;
            return yield this.dal.removeOrDeleteTable(schemaName, tableName, del);
        });
    }
    removeOrDeleteColumn(schemaName, tableName, columnName, del) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!del)
                del = false;
            return yield this.dal.removeOrDeleteColumn(schemaName, tableName, columnName, del);
        });
    }
    updateTable(schemaName, tableName, newTableName, newTableLabel) {
        return __awaiter(this, void 0, void 0, function* () {
            let result;
            if (newTableName) {
                result = yield this.tables(schemaName);
                if (!result.success)
                    return result;
                const existingTableNames = result.payload.map((table) => table.name);
                if (existingTableNames.includes(newTableName)) {
                    return {
                        success: false,
                        message: "The new table name must be unique",
                        code: "WB_TABLE_NAME_EXISTS",
                        apolloError: "BAD_USER_INPUT",
                    };
                }
                result = yield hasura_api_1.hasuraApi.untrackTable(schemaName, tableName);
                if (!result.success)
                    return result;
            }
            result = yield this.dal.updateTable(schemaName, tableName, newTableName, newTableLabel);
            if (!result.success)
                return result;
            if (newTableName) {
                result = yield hasura_api_1.hasuraApi.trackTable(schemaName, newTableName);
                if (!result.success)
                    return result;
            }
            return result;
        });
    }
    addAllExistingTables(schemaName) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.dal.discoverTables(schemaName);
            if (!result.success)
                return result;
            const tableNames = result.payload;
            for (const tableName of tableNames) {
                result = yield this.addOrCreateTable(schemaName, tableName, v.titleCase(tableName.replaceAll("_", " ")), false);
                if (!result.success)
                    return result;
                result = yield this.dal.discoverColumns(schemaName, tableName);
                if (!result.success)
                    return result;
                const columns = result.payload;
                for (const column of columns) {
                    result = yield this.addOrCreateColumn(schemaName, tableName, column.name, v.titleCase(column.name.replaceAll("_", " ")), false);
                    if (!result.success)
                        return result;
                }
            }
            return result;
        });
    }
    addAllExistingRelationships(schemaName) {
        return __awaiter(this, void 0, void 0, function* () {
            exports.log.warn("********** All existing relationships:");
            let result = yield this.dal.foreignKeysOrReferences(schemaName, "%", "%", "ALL");
            if (!result.success)
                return result;
            const relationships = result.payload;
            if (relationships.length > 0) {
                for (const relationship of relationships) {
                    exports.log.warn(JSON.stringify(relationship));
                }
            }
            return result;
        });
    }
    addOrCreateColumn(schemaName, tableName, columnName, columnLabel, create, columnType) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!create)
                create = false;
            let result = yield this.dal.addOrCreateColumn(schemaName, tableName, columnName, columnLabel, create, columnType);
            if (!result.success)
                return result;
            if (create) {
                result = yield hasura_api_1.hasuraApi.untrackTable(schemaName, tableName);
                if (!result.success)
                    return result;
                result = yield hasura_api_1.hasuraApi.trackTable(schemaName, tableName);
            }
            return result;
        });
    }
    createOrDeletePrimaryKey(schemaName, tableName, columnNames, del) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!del)
                del = false;
            let result = yield this.dal.primaryKeys(schemaName, tableName);
            if (!result.success)
                return result;
            const existingConstraintNames = Object.values(result.payload);
            if (del) {
                if (existingConstraintNames.length > 0) {
                    result = yield this.dal.deleteConstraint(schemaName, tableName, existingConstraintNames[0]);
                }
            }
            else {
                if (existingConstraintNames.length > 0) {
                    return {
                        success: false,
                        message: "Remove existing primary key first",
                        code: "WB_PK_EXISTS",
                        apolloError: "BAD_USER_INPUT",
                    };
                }
                result = yield hasura_api_1.hasuraApi.untrackTable(schemaName, tableName);
                if (!result.success)
                    return result;
                result = yield this.dal.createPrimaryKey(schemaName, tableName, columnNames);
                if (!result.success)
                    return result;
                result = yield hasura_api_1.hasuraApi.trackTable(schemaName, tableName);
            }
            return result;
        });
    }
    addOrCreateForeignKey(schemaName, tableName, columnNames, parentTableName, parentColumnNames, create) {
        return __awaiter(this, void 0, void 0, function* () {
            let operation = "CREATE";
            if (!create)
                operation = "ADD";
            return yield this.setForeignKey(schemaName, tableName, columnNames, parentTableName, parentColumnNames, operation);
        });
    }
    removeOrDeleteForeignKey(schemaName, tableName, columnNames, parentTableName, del) {
        return __awaiter(this, void 0, void 0, function* () {
            let operation = "DELETE";
            if (!del)
                operation = "REMOVE";
            return yield this.setForeignKey(schemaName, tableName, columnNames, parentTableName, [], operation);
        });
    }
    setForeignKey(schemaName, tableName, columnNames, parentTableName, parentColumnNames, operation) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.dal.foreignKeysOrReferences(schemaName, tableName, columnNames[0], "FOREIGN_KEYS");
            if (!result.success)
                return result;
            const existingForeignKeys = {};
            for (const constraintId of result.payload) {
                existingForeignKeys[constraintId.columnName] =
                    constraintId.constraintName;
            }
            for (const columnName of columnNames) {
                if (Object.keys(existingForeignKeys).includes(columnName)) {
                    if (operation == "REMOVE" || operation == "DELETE") {
                        result = yield hasura_api_1.hasuraApi.dropRelationships(schemaName, tableName, parentTableName);
                        if (result.success && operation == "DELETE") {
                            result = yield this.dal.deleteConstraint(schemaName, tableName, existingForeignKeys[columnName]);
                        }
                        return result;
                    }
                    else {
                        return {
                            success: false,
                            message: `Remove existing foreign key on ${columnName} first`,
                            code: "WB_FK_EXISTS",
                            apolloError: "BAD_USER_INPUT",
                        };
                    }
                }
            }
            if (operation == "ADD" || operation == "CREATE") {
                if (operation == "CREATE") {
                    result = yield this.dal.createForeignKey(schemaName, tableName, columnNames, parentTableName, parentColumnNames);
                    if (!result.success)
                        return result;
                }
                result = yield hasura_api_1.hasuraApi.createObjectRelationship(schemaName, tableName, columnNames[0], parentTableName);
                if (!result.success)
                    return result;
                result = yield hasura_api_1.hasuraApi.createArrayRelationship(schemaName, parentTableName, tableName, columnNames);
                if (!result.success)
                    return result;
            }
            return result;
        });
    }
    tableUser(userEmail, schemaName, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dal.tableUser(userEmail, schemaName, tableName);
        });
    }
    saveTableUserSettings(schemaName, tableName, userEmail, settings) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableResult = yield this.dal.tableBySchemaNameTableName(schemaName, tableName);
            if (!tableResult.success)
                return tableResult;
            const userResult = yield this.dal.userByEmail(userEmail);
            if (!userResult.success)
                return userResult;
            const roleResult = yield this.dal.roleByName("table_inherit");
            if (!roleResult.success)
                return roleResult;
            return this.dal.saveTableUserSettings(tableResult.payload.id, userResult.payload.id, roleResult.payload.id, settings);
        });
    }
}


/***/ }),

/***/ "apollo-server-lambda":
/*!***************************************!*\
  !*** external "apollo-server-lambda" ***!
  \***************************************/
/***/ ((module) => {

module.exports = require("apollo-server-lambda");;

/***/ }),

/***/ "axios":
/*!************************!*\
  !*** external "axios" ***!
  \************************/
/***/ ((module) => {

module.exports = require("axios");;

/***/ }),

/***/ "graphql-constraint-directive":
/*!***********************************************!*\
  !*** external "graphql-constraint-directive" ***!
  \***********************************************/
/***/ ((module) => {

module.exports = require("graphql-constraint-directive");;

/***/ }),

/***/ "graphql-tools":
/*!********************************!*\
  !*** external "graphql-tools" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("graphql-tools");;

/***/ }),

/***/ "graphql-type-json":
/*!************************************!*\
  !*** external "graphql-type-json" ***!
  \************************************/
/***/ ((module) => {

module.exports = require("graphql-type-json");;

/***/ }),

/***/ "lodash":
/*!*************************!*\
  !*** external "lodash" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("lodash");;

/***/ }),

/***/ "pg":
/*!*********************!*\
  !*** external "pg" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("pg");;

/***/ }),

/***/ "tslog":
/*!************************!*\
  !*** external "tslog" ***!
  \************************/
/***/ ((module) => {

module.exports = require("tslog");;

/***/ }),

/***/ "voca":
/*!***********************!*\
  !*** external "voca" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("voca");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/whitebrick-cloud.ts");
/******/ 	var __webpack_export_target__ = exports;
/******/ 	for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
/******/ 	if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3JjL3doaXRlYnJpY2stY2xvdWQuanMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93aGl0ZWJyaWNrLWNsb3VkLy4vc3JjL2RhbC50cyIsIndlYnBhY2s6Ly93aGl0ZWJyaWNrLWNsb3VkLy4vc3JjL2VudGl0eS9Db2x1bW4udHMiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC8uL3NyYy9lbnRpdHkvUm9sZS50cyIsIndlYnBhY2s6Ly93aGl0ZWJyaWNrLWNsb3VkLy4vc3JjL2VudGl0eS9TY2hlbWEudHMiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC8uL3NyYy9lbnRpdHkvVGFibGUudHMiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC8uL3NyYy9lbnRpdHkvVGFibGVVc2VyLnRzIiwid2VicGFjazovL3doaXRlYnJpY2stY2xvdWQvLi9zcmMvZW50aXR5L1RlbmFudC50cyIsIndlYnBhY2s6Ly93aGl0ZWJyaWNrLWNsb3VkLy4vc3JjL2VudGl0eS9Vc2VyLnRzIiwid2VicGFjazovL3doaXRlYnJpY2stY2xvdWQvLi9zcmMvZW50aXR5L2luZGV4LnRzIiwid2VicGFjazovL3doaXRlYnJpY2stY2xvdWQvLi9zcmMvZW52aXJvbm1lbnQudHMiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC8uL3NyYy9oYXN1cmEtYXBpLnRzIiwid2VicGFjazovL3doaXRlYnJpY2stY2xvdWQvLi9zcmMvdHlwZXMvaW5kZXgudHMiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC8uL3NyYy90eXBlcy9zY2hlbWEudHMiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC8uL3NyYy90eXBlcy90YWJsZS50cyIsIndlYnBhY2s6Ly93aGl0ZWJyaWNrLWNsb3VkLy4vc3JjL3R5cGVzL3RlbmFudC50cyIsIndlYnBhY2s6Ly93aGl0ZWJyaWNrLWNsb3VkLy4vc3JjL3R5cGVzL3VzZXIudHMiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC8uL3NyYy93aGl0ZWJyaWNrLWNsb3VkLnRzIiwid2VicGFjazovL3doaXRlYnJpY2stY2xvdWQvZXh0ZXJuYWwgXCJhcG9sbG8tc2VydmVyLWxhbWJkYVwiIiwid2VicGFjazovL3doaXRlYnJpY2stY2xvdWQvZXh0ZXJuYWwgXCJheGlvc1wiIiwid2VicGFjazovL3doaXRlYnJpY2stY2xvdWQvZXh0ZXJuYWwgXCJncmFwaHFsLWNvbnN0cmFpbnQtZGlyZWN0aXZlXCIiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC9leHRlcm5hbCBcImdyYXBocWwtdG9vbHNcIiIsIndlYnBhY2s6Ly93aGl0ZWJyaWNrLWNsb3VkL2V4dGVybmFsIFwiZ3JhcGhxbC10eXBlLWpzb25cIiIsIndlYnBhY2s6Ly93aGl0ZWJyaWNrLWNsb3VkL2V4dGVybmFsIFwibG9kYXNoXCIiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC9leHRlcm5hbCBcInBnXCIiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC9leHRlcm5hbCBcInRzbG9nXCIiLCJ3ZWJwYWNrOi8vd2hpdGVicmljay1jbG91ZC9leHRlcm5hbCBcInZvY2FcIiIsIndlYnBhY2s6Ly93aGl0ZWJyaWNrLWNsb3VkL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3doaXRlYnJpY2stY2xvdWQvd2VicGFjay9zdGFydHVwIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGVudmlyb25tZW50IH0gZnJvbSBcIi4vZW52aXJvbm1lbnRcIjtcbmltcG9ydCB7IGxvZyB9IGZyb20gXCIuL3doaXRlYnJpY2stY2xvdWRcIjtcbmltcG9ydCB7IFBvb2wgfSBmcm9tIFwicGdcIjtcbmltcG9ydCB7IFRlbmFudCwgVXNlciwgUm9sZSwgU2NoZW1hLCBUYWJsZSwgQ29sdW1uLCBUYWJsZVVzZXIgfSBmcm9tIFwiLi9lbnRpdHlcIjtcbmltcG9ydCB7IENvbnN0cmFpbnRJZCwgUXVlcnlQYXJhbXMsIFNlcnZpY2VSZXN1bHQgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgREFMIHtcbiAgcHJpdmF0ZSBwb29sOiBQb29sO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMucG9vbCA9IG5ldyBQb29sKHtcbiAgICAgIGRhdGFiYXNlOiBlbnZpcm9ubWVudC5kYk5hbWUsXG4gICAgICBob3N0OiBlbnZpcm9ubWVudC5kYkhvc3QsXG4gICAgICBwb3J0OiBlbnZpcm9ubWVudC5kYlBvcnQsXG4gICAgICB1c2VyOiBlbnZpcm9ubWVudC5kYlVzZXIsXG4gICAgICBwYXNzd29yZDogZW52aXJvbm1lbnQuZGJQYXNzd29yZCxcbiAgICAgIG1heDogZW52aXJvbm1lbnQuZGJQb29sTWF4LFxuICAgICAgaWRsZVRpbWVvdXRNaWxsaXM6IGVudmlyb25tZW50LmRiUG9vbENvbm5lY3Rpb25UaW1lb3V0TWlsbGlzLFxuICAgICAgY29ubmVjdGlvblRpbWVvdXRNaWxsaXM6IGVudmlyb25tZW50LmRiUG9vbENvbm5lY3Rpb25UaW1lb3V0TWlsbGlzLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gdXNlZCBmb3IgRERMIGlkZW50aWZpZXJzIChlZyBDUkVBVEUgVEFCTEUgc2FuaXRpemUodGFibGVOYW1lKSlcbiAgcHVibGljIHN0YXRpYyBzYW5pdGl6ZShzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bXlxcdyVdKy9nLCBcIlwiKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVF1ZXJ5KHF1ZXJ5UGFyYW1zOiBRdWVyeVBhcmFtcyk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyaWVzKFtxdWVyeVBhcmFtc10pO1xuICAgIHJldHVybiByZXN1bHRzWzBdO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlUXVlcmllcyhcbiAgICBxdWVyaWVzQW5kUGFyYW1zOiBBcnJheTxRdWVyeVBhcmFtcz5cbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0W10+IHtcbiAgICBjb25zdCBjbGllbnQgPSBhd2FpdCB0aGlzLnBvb2wuY29ubmVjdCgpO1xuICAgIGNvbnN0IHJlc3VsdHM6IEFycmF5PFNlcnZpY2VSZXN1bHQ+ID0gW107XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNsaWVudC5xdWVyeShcIkJFR0lOXCIpO1xuICAgICAgZm9yIChjb25zdCBxdWVyeVBhcmFtcyBvZiBxdWVyaWVzQW5kUGFyYW1zKSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhcbiAgICAgICAgICBgZGFsLmV4ZWN1dGVRdWVyeSBRdWVyeVBhcmFtczogJHtxdWVyeVBhcmFtcy5xdWVyeX1gLFxuICAgICAgICAgIHF1ZXJ5UGFyYW1zLnBhcmFtc1xuICAgICAgICApO1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNsaWVudC5xdWVyeShcbiAgICAgICAgICBxdWVyeVBhcmFtcy5xdWVyeSxcbiAgICAgICAgICBxdWVyeVBhcmFtcy5wYXJhbXNcbiAgICAgICAgKTtcbiAgICAgICAgcmVzdWx0cy5wdXNoKDxTZXJ2aWNlUmVzdWx0PntcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgIHBheWxvYWQ6IHJlc3BvbnNlLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGNsaWVudC5xdWVyeShcIkNPTU1JVFwiKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgYXdhaXQgY2xpZW50LnF1ZXJ5KFwiUk9MTEJBQ0tcIik7XG4gICAgICBsb2cuZXJyb3IoSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgIHJlc3VsdHMucHVzaCg8U2VydmljZVJlc3VsdD57XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICBjb2RlOiBcIlBHX1wiICsgZXJyb3IuY29kZSxcbiAgICAgIH0pO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBjbGllbnQucmVsZWFzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIC8qKlxuICAgKiBUZW5hbnRzXG4gICAqL1xuXG4gIHB1YmxpYyBhc3luYyB0ZW5hbnRzKCk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBgXG4gICAgICAgIFNFTEVDVCB3Yi50ZW5hbnRzLipcbiAgICAgICAgRlJPTSB3Yi50ZW5hbnRzXG4gICAgICBgLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2VzcykgcmVzdWx0LnBheWxvYWQgPSBUZW5hbnQucGFyc2VSZXN1bHQocmVzdWx0LnBheWxvYWQpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgdGVuYW50QnlJZChpZDogbnVtYmVyKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcnkoe1xuICAgICAgcXVlcnk6IGBcbiAgICAgICAgU0VMRUNUIHdiLnRlbmFudHMuKlxuICAgICAgICBGUk9NIHdiLnRlbmFudHNcbiAgICAgICAgV0hFUkUgaWQ9JDEgTElNSVQgMVxuICAgICAgYCxcbiAgICAgIHBhcmFtczogW2lkXSxcbiAgICB9KTtcbiAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHJlc3VsdC5wYXlsb2FkID0gVGVuYW50LnBhcnNlUmVzdWx0KHJlc3VsdC5wYXlsb2FkKVswXTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHRlbmFudEJ5TmFtZShuYW1lOiBzdHJpbmcpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBTRUxFQ1Qgd2IudGVuYW50cy4qXG4gICAgICAgIEZST00gd2IudGVuYW50c1xuICAgICAgICBXSEVSRSBuYW1lPSQxIExJTUlUIDFcbiAgICAgIGAsXG4gICAgICBwYXJhbXM6IFtuYW1lXSxcbiAgICB9KTtcbiAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgIHJlc3VsdC5wYXlsb2FkID0gVGVuYW50LnBhcnNlUmVzdWx0KHJlc3VsdC5wYXlsb2FkKTtcbiAgICAgIGlmIChyZXN1bHQucGF5bG9hZC5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm4gPFNlcnZpY2VSZXN1bHQ+e1xuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6IGBDb3VsZCBub3QgZmluZCB0ZW5hbnQgd2hlcmUgbmFtZT0ke25hbWV9YCxcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdC5wYXlsb2FkID0gcmVzdWx0LnBheWxvYWRbMF07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgY3JlYXRlVGVuYW50KFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBsYWJlbDogc3RyaW5nXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBgXG4gICAgICAgIElOU0VSVCBJTlRPIHdiLnRlbmFudHMoXG4gICAgICAgICAgbmFtZSwgbGFiZWwsIGNyZWF0ZWRfYXQsIHVwZGF0ZWRfYXRcbiAgICAgICAgKSBWQUxVRVMoJDEsICQyLCAkMywgJDQpXG4gICAgICAgIFJFVFVSTklORyAqXG4gICAgICBgLFxuICAgICAgcGFyYW1zOiBbbmFtZSwgbGFiZWwsIG5ldyBEYXRlKCksIG5ldyBEYXRlKCldLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2VzcykgcmVzdWx0LnBheWxvYWQgPSBUZW5hbnQucGFyc2VSZXN1bHQocmVzdWx0LnBheWxvYWQpWzBdO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgdXBkYXRlVGVuYW50KFxuICAgIGlkOiBudW1iZXIsXG4gICAgbmFtZTogc3RyaW5nIHwgbnVsbCxcbiAgICBsYWJlbDogc3RyaW5nIHwgbnVsbFxuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBpZiAobmFtZSA9PSBudWxsICYmIGxhYmVsID09IG51bGwpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBtZXNzYWdlOiBcInVwZGF0ZVRlbmFudDogYWxsIHBhcmFtZXRlcnMgYXJlIG51bGxcIixcbiAgICAgIH07XG4gICAgfVxuICAgIGxldCBwYXJhbUNvdW50ID0gMztcbiAgICBjb25zdCBwYXJhbXM6IChudW1iZXIgfCBEYXRlIHwgc3RyaW5nIHwgbnVsbClbXSA9IFtuZXcgRGF0ZSgpLCBpZF07XG4gICAgbGV0IHF1ZXJ5ID0gXCJVUERBVEUgd2IudGVuYW50cyBTRVQgXCI7XG4gICAgaWYgKG5hbWUgIT0gbnVsbCkgcXVlcnkgKz0gYG5hbWU9JCR7cGFyYW1Db3VudH0sIGA7XG4gICAgcGFyYW1zLnB1c2gobmFtZSk7XG4gICAgcGFyYW1Db3VudCsrO1xuICAgIGlmIChsYWJlbCAhPSBudWxsKSBxdWVyeSArPSBgbGFiZWw9JCR7cGFyYW1Db3VudH0sIGA7XG4gICAgcGFyYW1zLnB1c2gobGFiZWwpO1xuICAgIHBhcmFtQ291bnQrKztcbiAgICBxdWVyeSArPSBcInVwZGF0ZWRfYXQ9JDEgV0hFUkUgaWQ9JDIgUkVUVVJOSU5HICpcIjtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogcXVlcnksXG4gICAgICBwYXJhbXM6IFtuZXcgRGF0ZSgpLCBpZF0sXG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdC5zdWNjZXNzKSByZXN1bHQucGF5bG9hZCA9IFRlbmFudC5wYXJzZVJlc3VsdChyZXN1bHQucGF5bG9hZClbMF07XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBkZWxldGVUZXN0VGVuYW50cygpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcmllcyhbXG4gICAgICB7XG4gICAgICAgIHF1ZXJ5OiBgXG4gICAgICAgICAgREVMRVRFIEZST00gd2IudGVuYW50X3VzZXJzXG4gICAgICAgICAgV0hFUkUgdGVuYW50X2lkIElOIChcbiAgICAgICAgICAgIFNFTEVDVCBpZCBGUk9NIHdiLnRlbmFudHMgV0hFUkUgbmFtZSBsaWtlICd0ZXN0XyUnXG4gICAgICAgICAgKVxuICAgICAgICBgLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcXVlcnk6IGBcbiAgICAgICAgICBERUxFVEUgRlJPTSB3Yi50ZW5hbnRzIFdIRVJFIG5hbWUgbGlrZSAndGVzdF8lJ1xuICAgICAgICBgLFxuICAgICAgfSxcbiAgICBdKTtcbiAgICByZXR1cm4gcmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlbmFudC1Vc2VyLVJvbGVzXG4gICAqL1xuXG4gIHB1YmxpYyBhc3luYyBhZGRVc2VyVG9UZW5hbnQoXG4gICAgdGVuYW50SWQ6IG51bWJlcixcbiAgICB1c2VySWQ6IG51bWJlcixcbiAgICB0ZW5hbnRSb2xlSWQ6IG51bWJlclxuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBJTlNFUlQgSU5UTyB3Yi50ZW5hbnRfdXNlcnMoXG4gICAgICAgICAgdGVuYW50X2lkLCB1c2VyX2lkLCByb2xlX2lkLCBjcmVhdGVkX2F0LCB1cGRhdGVkX2F0XG4gICAgICAgICkgVkFMVUVTKCQxLCAkMiwgJDMsICQ0LCAkNSlcbiAgICAgIGAsXG4gICAgICBwYXJhbXM6IFt0ZW5hbnRJZCwgdXNlcklkLCB0ZW5hbnRSb2xlSWQsIG5ldyBEYXRlKCksIG5ldyBEYXRlKCldLFxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVtb3ZlVXNlckZyb21UZW5hbnQoXG4gICAgdGVuYW50SWQ6IG51bWJlcixcbiAgICB1c2VySWQ6IG51bWJlcixcbiAgICB0ZW5hbnRSb2xlSWQ/OiBudW1iZXJcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgbGV0IHF1ZXJ5ID0gYFxuICAgICAgREVMRVRFIEZST00gd2IudGVuYW50X3VzZXJzXG4gICAgICBXSEVSRSB0ZW5hbnRfaWQ9JDEgQU5EIHVzZXJfaWQ9JDJcbiAgICBgO1xuICAgIGNvbnN0IHBhcmFtczogKG51bWJlciB8IHVuZGVmaW5lZClbXSA9IFt0ZW5hbnRJZCwgdXNlcklkXTtcbiAgICBpZiAodGVuYW50Um9sZUlkKSBxdWVyeSArPSBcIiBBTkQgcm9sZV9pZD0kM1wiO1xuICAgIHBhcmFtcy5wdXNoKHRlbmFudFJvbGVJZCk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcnkoe1xuICAgICAgcXVlcnk6IHF1ZXJ5LFxuICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2Vyc1xuICAgKi9cblxuICBwdWJsaWMgYXN5bmMgdXNlcnNCeVRlbmFudElkKHRlbmFudElkOiBudW1iZXIpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBTRUxFQ1Qgd2IudXNlcnMuKlxuICAgICAgICBGUk9NIHdiLnVzZXJzXG4gICAgICAgIFdIRVJFIHRlbmFudF9pZD0kMVxuICAgICAgYCxcbiAgICAgIHBhcmFtczogW3RlbmFudElkXSxcbiAgICB9KTtcbiAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHJlc3VsdC5wYXlsb2FkID0gVXNlci5wYXJzZVJlc3VsdChyZXN1bHQucGF5bG9hZCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB1c2VyQnlJZChpZDogbnVtYmVyKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcnkoe1xuICAgICAgcXVlcnk6IGBcbiAgICAgICAgU0VMRUNUIHdiLnVzZXJzLipcbiAgICAgICAgRlJPTSB3Yi51c2Vyc1xuICAgICAgICBXSEVSRSBpZD0kMSBMSU1JVCAxXG4gICAgICBgLFxuICAgICAgcGFyYW1zOiBbaWRdLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2VzcykgcmVzdWx0LnBheWxvYWQgPSBVc2VyLnBhcnNlUmVzdWx0KHJlc3VsdC5wYXlsb2FkKVswXTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHVzZXJCeUVtYWlsKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBTRUxFQ1QgKiBGUk9NIHdiLnVzZXJzXG4gICAgICAgIFdIRVJFIGVtYWlsPSQxIExJTUlUIDFcbiAgICAgIGAsXG4gICAgICBwYXJhbXM6IFtlbWFpbF0sXG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdC5zdWNjZXNzKSByZXN1bHQucGF5bG9hZCA9IFVzZXIucGFyc2VSZXN1bHQocmVzdWx0LnBheWxvYWQpWzBdO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgY3JlYXRlVXNlcihcbiAgICBlbWFpbDogc3RyaW5nLFxuICAgIGZpcnN0TmFtZTogc3RyaW5nLFxuICAgIGxhc3ROYW1lOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcnkoe1xuICAgICAgcXVlcnk6IGBcbiAgICAgICAgSU5TRVJUIElOVE8gd2IudXNlcnMoXG4gICAgICAgICAgZW1haWwsIGZpcnN0X25hbWUsIGxhc3RfbmFtZSwgY3JlYXRlZF9hdCwgdXBkYXRlZF9hdFxuICAgICAgICApIFZBTFVFUygkMSwgJDIsICQzLCAkNCwgJDUpIFJFVFVSTklORyAqXG4gICAgICBgLFxuICAgICAgcGFyYW1zOiBbZW1haWwsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIG5ldyBEYXRlKCksIG5ldyBEYXRlKCldLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2VzcykgcmVzdWx0LnBheWxvYWQgPSBVc2VyLnBhcnNlUmVzdWx0KHJlc3VsdC5wYXlsb2FkKVswXTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHVwZGF0ZVVzZXIoXG4gICAgaWQ6IG51bWJlcixcbiAgICBlbWFpbDogc3RyaW5nIHwgbnVsbCxcbiAgICBmaXJzdE5hbWU6IHN0cmluZyB8IG51bGwsXG4gICAgbGFzdE5hbWU6IHN0cmluZyB8IG51bGxcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgaWYgKGVtYWlsID09IG51bGwgJiYgZmlyc3ROYW1lID09IG51bGwgJiYgbGFzdE5hbWUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwidXBkYXRlVXNlcjogYWxsIHBhcmFtZXRlcnMgYXJlIG51bGxcIiB9O1xuICAgIH1cbiAgICBsZXQgcGFyYW1Db3VudCA9IDM7XG4gICAgY29uc3QgcGFyYW1zOiAoRGF0ZSB8IG51bWJlciB8IHN0cmluZyB8IG51bGwpW10gPSBbbmV3IERhdGUoKSwgaWRdO1xuICAgIGxldCBxdWVyeSA9IFwiVVBEQVRFIHdiLnVzZXJzIFNFVCBcIjtcbiAgICBpZiAoZW1haWwgIT0gbnVsbCkgcXVlcnkgKz0gYGVtYWlsPSQke3BhcmFtQ291bnR9LCBgO1xuICAgIHBhcmFtcy5wdXNoKGVtYWlsKTtcbiAgICBwYXJhbUNvdW50Kys7XG4gICAgaWYgKGZpcnN0TmFtZSAhPSBudWxsKSBxdWVyeSArPSBgZmlyc3RfbmFtZT0kJHtwYXJhbUNvdW50fSwgYDtcbiAgICBwYXJhbXMucHVzaChmaXJzdE5hbWUpO1xuICAgIHBhcmFtQ291bnQrKztcbiAgICBpZiAobGFzdE5hbWUgIT0gbnVsbCkgcXVlcnkgKz0gYGxhc3RfbmFtZT0kJHtwYXJhbUNvdW50fSwgYDtcbiAgICBwYXJhbXMucHVzaChsYXN0TmFtZSk7XG4gICAgcGFyYW1Db3VudCsrO1xuICAgIHF1ZXJ5ICs9IFwidXBkYXRlZF9hdD0kMSBXSEVSRSBpZD0kMiBSRVRVUk5JTkcgKlwiO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2VzcykgcmVzdWx0LnBheWxvYWQgPSBVc2VyLnBhcnNlUmVzdWx0KHJlc3VsdC5wYXlsb2FkKVswXTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGRlbGV0ZVRlc3RVc2VycygpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBERUxFVEUgRlJPTSB3Yi51c2Vyc1xuICAgICAgICBXSEVSRSBlbWFpbCBsaWtlICd0ZXN0XyV0ZXN0LndoaXRlYnJpY2suY29tJ1xuICAgICAgYCxcbiAgICAgIHBhcmFtczogW10sXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSb2xlc1xuICAgKi9cblxuICBwdWJsaWMgYXN5bmMgcm9sZUJ5TmFtZShuYW1lOiBzdHJpbmcpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBTRUxFQ1Qgd2Iucm9sZXMuKlxuICAgICAgICBGUk9NIHdiLnJvbGVzXG4gICAgICAgIFdIRVJFIG5hbWU9JDEgTElNSVQgMVxuICAgICAgYCxcbiAgICAgIHBhcmFtczogW25hbWVdLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2VzcykgcmVzdWx0LnBheWxvYWQgPSBSb2xlLnBhcnNlUmVzdWx0KHJlc3VsdC5wYXlsb2FkKVswXTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFNjaGVtYXNcbiAgICovXG5cbiAgcHVibGljIGFzeW5jIGNyZWF0ZVNjaGVtYShcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgbGFiZWw6IHN0cmluZyxcbiAgICB0ZW5hbnRPd25lcklkOiBudW1iZXIgfCBudWxsLFxuICAgIHVzZXJPd25lcklkOiBudW1iZXIgfCBudWxsXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyaWVzKFtcbiAgICAgIHtcbiAgICAgICAgcXVlcnk6IGBDUkVBVEUgU0NIRU1BICR7REFMLnNhbml0aXplKG5hbWUpfWAsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBxdWVyeTogYFxuICAgICAgICAgIElOU0VSVCBJTlRPIHdiLnNjaGVtYXMoXG4gICAgICAgICAgICBuYW1lLCBsYWJlbCwgdGVuYW50X293bmVyX2lkLCB1c2VyX293bmVyX2lkLCBjcmVhdGVkX2F0LCB1cGRhdGVkX2F0XG4gICAgICAgICAgKSBWQUxVRVMoJDEsICQyLCAkMywgJDQsICQ1LCAkNikgUkVUVVJOSU5HICpcbiAgICAgICAgYCxcbiAgICAgICAgcGFyYW1zOiBbXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICBsYWJlbCxcbiAgICAgICAgICB0ZW5hbnRPd25lcklkLFxuICAgICAgICAgIHVzZXJPd25lcklkLFxuICAgICAgICAgIG5ldyBEYXRlKCksXG4gICAgICAgICAgbmV3IERhdGUoKSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXSk7XG4gICAgY29uc3QgaW5zZXJ0UmVzdWx0OiBTZXJ2aWNlUmVzdWx0ID0gcmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdO1xuICAgIGlmIChpbnNlcnRSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgaW5zZXJ0UmVzdWx0LnBheWxvYWQgPSBTY2hlbWEucGFyc2VSZXN1bHQoaW5zZXJ0UmVzdWx0LnBheWxvYWQpWzBdO1xuICAgIH1cbiAgICByZXR1cm4gaW5zZXJ0UmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHNjaGVtYXMoc2NoZW1hTmFtZVBhdHRlcm4/OiBzdHJpbmcpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBpZiAoIXNjaGVtYU5hbWVQYXR0ZXJuKSBzY2hlbWFOYW1lUGF0dGVybiA9IFwiJVwiO1xuICAgIHNjaGVtYU5hbWVQYXR0ZXJuID0gREFMLnNhbml0aXplKHNjaGVtYU5hbWVQYXR0ZXJuKTtcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcmllcyhbXG4gICAgICB7XG4gICAgICAgIHF1ZXJ5OiBgXG4gICAgICAgICAgU0VMRUNUIGluZm9ybWF0aW9uX3NjaGVtYS5zY2hlbWF0YS4qXG4gICAgICAgICAgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEuc2NoZW1hdGFcbiAgICAgICAgICBXSEVSRSBzY2hlbWFfbmFtZSBMSUtFICQxXG4gICAgICAgICAgQU5EIHNjaGVtYV9uYW1lIE5PVCBMSUtFICdwZ18lJ1xuICAgICAgICAgIEFORCBzY2hlbWFfbmFtZSBOT1QgSU4gKCcke1NjaGVtYS5TWVNfU0NIRU1BX05BTUVTLmpvaW4oXCInLCdcIil9JylcbiAgICAgICAgYCxcbiAgICAgICAgcGFyYW1zOiBbc2NoZW1hTmFtZVBhdHRlcm5dLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcXVlcnk6IGBcbiAgICAgICAgICBTRUxFQ1Qgd2Iuc2NoZW1hcy4qXG4gICAgICAgICAgRlJPTSB3Yi5zY2hlbWFzXG4gICAgICAgICAgV0hFUkUgbmFtZSBMSUtFICQxXG4gICAgICAgIGAsXG4gICAgICAgIHBhcmFtczogW3NjaGVtYU5hbWVQYXR0ZXJuXSxcbiAgICAgIH0sXG4gICAgXSk7XG4gICAgaWYgKHJlc3VsdHNbMF0uc3VjY2VzcyAmJiByZXN1bHRzWzFdLnN1Y2Nlc3MpIHtcbiAgICAgIHJlc3VsdHNbMF0ucGF5bG9hZCA9IFNjaGVtYS5wYXJzZVJlc3VsdChyZXN1bHRzWzBdLnBheWxvYWQpO1xuICAgICAgcmVzdWx0c1sxXS5wYXlsb2FkID0gU2NoZW1hLnBhcnNlUmVzdWx0KHJlc3VsdHNbMV0ucGF5bG9hZCk7XG4gICAgICBpZiAocmVzdWx0c1swXS5wYXlsb2FkLmxlbmd0aCAhPSByZXN1bHRzWzFdLnBheWxvYWQubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiA8U2VydmljZVJlc3VsdD57XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogXCJ3Yi5zY2hlbWFzIG91dCBvZiBzeW5jIHdpdGggaW5mb3JtYXRpb25fc2NoZW1hLnNjaGVtYXRhXCIsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzW3Jlc3VsdHMubGVuZ3RoIC0gMV07XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgc2NoZW1hQnlOYW1lKG5hbWU6IHN0cmluZyk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBgXG4gICAgICAgIFNFTEVDVCB3Yi5zY2hlbWFzLipcbiAgICAgICAgRlJPTSB3Yi5zY2hlbWFzXG4gICAgICAgIFdIRVJFIG5hbWU9JDEgTElNSVQgMVxuICAgICAgYCxcbiAgICAgIHBhcmFtczogW25hbWVdLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgcmVzdWx0LnBheWxvYWQgPSBTY2hlbWEucGFyc2VSZXN1bHQocmVzdWx0LnBheWxvYWQpO1xuICAgICAgaWYgKHJlc3VsdC5wYXlsb2FkLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVybiA8U2VydmljZVJlc3VsdD57XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogYENvdWxkIG5vdCBmaW5kIHNjaGVtYSB3aGVyZSBuYW1lPSR7bmFtZX1gLFxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0LnBheWxvYWQgPSByZXN1bHQucGF5bG9hZFswXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzY2hlbWFzQnlVc2VyT3duZXIodXNlckVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBTRUxFQ1Qgd2Iuc2NoZW1hcy4qIEZST00gd2Iuc2NoZW1hc1xuICAgICAgICBKT0lOIHdiLnVzZXJzIE9OIHdiLnNjaGVtYXMudXNlcl9vd25lcl9pZD13Yi51c2Vycy5pZFxuICAgICAgICBXSEVSRSB3Yi51c2Vycy5lbWFpbD0kMVxuICAgICAgYCxcbiAgICAgIHBhcmFtczogW3VzZXJFbWFpbF0sXG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAvLyBUQkQ6IG1hcCB0aGlzIGluc3RlYWRcbiAgICAgIGNvbnN0IHNjaGVtYXNXaXRoUm9sZSA9IEFycmF5PFNjaGVtYT4oKTtcbiAgICAgIGZvciAoY29uc3Qgc2NoZW1hIG9mIFNjaGVtYS5wYXJzZVJlc3VsdChyZXN1bHQucGF5bG9hZCkpIHtcbiAgICAgICAgc2NoZW1hLnVzZXJSb2xlID0gXCJzY2hlbWFfb3duZXJcIjtcbiAgICAgICAgc2NoZW1hc1dpdGhSb2xlLnB1c2goc2NoZW1hKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wYXlsb2FkID0gc2NoZW1hc1dpdGhSb2xlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHJlbW92ZU9yRGVsZXRlU2NoZW1hKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICBkZWw6IGJvb2xlYW5cbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgY29uc3QgcXVlcmllc0FuZFBhcmFtczogQXJyYXk8UXVlcnlQYXJhbXM+ID0gW1xuICAgICAge1xuICAgICAgICBxdWVyeTogYFxuICAgICAgICAgIERFTEVURSBGUk9NIHdiLnNjaGVtYXNcbiAgICAgICAgICBXSEVSRSBuYW1lPSQxXG4gICAgICAgIGAsXG4gICAgICAgIHBhcmFtczogW3NjaGVtYU5hbWVdLFxuICAgICAgfSxcbiAgICBdO1xuICAgIGlmIChkZWwpIHtcbiAgICAgIHF1ZXJpZXNBbmRQYXJhbXMucHVzaCh7XG4gICAgICAgIHF1ZXJ5OiBgRFJPUCBTQ0hFTUEgSUYgRVhJU1RTICR7REFMLnNhbml0aXplKHNjaGVtYU5hbWUpfSBDQVNDQURFYCxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHRzOiBBcnJheTxTZXJ2aWNlUmVzdWx0PiA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJpZXMoXG4gICAgICBxdWVyaWVzQW5kUGFyYW1zXG4gICAgKTtcbiAgICByZXR1cm4gcmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgLyoqXG4gICAqIFNjaGVtYS1Vc2VyLVJvbGVzXG4gICAqL1xuXG4gIHB1YmxpYyBhc3luYyBhZGRVc2VyVG9TY2hlbWEoXG4gICAgc2NoZW1hSWQ6IG51bWJlcixcbiAgICB1c2VySWQ6IG51bWJlcixcbiAgICBzY2hlbWFSb2xlSWQ6IG51bWJlclxuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBJTlNFUlQgSU5UTyB3Yi5zY2hlbWFfdXNlcnMoXG4gICAgICAgICAgc2NoZW1hX2lkLCB1c2VyX2lkLCByb2xlX2lkLCBjcmVhdGVkX2F0LCB1cGRhdGVkX2F0XG4gICAgICAgICkgVkFMVUVTKCQxLCAkMiwgJDMsICQ0LCAkNSlcbiAgICAgIGAsXG4gICAgICBwYXJhbXM6IFtzY2hlbWFJZCwgdXNlcklkLCBzY2hlbWFSb2xlSWQsIG5ldyBEYXRlKCksIG5ldyBEYXRlKCldLFxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVtb3ZlVXNlckZyb21TY2hlbWEoXG4gICAgc2NoZW1hSWQ6IG51bWJlcixcbiAgICB1c2VySWQ6IG51bWJlcixcbiAgICBzY2hlbWFSb2xlSWQ/OiBudW1iZXJcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgbGV0IHF1ZXJ5ID0gYFxuICAgICAgREVMRVRFIEZST00gd2Iuc2NoZW1hX3VzZXJzXG4gICAgICBXSEVSRSBzY2hlbWFfaWQ9JDEgQU5EIHVzZXJfaWQ9JDJcbiAgICBgO1xuICAgIGNvbnN0IHBhcmFtczogKG51bWJlciB8IHVuZGVmaW5lZClbXSA9IFtzY2hlbWFJZCwgdXNlcklkXTtcbiAgICBpZiAoc2NoZW1hUm9sZUlkKSBxdWVyeSArPSBcIiBBTkQgcm9sZV9pZD0kM1wiO1xuICAgIHBhcmFtcy5wdXNoKHNjaGVtYVJvbGVJZCk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcnkoe1xuICAgICAgcXVlcnk6IHF1ZXJ5LFxuICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZW1vdmVBbGxVc2Vyc0Zyb21TY2hlbWEoXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBgXG4gICAgICAgIERFTEVURSBGUk9NIHdiLnNjaGVtYV91c2Vyc1xuICAgICAgICBXSEVSRSBzY2hlbWFfaWQgSU4gKFxuICAgICAgICAgIFNFTEVDVCBpZCBGUk9NIHdiLnNjaGVtYXMgV0hFUkUgbmFtZT0kMVxuICAgICAgICApXG4gICAgICBgLFxuICAgICAgcGFyYW1zOiBbc2NoZW1hTmFtZV0sXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzY2hlbWFzQnlVc2VyKHVzZXJFbWFpbDogc3RyaW5nKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcnkoe1xuICAgICAgcXVlcnk6IGBcbiAgICAgICAgU0VMRUNUIHdiLnNjaGVtYXMuKiwgd2Iucm9sZXMubmFtZSBhcyByb2xlX25hbWVcbiAgICAgICAgRlJPTSB3Yi5zY2hlbWFzXG4gICAgICAgIEpPSU4gd2Iuc2NoZW1hX3VzZXJzIE9OIHdiLnNjaGVtYXMuaWQ9d2Iuc2NoZW1hX3VzZXJzLnNjaGVtYV9pZFxuICAgICAgICBKT0lOIHdiLnVzZXJzIE9OIHdiLnNjaGVtYV91c2Vycy51c2VyX2lkPXdiLnVzZXJzLmlkXG4gICAgICAgIEpPSU4gd2Iucm9sZXMgT04gd2Iuc2NoZW1hX3VzZXJzLnJvbGVfaWQ9d2Iucm9sZXMuaWRcbiAgICAgICAgV0hFUkUgd2IudXNlcnMuZW1haWw9JDFcbiAgICAgIGAsXG4gICAgICBwYXJhbXM6IFt1c2VyRW1haWxdLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgLy8gVEJEOiBtYXAgdGhpcyBpbnN0ZWFkXG4gICAgICBjb25zdCBzY2hlbWFzV2l0aFJvbGUgPSBBcnJheTxTY2hlbWE+KCk7XG4gICAgICBsZXQgc2NoZW1hOiBTY2hlbWE7XG4gICAgICByZXN1bHQucGF5bG9hZC5yb3dzLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG4gICAgICAgIHNjaGVtYSA9IFNjaGVtYS5wYXJzZShyb3cpO1xuICAgICAgICBzY2hlbWEudXNlclJvbGUgPSByb3cucm9sZV9uYW1lO1xuICAgICAgICBzY2hlbWFzV2l0aFJvbGUucHVzaChzY2hlbWEpO1xuICAgICAgfSk7XG4gICAgICByZXN1bHQucGF5bG9hZCA9IHNjaGVtYXNXaXRoUm9sZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUYWJsZXNcbiAgICovXG5cbiAgcHVibGljIGFzeW5jIHRhYmxlcyhzY2hlbWFOYW1lOiBzdHJpbmcpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBTRUxFQ1Qgd2IudGFibGVzLipcbiAgICAgICAgRlJPTSB3Yi50YWJsZXNcbiAgICAgICAgSk9JTiB3Yi5zY2hlbWFzIE9OIHdiLnRhYmxlcy5zY2hlbWFfaWQ9d2Iuc2NoZW1hcy5pZFxuICAgICAgICBXSEVSRSB3Yi5zY2hlbWFzLm5hbWU9JDFcbiAgICAgIGAsXG4gICAgICBwYXJhbXM6IFtzY2hlbWFOYW1lXSxcbiAgICB9KTtcbiAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHJlc3VsdC5wYXlsb2FkID0gVGFibGUucGFyc2VSZXN1bHQocmVzdWx0LnBheWxvYWQpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZGlzY292ZXJUYWJsZXMoc2NoZW1hTmFtZTogc3RyaW5nKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcnkoe1xuICAgICAgcXVlcnk6IGBcbiAgICAgICAgU0VMRUNUIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXMudGFibGVfbmFtZVxuICAgICAgICBGUk9NIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZXNcbiAgICAgICAgV0hFUkUgdGFibGVfc2NoZW1hPSQxXG4gICAgICBgLFxuICAgICAgcGFyYW1zOiBbc2NoZW1hTmFtZV0sXG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICByZXN1bHQucGF5bG9hZCA9IHJlc3VsdC5wYXlsb2FkLnJvd3MubWFwKFxuICAgICAgICAocm93OiB7IHRhYmxlX25hbWU6IHN0cmluZyB9KSA9PiByb3cudGFibGVfbmFtZVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjb2x1bW5zKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZU5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBTRUxFQ1Qgd2IuY29sdW1ucy4qLCBpbmZvcm1hdGlvbl9zY2hlbWEuY29sdW1ucy5kYXRhX3R5cGUgYXMgdHlwZVxuICAgICAgICBGUk9NIHdiLmNvbHVtbnNcbiAgICAgICAgSk9JTiB3Yi50YWJsZXMgT04gd2IuY29sdW1ucy50YWJsZV9pZD13Yi50YWJsZXMuaWRcbiAgICAgICAgSk9JTiB3Yi5zY2hlbWFzIE9OIHdiLnRhYmxlcy5zY2hlbWFfaWQ9d2Iuc2NoZW1hcy5pZFxuICAgICAgICBKT0lOIGluZm9ybWF0aW9uX3NjaGVtYS5jb2x1bW5zIE9OIChcbiAgICAgICAgICB3Yi5jb2x1bW5zLm5hbWU9aW5mb3JtYXRpb25fc2NoZW1hLmNvbHVtbnMuY29sdW1uX25hbWVcbiAgICAgICAgICBBTkQgd2Iuc2NoZW1hcy5uYW1lPWluZm9ybWF0aW9uX3NjaGVtYS5jb2x1bW5zLnRhYmxlX3NjaGVtYVxuICAgICAgICApXG4gICAgICAgIFdIRVJFIHdiLnNjaGVtYXMubmFtZT0kMSBBTkQgd2IudGFibGVzLm5hbWU9JDIgQU5EIGluZm9ybWF0aW9uX3NjaGVtYS5jb2x1bW5zLnRhYmxlX25hbWU9JDJcbiAgICAgIGAsXG4gICAgICBwYXJhbXM6IFtzY2hlbWFOYW1lLCB0YWJsZU5hbWVdLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2VzcykgcmVzdWx0LnBheWxvYWQgPSBDb2x1bW4ucGFyc2VSZXN1bHQocmVzdWx0LnBheWxvYWQpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZGlzY292ZXJDb2x1bW5zKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZU5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBTRUxFQ1QgY29sdW1uX25hbWUgYXMgbmFtZSwgZGF0YV90eXBlIGFzIHR5cGVcbiAgICAgICAgRlJPTSBpbmZvcm1hdGlvbl9zY2hlbWEuY29sdW1uc1xuICAgICAgICBXSEVSRSB0YWJsZV9zY2hlbWE9JDFcbiAgICAgICAgQU5EIHRhYmxlX25hbWU9JDJcbiAgICAgIGAsXG4gICAgICBwYXJhbXM6IFtzY2hlbWFOYW1lLCB0YWJsZU5hbWVdLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2VzcykgcmVzdWx0LnBheWxvYWQgPSBDb2x1bW4ucGFyc2VSZXN1bHQocmVzdWx0LnBheWxvYWQpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyB0eXBlID0gZm9yZWlnbktleXN8cmVmZXJlbmNlc3xhbGxcbiAgcHVibGljIGFzeW5jIGZvcmVpZ25LZXlzT3JSZWZlcmVuY2VzKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZU5hbWVQYXR0ZXJuOiBzdHJpbmcsXG4gICAgY29sdW1uTmFtZVBhdHRlcm46IHN0cmluZyxcbiAgICB0eXBlOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgc2NoZW1hTmFtZSA9IERBTC5zYW5pdGl6ZShzY2hlbWFOYW1lKTtcbiAgICB0YWJsZU5hbWVQYXR0ZXJuID0gREFMLnNhbml0aXplKHRhYmxlTmFtZVBhdHRlcm4pO1xuICAgIGNvbHVtbk5hbWVQYXR0ZXJuID0gREFMLnNhbml0aXplKGNvbHVtbk5hbWVQYXR0ZXJuKTtcbiAgICBsZXQgd2hlcmVTcWw6IHN0cmluZyA9IFwiXCI7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlIFwiRk9SRUlHTl9LRVlTXCI6XG4gICAgICAgIHdoZXJlU3FsID0gYFxuICAgICAgICAgIEFORCBmay50YWJsZV9uYW1lIExJS0UgJyR7dGFibGVOYW1lUGF0dGVybn0nXG4gICAgICAgICAgQU5EIGZrLmNvbHVtbl9uYW1lIExJS0UgJyR7Y29sdW1uTmFtZVBhdHRlcm59J1xuICAgICAgICBgO1xuICAgICAgY2FzZSBcIlJFRkVSRU5DRVNcIjpcbiAgICAgICAgd2hlcmVTcWwgPSBgXG4gICAgICAgICAgQU5EIHJlZi50YWJsZV9uYW1lIExJS0UgJyR7dGFibGVOYW1lUGF0dGVybn0nXG4gICAgICAgICAgQU5EIHJlZi5jb2x1bW5fbmFtZSBMSUtFICcke2NvbHVtbk5hbWVQYXR0ZXJufSdcbiAgICAgICAgYDtcbiAgICAgIGNhc2UgXCJBTExcIjpcbiAgICAgICAgd2hlcmVTcWwgPSBgXG4gICAgICAgICAgQU5EIGZrLnRhYmxlX25hbWUgTElLRSAnJHt0YWJsZU5hbWVQYXR0ZXJufSdcbiAgICAgICAgICBBTkQgZmsuY29sdW1uX25hbWUgTElLRSAnJHtjb2x1bW5OYW1lUGF0dGVybn0nXG4gICAgICAgIGA7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBgXG4gICAgICAgIFNFTEVDVFxuICAgICAgICAtLSB1bmlxdWUgcmVmZXJlbmNlIGluZm9cbiAgICAgICAgcmVmLnRhYmxlX25hbWUgICAgICAgQVMgcmVmX3RhYmxlLFxuICAgICAgICByZWYuY29sdW1uX25hbWUgICAgICBBUyByZWZfY29sdW1uLFxuICAgICAgICByZWZkLmNvbnN0cmFpbnRfdHlwZSBBUyByZWZfdHlwZSwgLS0gZS5nLiBVTklRVUUgb3IgUFJJTUFSWSBLRVlcbiAgICAgICAgLS0gZm9yZWlnbiBrZXkgaW5mb1xuICAgICAgICBmay50YWJsZV9uYW1lICAgICAgICBBUyBma190YWJsZSxcbiAgICAgICAgZmsuY29sdW1uX25hbWUgICAgICAgQVMgZmtfY29sdW1uLFxuICAgICAgICBmay5jb25zdHJhaW50X25hbWUgICBBUyBma19uYW1lLFxuICAgICAgICBtYXAudXBkYXRlX3J1bGUgICAgICBBUyBma19vbl91cGRhdGUsXG4gICAgICAgIG1hcC5kZWxldGVfcnVsZSAgICAgIEFTIGZrX29uX2RlbGV0ZVxuICAgICAgICAtLSBsaXN0cyBmayBjb25zdHJhaW50cyBBTkQgbWFwcyB0aGVtIHRvIHBrIGNvbnN0cmFpbnRzXG4gICAgICAgIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnJlZmVyZW50aWFsX2NvbnN0cmFpbnRzIEFTIG1hcFxuICAgICAgICAtLSBqb2luIHVuaXF1ZSBjb25zdHJhaW50cyAoZS5nLiBQS3MgY29uc3RyYWludHMpIHRvIHJlZiBjb2x1bW5zIGluZm9cbiAgICAgICAgSU5ORVIgSk9JTiBpbmZvcm1hdGlvbl9zY2hlbWEua2V5X2NvbHVtbl91c2FnZSBBUyByZWZcbiAgICAgICAgT04gIHJlZi5jb25zdHJhaW50X2NhdGFsb2cgPSBtYXAudW5pcXVlX2NvbnN0cmFpbnRfY2F0YWxvZ1xuICAgICAgICBBTkQgcmVmLmNvbnN0cmFpbnRfc2NoZW1hID0gbWFwLnVuaXF1ZV9jb25zdHJhaW50X3NjaGVtYVxuICAgICAgICBBTkQgcmVmLmNvbnN0cmFpbnRfbmFtZSA9IG1hcC51bmlxdWVfY29uc3RyYWludF9uYW1lXG4gICAgICAgIC0tIG9wdGlvbmFsOiB0byBpbmNsdWRlIHJlZmVyZW5jZSBjb25zdHJhaW50IHR5cGVcbiAgICAgICAgTEVGVCBKT0lOIGluZm9ybWF0aW9uX3NjaGVtYS50YWJsZV9jb25zdHJhaW50cyBBUyByZWZkXG4gICAgICAgIE9OICByZWZkLmNvbnN0cmFpbnRfY2F0YWxvZyA9IHJlZi5jb25zdHJhaW50X2NhdGFsb2dcbiAgICAgICAgQU5EIHJlZmQuY29uc3RyYWludF9zY2hlbWEgPSByZWYuY29uc3RyYWludF9zY2hlbWFcbiAgICAgICAgQU5EIHJlZmQuY29uc3RyYWludF9uYW1lID0gcmVmLmNvbnN0cmFpbnRfbmFtZVxuICAgICAgICAtLSBqb2luIGZrIGNvbHVtbnMgdG8gdGhlIGNvcnJlY3QgcmVmIGNvbHVtbnMgdXNpbmcgb3JkaW5hbCBwb3NpdGlvbnNcbiAgICAgICAgSU5ORVIgSk9JTiBpbmZvcm1hdGlvbl9zY2hlbWEua2V5X2NvbHVtbl91c2FnZSBBUyBma1xuICAgICAgICBPTiAgZmsuY29uc3RyYWludF9jYXRhbG9nID0gbWFwLmNvbnN0cmFpbnRfY2F0YWxvZ1xuICAgICAgICBBTkQgZmsuY29uc3RyYWludF9zY2hlbWEgPSBtYXAuY29uc3RyYWludF9zY2hlbWFcbiAgICAgICAgQU5EIGZrLmNvbnN0cmFpbnRfbmFtZSA9IG1hcC5jb25zdHJhaW50X25hbWVcbiAgICAgICAgQU5EIGZrLnBvc2l0aW9uX2luX3VuaXF1ZV9jb25zdHJhaW50ID0gcmVmLm9yZGluYWxfcG9zaXRpb24gLS1JTVBPUlRBTlQhXG4gICAgICAgIFdIRVJFIHJlZi50YWJsZV9zY2hlbWE9JyR7c2NoZW1hTmFtZX0nXG4gICAgICAgIEFORCBmay50YWJsZV9zY2hlbWE9JyR7c2NoZW1hTmFtZX0nXG4gICAgICAgICR7d2hlcmVTcWx9XG4gICAgICBgLFxuICAgIH0pO1xuICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgY29uc3QgY29uc3RyYWludHM6IENvbnN0cmFpbnRJZFtdID0gW107XG4gICAgZm9yIChjb25zdCByb3cgb2YgcmVzdWx0LnBheWxvYWQucm93cykge1xuICAgICAgY29uc3QgY29uc3RyYWludDogQ29uc3RyYWludElkID0ge1xuICAgICAgICBjb25zdHJhaW50TmFtZTogcm93LmZrX25hbWUsXG4gICAgICAgIHRhYmxlTmFtZTogcm93LmZrX3RhYmxlLFxuICAgICAgICBjb2x1bW5OYW1lOiByb3cuZmtfY29sdW1uLFxuICAgICAgICByZWxUYWJsZU5hbWU6IHJvdy5yZWZfdGFibGUsXG4gICAgICAgIHJlbENvbHVtbk5hbWU6IHJvdy5yZWZfY29sdW1uLFxuICAgICAgfTtcbiAgICAgIGNvbnN0cmFpbnRzLnB1c2goY29uc3RyYWludCk7XG4gICAgfVxuICAgIHJlc3VsdC5wYXlsb2FkID0gY29uc3RyYWludHM7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBwcmltYXJ5S2V5cyhcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgdGFibGVOYW1lOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgc2NoZW1hTmFtZSA9IERBTC5zYW5pdGl6ZShzY2hlbWFOYW1lKTtcbiAgICB0YWJsZU5hbWUgPSBEQUwuc2FuaXRpemUodGFibGVOYW1lKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBTRUxFQ1QgRElTVElOQ1QgYy5jb2x1bW5fbmFtZSwgdGMuY29uc3RyYWludF9uYW1lXG4gICAgICAgIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlX2NvbnN0cmFpbnRzIHRjIFxuICAgICAgICBKT0lOIGluZm9ybWF0aW9uX3NjaGVtYS5jb25zdHJhaW50X2NvbHVtbl91c2FnZSBBUyBjY3VcbiAgICAgICAgVVNJTkcgKGNvbnN0cmFpbnRfc2NoZW1hLCBjb25zdHJhaW50X25hbWUpXG4gICAgICAgIEpPSU4gaW5mb3JtYXRpb25fc2NoZW1hLmNvbHVtbnMgQVMgY1xuICAgICAgICBPTiBjLnRhYmxlX3NjaGVtYSA9IHRjLmNvbnN0cmFpbnRfc2NoZW1hXG4gICAgICAgIEFORCB0Yy50YWJsZV9uYW1lID0gYy50YWJsZV9uYW1lXG4gICAgICAgIEFORCBjY3UuY29sdW1uX25hbWUgPSBjLmNvbHVtbl9uYW1lXG4gICAgICAgIFdIRVJFIGNvbnN0cmFpbnRfdHlwZSA9ICdQUklNQVJZIEtFWSdcbiAgICAgICAgQU5EIGMudGFibGVfc2NoZW1hPScke3NjaGVtYU5hbWV9J1xuICAgICAgICBBTkQgdGMudGFibGVfbmFtZSA9ICcke3RhYmxlTmFtZX0nXG4gICAgICBgLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgY29uc3QgcEtDb2xzQ29uc3RyYWludHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICAgIGZvciAoY29uc3Qgcm93IG9mIHJlc3VsdC5wYXlsb2FkLnJvd3MpIHtcbiAgICAgICAgcEtDb2xzQ29uc3RyYWludHNbcm93LmNvbHVtbl9uYW1lXSA9IHJvdy5jb25zdHJhaW50X25hbWU7XG4gICAgICB9XG4gICAgICByZXN1bHQucGF5bG9hZCA9IHBLQ29sc0NvbnN0cmFpbnRzO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGRlbGV0ZUNvbnN0cmFpbnQoXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTmFtZTogc3RyaW5nLFxuICAgIGNvbnN0cmFpbnROYW1lOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgc2NoZW1hTmFtZSA9IERBTC5zYW5pdGl6ZShzY2hlbWFOYW1lKTtcbiAgICB0YWJsZU5hbWUgPSBEQUwuc2FuaXRpemUodGFibGVOYW1lKTtcbiAgICBjb25zdHJhaW50TmFtZSA9IERBTC5zYW5pdGl6ZShjb25zdHJhaW50TmFtZSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcnkoe1xuICAgICAgcXVlcnk6IGBcbiAgICAgICAgQUxURVIgVEFCTEUgJHtzY2hlbWFOYW1lfS4ke3RhYmxlTmFtZX1cbiAgICAgICAgRFJPUCBDT05TVFJBSU5UIElGIEVYSVNUUyAke2NvbnN0cmFpbnROYW1lfVxuICAgICAgYCxcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGNyZWF0ZVByaW1hcnlLZXkoXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTmFtZTogc3RyaW5nLFxuICAgIGNvbHVtbk5hbWVzOiBzdHJpbmdbXVxuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBzY2hlbWFOYW1lID0gREFMLnNhbml0aXplKHNjaGVtYU5hbWUpO1xuICAgIHRhYmxlTmFtZSA9IERBTC5zYW5pdGl6ZSh0YWJsZU5hbWUpO1xuICAgIGNvbnN0IHNhbml0aXplZENvbHVtbk5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY29sdW1uTmFtZSBvZiBjb2x1bW5OYW1lcykge1xuICAgICAgc2FuaXRpemVkQ29sdW1uTmFtZXMucHVzaChEQUwuc2FuaXRpemUoY29sdW1uTmFtZSkpO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyeSh7XG4gICAgICBxdWVyeTogYFxuICAgICAgICBBTFRFUiBUQUJMRSAke3NjaGVtYU5hbWV9LiR7dGFibGVOYW1lfVxuICAgICAgICBBREQgUFJJTUFSWSBLRVkgKCR7c2FuaXRpemVkQ29sdW1uTmFtZXMuam9pbihcIixcIil9KTtcbiAgICAgIGAsXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjcmVhdGVGb3JlaWduS2V5KFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZU5hbWU6IHN0cmluZyxcbiAgICBjb2x1bW5OYW1lczogc3RyaW5nW10sXG4gICAgcGFyZW50VGFibGVOYW1lOiBzdHJpbmcsXG4gICAgcGFyZW50Q29sdW1uTmFtZXM6IHN0cmluZ1tdXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGxvZy5kZWJ1ZyhcbiAgICAgIGBkYWwuY3JlYXRlRm9yZWlnbktleSgke3NjaGVtYU5hbWV9LCR7dGFibGVOYW1lfSwke2NvbHVtbk5hbWVzfSwke3BhcmVudFRhYmxlTmFtZX0sJHtwYXJlbnRDb2x1bW5OYW1lc30pYFxuICAgICk7XG4gICAgc2NoZW1hTmFtZSA9IERBTC5zYW5pdGl6ZShzY2hlbWFOYW1lKTtcbiAgICB0YWJsZU5hbWUgPSBEQUwuc2FuaXRpemUodGFibGVOYW1lKTtcbiAgICBjb25zdCBzYW5pdGl6ZWRDb2x1bW5OYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNvbHVtbk5hbWUgb2YgY29sdW1uTmFtZXMpIHtcbiAgICAgIHNhbml0aXplZENvbHVtbk5hbWVzLnB1c2goREFMLnNhbml0aXplKGNvbHVtbk5hbWUpKTtcbiAgICB9XG4gICAgcGFyZW50VGFibGVOYW1lID0gREFMLnNhbml0aXplKHBhcmVudFRhYmxlTmFtZSk7XG4gICAgY29uc3Qgc2FuaXRpemVkUGFyZW50Q29sdW1uTmFtZXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBwYXJlbnRDb2x1bW5OYW1lIG9mIHBhcmVudENvbHVtbk5hbWVzKSB7XG4gICAgICBzYW5pdGl6ZWRQYXJlbnRDb2x1bW5OYW1lcy5wdXNoKERBTC5zYW5pdGl6ZShwYXJlbnRDb2x1bW5OYW1lKSk7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBgXG4gICAgICAgIEFMVEVSIFRBQkxFICR7c2NoZW1hTmFtZX0uJHt0YWJsZU5hbWV9XG4gICAgICAgIEFERCBDT05TVFJBSU5UICR7dGFibGVOYW1lfV8ke3Nhbml0aXplZENvbHVtbk5hbWVzLmpvaW4oXCJfXCIpfV9ma2V5XG4gICAgICAgIEZPUkVJR04gS0VZICgke3Nhbml0aXplZENvbHVtbk5hbWVzLmpvaW4oXCIsXCIpfSlcbiAgICAgICAgUkVGRVJFTkNFUyAke3NjaGVtYU5hbWV9LiR7cGFyZW50VGFibGVOYW1lfVxuICAgICAgICAgICgke3Nhbml0aXplZFBhcmVudENvbHVtbk5hbWVzLmpvaW4oXCIsXCIpfSlcbiAgICAgICAgT04gREVMRVRFIFNFVCBOVUxMXG4gICAgICBgLFxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgdGFibGVCeVNjaGVtYU5hbWVUYWJsZU5hbWUoXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTmFtZTogc3RyaW5nXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBgXG4gICAgICAgIFNFTEVDVCB3Yi50YWJsZXMuKlxuICAgICAgICBGUk9NIHdiLnRhYmxlc1xuICAgICAgICBKT0lOIHdiLnNjaGVtYXMgT04gd2IudGFibGVzLnNjaGVtYV9pZD13Yi5zY2hlbWFzLmlkXG4gICAgICAgIFdIRVJFIHdiLnNjaGVtYXMubmFtZT0kMSBBTkQgd2IudGFibGVzLm5hbWU9JDIgTElNSVQgMVxuICAgICAgYCxcbiAgICAgIHBhcmFtczogW3NjaGVtYU5hbWUsIHRhYmxlTmFtZV0sXG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdC5zdWNjZXNzKSByZXN1bHQucGF5bG9hZCA9IFRhYmxlLnBhcnNlUmVzdWx0KHJlc3VsdC5wYXlsb2FkKVswXTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGFkZE9yQ3JlYXRlVGFibGUoXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTGFiZWw6IHN0cmluZyxcbiAgICBjcmVhdGU6IGJvb2xlYW5cbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgbG9nLmRlYnVnKFxuICAgICAgYGRhbC5hZGRPckNyZWF0ZVRhYmxlICR7c2NoZW1hTmFtZX0gJHt0YWJsZU5hbWV9ICR7dGFibGVMYWJlbH0gJHtjcmVhdGV9YFxuICAgICk7XG4gICAgc2NoZW1hTmFtZSA9IERBTC5zYW5pdGl6ZShzY2hlbWFOYW1lKTtcbiAgICB0YWJsZU5hbWUgPSBEQUwuc2FuaXRpemUodGFibGVOYW1lKTtcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgdGhpcy5zY2hlbWFCeU5hbWUoc2NoZW1hTmFtZSk7XG4gICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICBjb25zdCBxdWVyaWVzQW5kUGFyYW1zOiBBcnJheTxRdWVyeVBhcmFtcz4gPSBbXG4gICAgICB7XG4gICAgICAgIHF1ZXJ5OiBgXG4gICAgICAgIElOU0VSVCBJTlRPIHdiLnRhYmxlcyhzY2hlbWFfaWQsIG5hbWUsIGxhYmVsLCBjcmVhdGVkX2F0LCB1cGRhdGVkX2F0KVxuICAgICAgICBWQUxVRVMgKCQxLCAkMiwgJDMsICQ0LCAkNSlcbiAgICAgIGAsXG4gICAgICAgIHBhcmFtczogW1xuICAgICAgICAgIHJlc3VsdC5wYXlsb2FkLmlkLFxuICAgICAgICAgIHRhYmxlTmFtZSxcbiAgICAgICAgICB0YWJsZUxhYmVsLFxuICAgICAgICAgIG5ldyBEYXRlKCksXG4gICAgICAgICAgbmV3IERhdGUoKSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXTtcbiAgICBpZiAoY3JlYXRlKSB7XG4gICAgICBxdWVyaWVzQW5kUGFyYW1zLnB1c2goe1xuICAgICAgICBxdWVyeTogYENSRUFURSBUQUJMRSBcIiR7c2NoZW1hTmFtZX1cIi5cIiR7dGFibGVOYW1lfVwiKClgLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdHM6IEFycmF5PFNlcnZpY2VSZXN1bHQ+ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcmllcyhcbiAgICAgIHF1ZXJpZXNBbmRQYXJhbXNcbiAgICApO1xuICAgIHJldHVybiByZXN1bHRzW3Jlc3VsdHMubGVuZ3RoIC0gMV07XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVtb3ZlT3JEZWxldGVUYWJsZShcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgdGFibGVOYW1lOiBzdHJpbmcsXG4gICAgZGVsOiBib29sZWFuXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIHNjaGVtYU5hbWUgPSBEQUwuc2FuaXRpemUoc2NoZW1hTmFtZSk7XG4gICAgdGFibGVOYW1lID0gREFMLnNhbml0aXplKHRhYmxlTmFtZSk7XG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2NoZW1hQnlOYW1lKHNjaGVtYU5hbWUpO1xuICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgY29uc3QgcXVlcmllc0FuZFBhcmFtczogQXJyYXk8UXVlcnlQYXJhbXM+ID0gW1xuICAgICAge1xuICAgICAgICBxdWVyeTogYFxuICAgICAgICAgIERFTEVURSBGUk9NIHdiLnRhYmxlc1xuICAgICAgICAgIFdIRVJFIHNjaGVtYV9pZD0kMSBBTkQgbmFtZT0kMlxuICAgICAgICBgLFxuICAgICAgICBwYXJhbXM6IFtyZXN1bHQucGF5bG9hZC5pZCwgdGFibGVOYW1lXSxcbiAgICAgIH0sXG4gICAgXTtcbiAgICBpZiAoZGVsKSB7XG4gICAgICBxdWVyaWVzQW5kUGFyYW1zLnB1c2goe1xuICAgICAgICBxdWVyeTogYERST1AgVEFCTEUgSUYgRVhJU1RTIFwiJHtzY2hlbWFOYW1lfVwiLlwiJHt0YWJsZU5hbWV9XCIgQ0FTQ0FERWAsXG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0czogQXJyYXk8U2VydmljZVJlc3VsdD4gPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyaWVzKFxuICAgICAgcXVlcmllc0FuZFBhcmFtc1xuICAgICk7XG4gICAgcmV0dXJuIHJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB1cGRhdGVUYWJsZShcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgdGFibGVOYW1lOiBzdHJpbmcsXG4gICAgbmV3VGFibGVOYW1lPzogc3RyaW5nLFxuICAgIG5ld1RhYmxlTGFiZWw/OiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgc2NoZW1hTmFtZSA9IERBTC5zYW5pdGl6ZShzY2hlbWFOYW1lKTtcbiAgICB0YWJsZU5hbWUgPSBEQUwuc2FuaXRpemUodGFibGVOYW1lKTtcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgdGhpcy50YWJsZUJ5U2NoZW1hTmFtZVRhYmxlTmFtZShzY2hlbWFOYW1lLCB0YWJsZU5hbWUpO1xuICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgbGV0IHBhcmFtcyA9IFtdO1xuICAgIGxldCBxdWVyeSA9IGBcbiAgICAgIFVQREFURSB3Yi50YWJsZXMgU0VUXG4gICAgYDtcbiAgICBsZXQgdXBkYXRlczogc3RyaW5nW10gPSBbXTtcbiAgICBpZiAobmV3VGFibGVOYW1lKSB7XG4gICAgICB1cGRhdGVzLnB1c2goXCJuYW1lPSRcIiArIChwYXJhbXMubGVuZ3RoICsgMSkpO1xuICAgICAgcGFyYW1zLnB1c2gobmV3VGFibGVOYW1lKTtcbiAgICB9XG4gICAgaWYgKG5ld1RhYmxlTGFiZWwpIHtcbiAgICAgIHVwZGF0ZXMucHVzaChcImxhYmVsPSRcIiArIChwYXJhbXMubGVuZ3RoICsgMSkpO1xuICAgICAgcGFyYW1zLnB1c2gobmV3VGFibGVMYWJlbCk7XG4gICAgfVxuICAgIHF1ZXJ5ICs9IGAke3VwZGF0ZXMuam9pbihcIiwgXCIpfSBXSEVSRSBpZD0kJHtwYXJhbXMubGVuZ3RoICsgMX1gO1xuICAgIHBhcmFtcy5wdXNoKHJlc3VsdC5wYXlsb2FkLmlkKTtcbiAgICBjb25zdCBxdWVyaWVzQW5kUGFyYW1zOiBBcnJheTxRdWVyeVBhcmFtcz4gPSBbXG4gICAgICB7XG4gICAgICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICB9LFxuICAgIF07XG4gICAgaWYgKG5ld1RhYmxlTmFtZSkge1xuICAgICAgcXVlcmllc0FuZFBhcmFtcy5wdXNoKHtcbiAgICAgICAgcXVlcnk6IGBcbiAgICAgICAgICBBTFRFUiBUQUJMRSBcIiR7c2NoZW1hTmFtZX1cIi5cIiR7dGFibGVOYW1lfVwiXG4gICAgICAgICAgUkVOQU1FIFRPICR7bmV3VGFibGVOYW1lfVxuICAgICAgICBgLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdHM6IEFycmF5PFNlcnZpY2VSZXN1bHQ+ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcmllcyhcbiAgICAgIHF1ZXJpZXNBbmRQYXJhbXNcbiAgICApO1xuICAgIHJldHVybiByZXN1bHRzW3Jlc3VsdHMubGVuZ3RoIC0gMV07XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgYWRkT3JDcmVhdGVDb2x1bW4oXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTmFtZTogc3RyaW5nLFxuICAgIGNvbHVtbk5hbWU6IHN0cmluZyxcbiAgICBjb2x1bW5MYWJlbDogc3RyaW5nLFxuICAgIGNyZWF0ZTogYm9vbGVhbixcbiAgICBjb2x1bW5QR1R5cGU/OiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgbG9nLmRlYnVnKFxuICAgICAgYGRhbC5hZGRPckNyZWF0ZUNvbHVtbiAke3NjaGVtYU5hbWV9ICR7dGFibGVOYW1lfSAke2NvbHVtbk5hbWV9ICR7Y29sdW1uTGFiZWx9ICR7Y29sdW1uUEdUeXBlfSAke2NyZWF0ZX1gXG4gICAgKTtcbiAgICBzY2hlbWFOYW1lID0gREFMLnNhbml0aXplKHNjaGVtYU5hbWUpO1xuICAgIHRhYmxlTmFtZSA9IERBTC5zYW5pdGl6ZSh0YWJsZU5hbWUpO1xuICAgIGNvbHVtbk5hbWUgPSBEQUwuc2FuaXRpemUoY29sdW1uTmFtZSk7XG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoaXMudGFibGVCeVNjaGVtYU5hbWVUYWJsZU5hbWUoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIGNvbnN0IHF1ZXJpZXNBbmRQYXJhbXM6IEFycmF5PFF1ZXJ5UGFyYW1zPiA9IFtcbiAgICAgIHtcbiAgICAgICAgcXVlcnk6IGBcbiAgICAgICAgICBJTlNFUlQgSU5UTyB3Yi5jb2x1bW5zKHRhYmxlX2lkLCBuYW1lLCBsYWJlbCwgY3JlYXRlZF9hdCwgdXBkYXRlZF9hdClcbiAgICAgICAgICBWQUxVRVMgKCQxLCAkMiwgJDMsICQ0LCAkNSlcbiAgICAgICAgYCxcbiAgICAgICAgcGFyYW1zOiBbXG4gICAgICAgICAgcmVzdWx0LnBheWxvYWQuaWQsXG4gICAgICAgICAgY29sdW1uTmFtZSxcbiAgICAgICAgICBjb2x1bW5MYWJlbCxcbiAgICAgICAgICBuZXcgRGF0ZSgpLFxuICAgICAgICAgIG5ldyBEYXRlKCksXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF07XG4gICAgaWYgKGNyZWF0ZSkge1xuICAgICAgcXVlcmllc0FuZFBhcmFtcy5wdXNoKHtcbiAgICAgICAgcXVlcnk6IGBcbiAgICAgICAgICBBTFRFUiBUQUJMRSBcIiR7c2NoZW1hTmFtZX1cIi5cIiR7dGFibGVOYW1lfVwiXG4gICAgICAgICAgQUREICR7Y29sdW1uTmFtZX0gJHtjb2x1bW5QR1R5cGV9XG4gICAgICAgIGAsXG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0czogQXJyYXk8U2VydmljZVJlc3VsdD4gPSBhd2FpdCB0aGlzLmV4ZWN1dGVRdWVyaWVzKFxuICAgICAgcXVlcmllc0FuZFBhcmFtc1xuICAgICk7XG4gICAgcmV0dXJuIHJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZW1vdmVPckRlbGV0ZUNvbHVtbihcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgdGFibGVOYW1lOiBzdHJpbmcsXG4gICAgY29sdW1uTmFtZTogc3RyaW5nLFxuICAgIGRlbDogYm9vbGVhblxuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBzY2hlbWFOYW1lID0gREFMLnNhbml0aXplKHNjaGVtYU5hbWUpO1xuICAgIHRhYmxlTmFtZSA9IERBTC5zYW5pdGl6ZSh0YWJsZU5hbWUpO1xuICAgIGNvbHVtbk5hbWUgPSBEQUwuc2FuaXRpemUoY29sdW1uTmFtZSk7XG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoaXMudGFibGVCeVNjaGVtYU5hbWVUYWJsZU5hbWUoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIGNvbnN0IHF1ZXJpZXNBbmRQYXJhbXM6IEFycmF5PFF1ZXJ5UGFyYW1zPiA9IFtcbiAgICAgIHtcbiAgICAgICAgcXVlcnk6IGBcbiAgICAgICAgICBERUxFVEUgRlJPTSB3Yi5jb2x1bW5zXG4gICAgICAgICAgV0hFUkUgdGFibGVfaWQ9JDEgQU5EIG5hbWU9JDJcbiAgICAgICAgYCxcbiAgICAgICAgcGFyYW1zOiBbcmVzdWx0LnBheWxvYWQuaWQsIGNvbHVtbk5hbWVdLFxuICAgICAgfSxcbiAgICBdO1xuICAgIGlmIChkZWwpIHtcbiAgICAgIHF1ZXJpZXNBbmRQYXJhbXMucHVzaCh7XG4gICAgICAgIHF1ZXJ5OiBgXG4gICAgICAgICAgQUxURVIgVEFCTEUgXCIke3NjaGVtYU5hbWV9XCIuXCIke3RhYmxlTmFtZX1cIlxuICAgICAgICAgIERST1AgQ09MVU1OIElGIEVYSVNUUyAke2NvbHVtbk5hbWV9IENBU0NBREVcbiAgICAgICAgYCxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHRzOiBBcnJheTxTZXJ2aWNlUmVzdWx0PiA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJpZXMoXG4gICAgICBxdWVyaWVzQW5kUGFyYW1zXG4gICAgKTtcbiAgICByZXR1cm4gcmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgLyoqXG4gICAqIFRhYmxlIFVzZXJzXG4gICAqL1xuXG4gIHB1YmxpYyBhc3luYyB0YWJsZVVzZXIoXG4gICAgdXNlckVtYWlsOiBzdHJpbmcsXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTmFtZTogc3RyaW5nXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBgXG4gICAgICAgIFNFTEVDVCB3Yi50YWJsZV91c2Vycy4qXG4gICAgICAgIEZST00gd2IudGFibGVfdXNlcnNcbiAgICAgICAgSk9JTiB3Yi50YWJsZXMgT04gd2IudGFibGVfdXNlcnMudGFibGVfaWQ9d2IudGFibGVzLmlkXG4gICAgICAgIEpPSU4gd2Iuc2NoZW1hcyBPTiB3Yi50YWJsZXMuc2NoZW1hX2lkPXdiLnNjaGVtYXMuaWRcbiAgICAgICAgSk9JTiB3Yi51c2VycyBPTiB3Yi50YWJsZV91c2Vycy51c2VyX2lkPXdiLnVzZXJzLmlkXG4gICAgICAgIFdIRVJFIHdiLnVzZXJzLmVtYWlsPSQxIEFORCB3Yi5zY2hlbWFzLm5hbWU9JDIgQU5EIHdiLnRhYmxlcy5uYW1lPSQzXG4gICAgICAgIExJTUlUIDFcbiAgICAgIGAsXG4gICAgICBwYXJhbXM6IFt1c2VyRW1haWwsIHNjaGVtYU5hbWUsIHRhYmxlTmFtZV0sXG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICByZXN1bHQucGF5bG9hZCA9IFRhYmxlVXNlci5wYXJzZVJlc3VsdChyZXN1bHQucGF5bG9hZClbMF07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVtb3ZlVGFibGVVc2VycyhcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgdGFibGVOYW1lOiBzdHJpbmcsXG4gICAgdXNlckVtYWlscz86IFtzdHJpbmddXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGxldCBwYXJhbXMgPSBbc2NoZW1hTmFtZSwgdGFibGVOYW1lXTtcbiAgICBsZXQgcXVlcnkgPSBgXG4gICAgICBERUxFVEUgRlJPTSB3Yi50YWJsZV91c2Vyc1xuICAgICAgV0hFUkUgd2IudGFibGVfdXNlcnMudGFibGVfaWQgSU4gKFxuICAgICAgICBTRUxFQ1Qgd2IudGFibGVzLmlkIEZST00gd2IudGFibGVzXG4gICAgICAgIEpPSU4gd2Iuc2NoZW1hcyBPTiB3Yi50YWJsZXMuc2NoZW1hX2lkPXdiLnNjaGVtYXMuaWRcbiAgICAgICAgV0hFUkUgd2Iuc2NoZW1hcy5uYW1lPSQxXG4gICAgICAgIEFORCB3Yi50YWJsZXMubmFtZT0kMlxuICAgICAgKVxuICAgIGA7XG4gICAgaWYgKHVzZXJFbWFpbHMgJiYgdXNlckVtYWlscy5sZW5ndGggPiAwKSB7XG4gICAgICBwYXJhbXMucHVzaCh1c2VyRW1haWxzLmpvaW4oXCIsXCIpKTtcbiAgICAgIHF1ZXJ5ICs9IGBcbiAgICAgICAgQU5EIHdiLnRhYmxlX3VzZXJzLnVzZXJfaWQgSU4gKFxuICAgICAgICAgIFNFTEVDVCB3Yi51c2Vycy5pZCBmcm9tIHdiLnVzZXJzXG4gICAgICAgICAgV0hFUkUgZW1haWwgSU4gJDNcbiAgICAgICAgKVxuICAgICAgYDtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcnkoe1xuICAgICAgcXVlcnk6IHF1ZXJ5LFxuICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzYXZlVGFibGVVc2VyU2V0dGluZ3MoXG4gICAgdGFibGVJZDogbnVtYmVyLFxuICAgIHVzZXJJZDogbnVtYmVyLFxuICAgIHJvbGVJZDogbnVtYmVyLFxuICAgIHNldHRpbmdzOiBvYmplY3RcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlUXVlcnkoe1xuICAgICAgcXVlcnk6IGBcbiAgICAgICAgSU5TRVJUIElOVE8gd2IudGFibGVfdXNlcnMgKFxuICAgICAgICAgIHRhYmxlX2lkLCB1c2VyX2lkLCByb2xlX2lkLCBzZXR0aW5nc1xuICAgICAgICApXG4gICAgICAgIFZBTFVFUygkMSwgJDIsICQzLCAkNClcbiAgICAgICAgT04gQ09ORkxJQ1QgKHRhYmxlX2lkLCB1c2VyX2lkLCByb2xlX2lkKSBcbiAgICAgICAgRE8gVVBEQVRFIFNFVCBzZXR0aW5ncyA9IEVYQ0xVREVELnNldHRpbmdzXG4gICAgICBgLFxuICAgICAgcGFyYW1zOiBbdGFibGVJZCwgdXNlcklkLCByb2xlSWQsIHNldHRpbmdzXSxcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG4iLCJpbXBvcnQgeyBRdWVyeVJlc3VsdCB9IGZyb20gXCJwZ1wiO1xuaW1wb3J0IHsgQ29uc3RyYWludElkLCBTZXJ2aWNlUmVzdWx0IH0gZnJvbSBcIi4uL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBDb2x1bW4ge1xuICBzdGF0aWMgQ09NTU9OX1RZUEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgIFRleHQ6IFwidGV4dFwiLFxuICAgIE51bWJlcjogXCJpbnRlZ2VyXCIsXG4gICAgRGVjaW1hbDogXCJkZWNpbWFsXCIsXG4gICAgQm9vbGVhbjogXCJib29sZWFuXCIsXG4gICAgRGF0ZTogXCJkYXRlXCIsXG4gICAgXCJEYXRlICYgVGltZVwiOiBcInRpbWVzdGFtcFwiLFxuICB9O1xuXG4gIGlkITogbnVtYmVyO1xuICB0YWJsZUlkITogbnVtYmVyO1xuICBuYW1lITogc3RyaW5nO1xuICBsYWJlbCE6IHN0cmluZztcbiAgdHlwZSE6IHN0cmluZztcbiAgY3JlYXRlZEF0ITogRGF0ZTtcbiAgdXBkYXRlZEF0ITogRGF0ZTtcbiAgLy8gbm90IHBlcnNpc3RlZFxuICBpc1ByaW1hcnlLZXkhOiBib29sZWFuO1xuICBmb3JlaWduS2V5cyE6IFtDb25zdHJhaW50SWRdO1xuICByZWZlcmVuY2VkQnkhOiBbQ29uc3RyYWludElkXTtcblxuICBwdWJsaWMgc3RhdGljIHBhcnNlUmVzdWx0KGRhdGE6IFF1ZXJ5UmVzdWx0IHwgbnVsbCk6IEFycmF5PENvbHVtbj4ge1xuICAgIGlmICghZGF0YSkgdGhyb3cgbmV3IEVycm9yKFwiQ29sdW1uLnBhcnNlUmVzdWx0OiBpbnB1dCBpcyBudWxsXCIpO1xuICAgIGNvbnN0IGNvbHVtbnMgPSBBcnJheTxDb2x1bW4+KCk7XG4gICAgZGF0YS5yb3dzLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG4gICAgICBjb2x1bW5zLnB1c2goQ29sdW1uLnBhcnNlKHJvdykpO1xuICAgIH0pO1xuICAgIHJldHVybiBjb2x1bW5zO1xuICB9XG5cbiAgcHVibGljIHN0YXRpYyBwYXJzZShkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogQ29sdW1uIHtcbiAgICBpZiAoIWRhdGEpIHRocm93IG5ldyBFcnJvcihcIkNvbHVtbi5wYXJzZTogaW5wdXQgaXMgbnVsbFwiKTtcbiAgICBjb25zdCBjb2x1bW4gPSBuZXcgQ29sdW1uKCk7XG4gICAgY29sdW1uLmlkID0gZGF0YS5pZDtcbiAgICBjb2x1bW4udGFibGVJZCA9IGRhdGEudGFibGVfaWQ7XG4gICAgY29sdW1uLm5hbWUgPSBkYXRhLm5hbWU7XG4gICAgY29sdW1uLmxhYmVsID0gZGF0YS5sYWJlbDtcbiAgICBjb2x1bW4udHlwZSA9IGRhdGEudHlwZTtcbiAgICBjb2x1bW4uY3JlYXRlZEF0ID0gZGF0YS5jcmVhdGVkX2F0O1xuICAgIGNvbHVtbi51cGRhdGVkQXQgPSBkYXRhLnVwZGF0ZWRfYXQ7XG4gICAgcmV0dXJuIGNvbHVtbjtcbiAgfVxufVxuIiwiaW1wb3J0IHsgUXVlcnlSZXN1bHQgfSBmcm9tIFwicGdcIjtcblxuZXhwb3J0IHR5cGUgUm9sZU5hbWUgPVxuICB8IFwidGVuYW50X3VzZXJcIlxuICB8IFwidGVuYW50X2FkbWluXCJcbiAgfCBcInNjaGVtYV9vd25lclwiXG4gIHwgXCJzY2hlbWFfYWRtaW5pc3RyYXRvclwiXG4gIHwgXCJzY2hlbWFfZWRpdG9yXCJcbiAgfCBcInNjaGVtYV9jb21tZW50ZXJcIlxuICB8IFwic2NoZW1hX3JlYWRlclwiO1xuXG5leHBvcnQgY2xhc3MgUm9sZSB7XG4gIGlkITogbnVtYmVyO1xuICBuYW1lITogc3RyaW5nO1xuXG4gIHB1YmxpYyBzdGF0aWMgcGFyc2VSZXN1bHQoZGF0YTogUXVlcnlSZXN1bHQgfCBudWxsKTogQXJyYXk8Um9sZT4ge1xuICAgIGlmICghZGF0YSkgdGhyb3cgbmV3IEVycm9yKFwiUm9sZS5wYXJzZVJlc3VsdDogaW5wdXQgaXMgbnVsbFwiKTtcbiAgICBjb25zdCByb2xlcyA9IEFycmF5PFJvbGU+KCk7XG4gICAgZGF0YS5yb3dzLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG4gICAgICByb2xlcy5wdXNoKFJvbGUucGFyc2Uocm93KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJvbGVzO1xuICB9XG5cbiAgcHVibGljIHN0YXRpYyBwYXJzZShkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUm9sZSB7XG4gICAgaWYgKCFkYXRhKSB0aHJvdyBuZXcgRXJyb3IoXCJSb2xlLnBhcnNlOiBpbnB1dCBpcyBudWxsXCIpO1xuICAgIGNvbnN0IHJvbGUgPSBuZXcgUm9sZSgpO1xuICAgIHJvbGUuaWQgPSBkYXRhLmlkO1xuICAgIHJvbGUubmFtZSA9IGRhdGEubmFtZTtcbiAgICByZXR1cm4gcm9sZTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgUXVlcnlSZXN1bHQgfSBmcm9tIFwicGdcIjtcbmltcG9ydCB7IFJvbGVOYW1lIH0gZnJvbSBcIi4vUm9sZVwiO1xuXG5leHBvcnQgY2xhc3MgU2NoZW1hIHtcbiAgc3RhdGljIFNZU19TQ0hFTUFfTkFNRVM6IHN0cmluZ1tdID0gW1xuICAgIFwicHVibGljXCIsXG4gICAgXCJpbmZvcm1hdGlvbl9zY2hlbWFcIixcbiAgICBcImhkYl9jYXRhbG9nXCIsXG4gICAgXCJ3YlwiLFxuICBdO1xuXG4gIGlkITogbnVtYmVyO1xuICBuYW1lITogc3RyaW5nO1xuICBsYWJlbCE6IHN0cmluZztcbiAgdGVuYW50T3duZXJJZD86IG51bWJlcjtcbiAgdXNlck93bmVySWQ/OiBudW1iZXI7XG4gIGNyZWF0ZWRBdCE6IERhdGU7XG4gIHVwZGF0ZWRBdCE6IERhdGU7XG4gIC8vIG5vdCBwZXJzaXN0ZWRcbiAgdXNlclJvbGU/OiBSb2xlTmFtZTtcbiAgY29udGV4dCE6IG9iamVjdDtcblxuICBwdWJsaWMgc3RhdGljIHBhcnNlUmVzdWx0KGRhdGE6IFF1ZXJ5UmVzdWx0IHwgbnVsbCk6IEFycmF5PFNjaGVtYT4ge1xuICAgIGlmICghZGF0YSkgdGhyb3cgbmV3IEVycm9yKFwiU2NoZW1hLnBhcnNlUmVzdWx0OiBpbnB1dCBpcyBudWxsXCIpO1xuICAgIGNvbnN0IHNjaGVtYXMgPSBBcnJheTxTY2hlbWE+KCk7XG4gICAgZGF0YS5yb3dzLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG4gICAgICBzY2hlbWFzLnB1c2goU2NoZW1hLnBhcnNlKHJvdykpO1xuICAgIH0pO1xuICAgIHJldHVybiBzY2hlbWFzO1xuICB9XG5cbiAgcHVibGljIHN0YXRpYyBwYXJzZShkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogU2NoZW1hIHtcbiAgICBpZiAoIWRhdGEpIHRocm93IG5ldyBFcnJvcihcIlNjaGVtYS5wYXJzZTogaW5wdXQgaXMgbnVsbFwiKTtcbiAgICBjb25zdCBzY2hlbWEgPSBuZXcgU2NoZW1hKCk7XG4gICAgc2NoZW1hLmlkID0gZGF0YS5pZDtcbiAgICBzY2hlbWEubmFtZSA9IGRhdGEubmFtZTtcbiAgICBzY2hlbWEubGFiZWwgPSBkYXRhLmxhYmVsO1xuICAgIHNjaGVtYS50ZW5hbnRPd25lcklkID0gZGF0YS50ZW5hbnRPd25lcklkO1xuICAgIHNjaGVtYS51c2VyT3duZXJJZCA9IGRhdGEudXNlck93bmVySWQ7XG4gICAgc2NoZW1hLmNyZWF0ZWRBdCA9IGRhdGEuY3JlYXRlZF9hdDtcbiAgICBzY2hlbWEudXBkYXRlZEF0ID0gZGF0YS51cGRhdGVkX2F0O1xuICAgIHJldHVybiBzY2hlbWE7XG4gIH1cbn1cbiIsImltcG9ydCB7IFF1ZXJ5UmVzdWx0IH0gZnJvbSBcInBnXCI7XG5pbXBvcnQgeyBDb2x1bW4gfSBmcm9tIFwiLlwiO1xuXG5leHBvcnQgY2xhc3MgVGFibGUge1xuICBpZCE6IG51bWJlcjtcbiAgc2NoZW1hSWQhOiBudW1iZXI7XG4gIG5hbWUhOiBzdHJpbmc7XG4gIGxhYmVsITogc3RyaW5nO1xuICBjcmVhdGVkQXQhOiBEYXRlO1xuICB1cGRhdGVkQXQhOiBEYXRlO1xuICAvLyBub3QgcGVyc2lzdGVkXG4gIGNvbHVtbnMhOiBbQ29sdW1uXTtcblxuICBwdWJsaWMgc3RhdGljIHBhcnNlUmVzdWx0KGRhdGE6IFF1ZXJ5UmVzdWx0IHwgbnVsbCk6IEFycmF5PFRhYmxlPiB7XG4gICAgaWYgKCFkYXRhKSB0aHJvdyBuZXcgRXJyb3IoXCJUYWJsZS5wYXJzZVJlc3VsdDogaW5wdXQgaXMgbnVsbFwiKTtcbiAgICBjb25zdCB0YWJsZXMgPSBBcnJheTxUYWJsZT4oKTtcbiAgICBkYXRhLnJvd3MuZm9yRWFjaCgocm93OiBhbnkpID0+IHtcbiAgICAgIHRhYmxlcy5wdXNoKFRhYmxlLnBhcnNlKHJvdykpO1xuICAgIH0pO1xuICAgIHJldHVybiB0YWJsZXM7XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIHBhcnNlKGRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBUYWJsZSB7XG4gICAgaWYgKCFkYXRhKSB0aHJvdyBuZXcgRXJyb3IoXCJUYWJsZS5wYXJzZTogaW5wdXQgaXMgbnVsbFwiKTtcbiAgICBjb25zdCB0YWJsZSA9IG5ldyBUYWJsZSgpO1xuICAgIHRhYmxlLmlkID0gZGF0YS5pZDtcbiAgICB0YWJsZS5zY2hlbWFJZCA9IGRhdGEuc2NoZW1hX2lkO1xuICAgIHRhYmxlLm5hbWUgPSBkYXRhLm5hbWU7XG4gICAgdGFibGUubGFiZWwgPSBkYXRhLmxhYmVsO1xuICAgIHRhYmxlLmNyZWF0ZWRBdCA9IGRhdGEuY3JlYXRlZF9hdDtcbiAgICB0YWJsZS51cGRhdGVkQXQgPSBkYXRhLnVwZGF0ZWRfYXQ7XG4gICAgcmV0dXJuIHRhYmxlO1xuICB9XG59XG4iLCJpbXBvcnQgeyBRdWVyeVJlc3VsdCB9IGZyb20gXCJwZ1wiO1xuXG5leHBvcnQgY2xhc3MgVGFibGVVc2VyIHtcbiAgdGFibGVJZCE6IG51bWJlcjtcbiAgdXNlcklkITogbnVtYmVyO1xuICByb2xlSWQhOiBudW1iZXI7XG4gIHNldHRpbmdzITogb2JqZWN0O1xuICBjcmVhdGVkQXQhOiBEYXRlO1xuICB1cGRhdGVkQXQhOiBEYXRlO1xuXG4gIHB1YmxpYyBzdGF0aWMgcGFyc2VSZXN1bHQoZGF0YTogUXVlcnlSZXN1bHQgfCBudWxsKTogQXJyYXk8VGFibGVVc2VyPiB7XG4gICAgaWYgKCFkYXRhKSB0aHJvdyBuZXcgRXJyb3IoXCJUYWJsZVVzZXIucGFyc2VSZXN1bHQ6IGlucHV0IGlzIG51bGxcIik7XG4gICAgY29uc3QgdGFibGVVc2VycyA9IEFycmF5PFRhYmxlVXNlcj4oKTtcbiAgICBkYXRhLnJvd3MuZm9yRWFjaCgocm93OiBhbnkpID0+IHtcbiAgICAgIHRhYmxlVXNlcnMucHVzaChUYWJsZVVzZXIucGFyc2Uocm93KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhYmxlVXNlcnM7XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIHBhcnNlKGRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBUYWJsZVVzZXIge1xuICAgIGlmICghZGF0YSkgdGhyb3cgbmV3IEVycm9yKFwiVGFibGVVc2VyLnBhcnNlOiBpbnB1dCBpcyBudWxsXCIpO1xuICAgIGNvbnN0IHRhYmxlVXNlciA9IG5ldyBUYWJsZVVzZXIoKTtcbiAgICB0YWJsZVVzZXIudGFibGVJZCA9IGRhdGEudGFibGVfaWQ7XG4gICAgdGFibGVVc2VyLnVzZXJJZCA9IGRhdGEudXNlcl9pZDtcbiAgICB0YWJsZVVzZXIucm9sZUlkID0gZGF0YS5yb2xlX2lkO1xuICAgIHRhYmxlVXNlci5zZXR0aW5ncyA9IGRhdGEuc2V0dGluZ3M7XG4gICAgdGFibGVVc2VyLmNyZWF0ZWRBdCA9IGRhdGEuY3JlYXRlZF9hdDtcbiAgICB0YWJsZVVzZXIudXBkYXRlZEF0ID0gZGF0YS51cGRhdGVkX2F0O1xuICAgIHJldHVybiB0YWJsZVVzZXI7XG4gIH1cbn1cbiIsImltcG9ydCB7IFF1ZXJ5UmVzdWx0IH0gZnJvbSBcInBnXCI7XG5cbmV4cG9ydCBjbGFzcyBUZW5hbnQge1xuICBpZCE6IG51bWJlcjtcbiAgbmFtZSE6IHN0cmluZztcbiAgbGFiZWwhOiBzdHJpbmc7XG4gIGNyZWF0ZWRBdCE6IERhdGU7XG4gIHVwZGF0ZWRBdCE6IERhdGU7XG5cbiAgcHVibGljIHN0YXRpYyBwYXJzZVJlc3VsdChkYXRhOiBRdWVyeVJlc3VsdCB8IG51bGwpOiBBcnJheTxUZW5hbnQ+IHtcbiAgICBpZiAoIWRhdGEpIHRocm93IG5ldyBFcnJvcihcIlRlbmFudC5wYXJzZVJlc3VsdDogaW5wdXQgaXMgbnVsbFwiKTtcbiAgICBjb25zdCB0ZW5hbnRzID0gQXJyYXk8VGVuYW50PigpO1xuICAgIGRhdGEucm93cy5mb3JFYWNoKChyb3c6IGFueSkgPT4ge1xuICAgICAgdGVuYW50cy5wdXNoKFRlbmFudC5wYXJzZShyb3cpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGVuYW50cztcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgcGFyc2UoZGF0YTogUmVjb3JkPHN0cmluZywgYW55Pik6IFRlbmFudCB7XG4gICAgaWYgKCFkYXRhKSB0aHJvdyBuZXcgRXJyb3IoXCJUZW5hbnQucGFyc2U6IGlucHV0IGlzIG51bGxcIik7XG4gICAgY29uc3QgdGVuYW50ID0gbmV3IFRlbmFudCgpO1xuICAgIHRlbmFudC5pZCA9IGRhdGEuaWQ7XG4gICAgdGVuYW50Lm5hbWUgPSBkYXRhLm5hbWU7XG4gICAgdGVuYW50LmxhYmVsID0gZGF0YS5sYWJlbDtcbiAgICB0ZW5hbnQuY3JlYXRlZEF0ID0gZGF0YS5jcmVhdGVkX2F0O1xuICAgIHRlbmFudC51cGRhdGVkQXQgPSBkYXRhLnVwZGF0ZWRfYXQ7XG4gICAgcmV0dXJuIHRlbmFudDtcbiAgfVxufVxuIiwiaW1wb3J0IHsgUXVlcnlSZXN1bHQgfSBmcm9tIFwicGdcIjtcblxuZXhwb3J0IGNsYXNzIFVzZXIge1xuICBpZCE6IG51bWJlcjtcbiAgdGVuYW50X2lkITogbnVtYmVyO1xuICBlbWFpbCE6IHN0cmluZztcbiAgZmlyc3ROYW1lITogc3RyaW5nO1xuICBsYXN0TmFtZSE6IHN0cmluZztcbiAgY3JlYXRlZEF0ITogRGF0ZTtcbiAgdXBkYXRlZEF0ITogRGF0ZTtcblxuICBwdWJsaWMgc3RhdGljIHBhcnNlUmVzdWx0KGRhdGE6IFF1ZXJ5UmVzdWx0IHwgbnVsbCk6IEFycmF5PFVzZXI+IHtcbiAgICBpZiAoIWRhdGEpIHRocm93IG5ldyBFcnJvcihcIlVzZXIucGFyc2VSZXN1bHQ6IGlucHV0IGlzIG51bGxcIik7XG4gICAgY29uc3QgdXNlcnMgPSBBcnJheTxVc2VyPigpO1xuICAgIGRhdGEucm93cy5mb3JFYWNoKChyb3c6IGFueSkgPT4ge1xuICAgICAgdXNlcnMucHVzaChVc2VyLnBhcnNlKHJvdykpO1xuICAgIH0pO1xuICAgIHJldHVybiB1c2VycztcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgcGFyc2UoZGF0YTogUmVjb3JkPHN0cmluZywgYW55Pik6IFVzZXIge1xuICAgIGlmICghZGF0YSkgdGhyb3cgbmV3IEVycm9yKFwiVXNlci5wYXJzZTogaW5wdXQgaXMgbnVsbFwiKTtcbiAgICBjb25zdCB1c2VyID0gbmV3IFVzZXIoKTtcbiAgICB1c2VyLmlkID0gZGF0YS5pZDtcbiAgICB1c2VyLmVtYWlsID0gZGF0YS5lbWFpbDtcbiAgICB1c2VyLmZpcnN0TmFtZSA9IGRhdGEuZmlyc3RfbmFtZTtcbiAgICB1c2VyLmxhc3ROYW1lID0gZGF0YS5sYXN0X25hbWU7XG4gICAgdXNlci5jcmVhdGVkQXQgPSBkYXRhLmNyZWF0ZWRfYXQ7XG4gICAgdXNlci51cGRhdGVkQXQgPSBkYXRhLnVwZGF0ZWRfYXQ7XG4gICAgcmV0dXJuIHVzZXI7XG4gIH1cbn1cbiIsImV4cG9ydCAqIGZyb20gXCIuL1JvbGVcIjtcbmV4cG9ydCAqIGZyb20gXCIuL1NjaGVtYVwiO1xuZXhwb3J0ICogZnJvbSBcIi4vVGFibGVcIjtcbmV4cG9ydCAqIGZyb20gXCIuL0NvbHVtblwiO1xuZXhwb3J0ICogZnJvbSBcIi4vVGFibGVVc2VyXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9UZW5hbnRcIjtcbmV4cG9ydCAqIGZyb20gXCIuL1VzZXJcIjtcbiIsInR5cGUgRW52aXJvbm1lbnQgPSB7XG4gIHNlY3JldE1lc3NhZ2U6IHN0cmluZztcbiAgZGJOYW1lOiBzdHJpbmc7XG4gIGRiSG9zdDogc3RyaW5nO1xuICBkYlBvcnQ6IG51bWJlcjtcbiAgZGJVc2VyOiBzdHJpbmc7XG4gIGRiUGFzc3dvcmQ6IHN0cmluZztcbiAgZGJQb29sTWF4OiBudW1iZXI7XG4gIGRiUG9vbElkbGVUaW1lb3V0TWlsbGlzOiBudW1iZXI7XG4gIGRiUG9vbENvbm5lY3Rpb25UaW1lb3V0TWlsbGlzOiBudW1iZXI7XG4gIGhhc3VyYUhvc3Q6IHN0cmluZztcbiAgaGFzdXJhQWRtaW5TZWNyZXQ6IHN0cmluZztcbn07XG5cbmV4cG9ydCBjb25zdCBlbnZpcm9ubWVudDogRW52aXJvbm1lbnQgPSB7XG4gIHNlY3JldE1lc3NhZ2U6IHByb2Nlc3MuZW52LlNFQ1JFVF9NRVNTQUdFIGFzIHN0cmluZyxcbiAgZGJOYW1lOiBwcm9jZXNzLmVudi5EQl9OQU1FIGFzIHN0cmluZyxcbiAgZGJIb3N0OiBwcm9jZXNzLmVudi5EQl9IT1NUIGFzIHN0cmluZyxcbiAgZGJQb3J0OiBwYXJzZUludChwcm9jZXNzLmVudi5EQl9QT1JUIHx8IFwiXCIpIGFzIG51bWJlcixcbiAgZGJVc2VyOiBwcm9jZXNzLmVudi5EQl9VU0VSIGFzIHN0cmluZyxcbiAgZGJQYXNzd29yZDogcHJvY2Vzcy5lbnYuREJfUEFTU1dPUkQgYXMgc3RyaW5nLFxuICBkYlBvb2xNYXg6IHBhcnNlSW50KHByb2Nlc3MuZW52LkRCX1BPT0xfTUFYIHx8IFwiXCIpIGFzIG51bWJlcixcbiAgZGJQb29sSWRsZVRpbWVvdXRNaWxsaXM6IHBhcnNlSW50KFxuICAgIHByb2Nlc3MuZW52LkRCX1BPT0xfSURMRV9USU1FT1VUX01JTExJUyB8fCBcIlwiXG4gICkgYXMgbnVtYmVyLFxuICBkYlBvb2xDb25uZWN0aW9uVGltZW91dE1pbGxpczogcGFyc2VJbnQoXG4gICAgcHJvY2Vzcy5lbnYuREJfUE9PTF9DT05ORUNUSU9OX1RJTUVPVVRfTUlMTElTIHx8IFwiXCJcbiAgKSBhcyBudW1iZXIsXG4gIGhhc3VyYUhvc3Q6IHByb2Nlc3MuZW52LkhBU1VSQV9IT1NUIGFzIHN0cmluZyxcbiAgaGFzdXJhQWRtaW5TZWNyZXQ6IHByb2Nlc3MuZW52LkhBU1VSQV9BRE1JTl9TRUNSRVQgYXMgc3RyaW5nLFxufTtcbiIsIi8vIGh0dHBzOi8vYWx0cmltLmlvL3Bvc3RzL2F4aW9zLWh0dHAtY2xpZW50LXVzaW5nLXR5cGVzY3JpcHRcblxuaW1wb3J0IGF4aW9zLCB7IEF4aW9zSW5zdGFuY2UsIEF4aW9zUmVzcG9uc2UgfSBmcm9tIFwiYXhpb3NcIjtcbmltcG9ydCB7IGVudmlyb25tZW50IH0gZnJvbSBcIi4vZW52aXJvbm1lbnRcIjtcbmltcG9ydCB7IFNlcnZpY2VSZXN1bHQgfSBmcm9tIFwiLi90eXBlc1wiO1xuaW1wb3J0IHsgbG9nIH0gZnJvbSBcIi4vd2hpdGVicmljay1jbG91ZFwiO1xuXG5jb25zdCBoZWFkZXJzOiBSZWFkb25seTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBib29sZWFuPj4gPSB7XG4gIEFjY2VwdDogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiLFxuICBcIngtaGFzdXJhLWFkbWluLXNlY3JldFwiOiBlbnZpcm9ubWVudC5oYXN1cmFBZG1pblNlY3JldCxcbn07XG5cbmNsYXNzIEhhc3VyYUFwaSB7XG4gIHN0YXRpYyBIQVNVUkFfSUdOT1JFX0NPREVTOiBzdHJpbmdbXSA9IFtcbiAgICBcImFscmVhZHktdW50cmFja2VkXCIsXG4gICAgXCJhbHJlYWR5LXRyYWNrZWRcIixcbiAgICBcIm5vdC1leGlzdHNcIiwgLy8gZHJvcHBpbmcgYSByZWxhdGlvbnNoaXBcbiAgXTtcbiAgcHJpdmF0ZSBpbnN0YW5jZTogQXhpb3NJbnN0YW5jZSB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgZ2V0IGh0dHAoKTogQXhpb3NJbnN0YW5jZSB7XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UgIT0gbnVsbCA/IHRoaXMuaW5zdGFuY2UgOiB0aGlzLmluaXRIYXN1cmFBcGkoKTtcbiAgfVxuXG4gIGluaXRIYXN1cmFBcGkoKSB7XG4gICAgY29uc3QgaHR0cCA9IGF4aW9zLmNyZWF0ZSh7XG4gICAgICBiYXNlVVJMOiBlbnZpcm9ubWVudC5oYXN1cmFIb3N0LFxuICAgICAgaGVhZGVycyxcbiAgICAgIHdpdGhDcmVkZW50aWFsczogZmFsc2UsXG4gICAgfSk7XG5cbiAgICB0aGlzLmluc3RhbmNlID0gaHR0cDtcbiAgICByZXR1cm4gaHR0cDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcG9zdCh0eXBlOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIGFueT4pIHtcbiAgICBsZXQgcmVzdWx0OiBTZXJ2aWNlUmVzdWx0ID0geyBzdWNjZXNzOiBmYWxzZSB9IGFzIFNlcnZpY2VSZXN1bHQ7XG4gICAgdHJ5IHtcbiAgICAgIGxvZy5kZWJ1ZyhgaGFzdXJhQXBpLnBvc3Q6IHR5cGU6ICR7dHlwZX1gLCBhcmdzKTtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5odHRwLnBvc3Q8YW55LCBBeGlvc1Jlc3BvbnNlPihcbiAgICAgICAgXCIvdjEvbWV0YWRhdGFcIixcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgYXJnczogYXJncyxcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgcGF5bG9hZDogcmVzcG9uc2UsXG4gICAgICB9IGFzIFNlcnZpY2VSZXN1bHQ7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmIChlcnJvci5yZXNwb25zZSAmJiBlcnJvci5yZXNwb25zZS5kYXRhKSB7XG4gICAgICAgIGlmICghSGFzdXJhQXBpLkhBU1VSQV9JR05PUkVfQ09ERVMuaW5jbHVkZXMoZXJyb3IucmVzcG9uc2UuZGF0YS5jb2RlKSkge1xuICAgICAgICAgIGxvZy5lcnJvcihlcnJvci5yZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLnJlc3BvbnNlLmRhdGEuZXJyb3IsXG4gICAgICAgICAgICBjb2RlOiBlcnJvci5yZXNwb25zZS5kYXRhLmNvZGUsXG4gICAgICAgICAgfSBhcyBTZXJ2aWNlUmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgfSBhcyBTZXJ2aWNlUmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgfSBhcyBTZXJ2aWNlUmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHRyYWNrVGFibGUoc2NoZW1hTmFtZTogc3RyaW5nLCB0YWJsZU5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucG9zdChcInBnX3RyYWNrX3RhYmxlXCIsIHtcbiAgICAgIHRhYmxlOiB7XG4gICAgICAgIHNjaGVtYTogc2NoZW1hTmFtZSxcbiAgICAgICAgbmFtZTogdGFibGVOYW1lLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBpZiAoXG4gICAgICAhcmVzdWx0LnN1Y2Nlc3MgJiZcbiAgICAgIHJlc3VsdC5jb2RlICYmXG4gICAgICBIYXN1cmFBcGkuSEFTVVJBX0lHTk9SRV9DT0RFUy5pbmNsdWRlcyhyZXN1bHQuY29kZSlcbiAgICApIHtcbiAgICAgIHJldHVybiA8U2VydmljZVJlc3VsdD57XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHBheWxvYWQ6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6IHJlc3VsdC5jb2RlLFxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB1bnRyYWNrVGFibGUoc2NoZW1hTmFtZTogc3RyaW5nLCB0YWJsZU5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucG9zdChcInBnX3VudHJhY2tfdGFibGVcIiwge1xuICAgICAgdGFibGU6IHtcbiAgICAgICAgc2NoZW1hOiBzY2hlbWFOYW1lLFxuICAgICAgICBuYW1lOiB0YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgY2FzY2FkZTogdHJ1ZSxcbiAgICB9KTtcbiAgICBpZiAoXG4gICAgICAhcmVzdWx0LnN1Y2Nlc3MgJiZcbiAgICAgIHJlc3VsdC5jb2RlICYmXG4gICAgICBIYXN1cmFBcGkuSEFTVVJBX0lHTk9SRV9DT0RFUy5pbmNsdWRlcyhyZXN1bHQuY29kZSlcbiAgICApIHtcbiAgICAgIHJldHVybiA8U2VydmljZVJlc3VsdD57XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHBheWxvYWQ6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6IHJlc3VsdC5jb2RlLFxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIGEgcG9zdCBoYXMgb25lIGF1dGhvciAoY29uc3RyYWludCBwb3N0cy5hdXRob3JfaWQgLT4gYXV0aG9ycy5pZClcbiAgcHVibGljIGFzeW5jIGNyZWF0ZU9iamVjdFJlbGF0aW9uc2hpcChcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgdGFibGVOYW1lOiBzdHJpbmcsIC8vIHBvc3RzXG4gICAgY29sdW1uTmFtZTogc3RyaW5nLCAvLyBhdXRob3JfaWRcbiAgICBwYXJlbnRUYWJsZU5hbWU6IHN0cmluZyAvLyBhdXRob3JzXG4gICkge1xuICAgIGxvZy5kZWJ1ZyhcbiAgICAgIGBoYXN1cmFBcGkuY3JlYXRlT2JqZWN0UmVsYXRpb25zaGlwKCR7c2NoZW1hTmFtZX0sICR7dGFibGVOYW1lfSwgJHtjb2x1bW5OYW1lfSwgJHtwYXJlbnRUYWJsZU5hbWV9KWBcbiAgICApO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucG9zdChcInBnX2NyZWF0ZV9vYmplY3RfcmVsYXRpb25zaGlwXCIsIHtcbiAgICAgIG5hbWU6IGBvYmpfJHt0YWJsZU5hbWV9XyR7cGFyZW50VGFibGVOYW1lfWAsIC8vIG9ial9wb3N0c19hdXRob3JzXG4gICAgICB0YWJsZToge1xuICAgICAgICBzY2hlbWE6IHNjaGVtYU5hbWUsXG4gICAgICAgIG5hbWU6IHRhYmxlTmFtZSwgLy8gcG9zdHNcbiAgICAgIH0sXG4gICAgICB1c2luZzoge1xuICAgICAgICBmb3JlaWduX2tleV9jb25zdHJhaW50X29uOiBjb2x1bW5OYW1lLCAvLyBhdXRob3JfaWRcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgaWYgKFxuICAgICAgIXJlc3VsdC5zdWNjZXNzICYmXG4gICAgICByZXN1bHQuY29kZSAmJlxuICAgICAgSGFzdXJhQXBpLkhBU1VSQV9JR05PUkVfQ09ERVMuaW5jbHVkZXMocmVzdWx0LmNvZGUpXG4gICAgKSB7XG4gICAgICByZXR1cm4gPFNlcnZpY2VSZXN1bHQ+e1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBwYXlsb2FkOiB0cnVlLFxuICAgICAgICBtZXNzYWdlOiByZXN1bHQuY29kZSxcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBhbiBhdXRob3IgaGFzIG1hbnkgcG9zdHMgKGNvbnN0cmFpbnQgcG9zdHMuYXV0aG9yX2lkIC0+IGF1dGhvcnMuaWQpXG4gIHB1YmxpYyBhc3luYyBjcmVhdGVBcnJheVJlbGF0aW9uc2hpcChcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgdGFibGVOYW1lOiBzdHJpbmcsIC8vIGF1dGhvcnNcbiAgICBjaGlsZFRhYmxlTmFtZTogc3RyaW5nLCAvLyBwb3N0c1xuICAgIGNoaWxkQ29sdW1uTmFtZXM6IHN0cmluZ1tdIC8vIGF1dGhvcl9pZFxuICApIHtcbiAgICBsb2cuZGVidWcoXG4gICAgICBgaGFzdXJhQXBpLmNyZWF0ZUFycmF5UmVsYXRpb25zaGlwKCR7c2NoZW1hTmFtZX0sICR7dGFibGVOYW1lfSwgJHtjaGlsZFRhYmxlTmFtZX0sICR7Y2hpbGRDb2x1bW5OYW1lc30pYFxuICAgICk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wb3N0KFwicGdfY3JlYXRlX2FycmF5X3JlbGF0aW9uc2hpcFwiLCB7XG4gICAgICBuYW1lOiBgYXJyXyR7dGFibGVOYW1lfV8ke2NoaWxkVGFibGVOYW1lfWAsIC8vIGFycl9hdXRob3JzX3Bvc3RzXG4gICAgICB0YWJsZToge1xuICAgICAgICBzY2hlbWE6IHNjaGVtYU5hbWUsXG4gICAgICAgIG5hbWU6IHRhYmxlTmFtZSwgLy8gYXV0aG9yc1xuICAgICAgfSxcbiAgICAgIHVzaW5nOiB7XG4gICAgICAgIGZvcmVpZ25fa2V5X2NvbnN0cmFpbnRfb246IHtcbiAgICAgICAgICBjb2x1bW46IGNoaWxkQ29sdW1uTmFtZXNbMF0sIC8vIGF1dGhvcl9pZFxuICAgICAgICAgIHRhYmxlOiB7XG4gICAgICAgICAgICBzY2hlbWE6IHNjaGVtYU5hbWUsXG4gICAgICAgICAgICBuYW1lOiBjaGlsZFRhYmxlTmFtZSwgLy8gcG9zdHNcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBpZiAoXG4gICAgICAhcmVzdWx0LnN1Y2Nlc3MgJiZcbiAgICAgIHJlc3VsdC5jb2RlICYmXG4gICAgICBIYXN1cmFBcGkuSEFTVVJBX0lHTk9SRV9DT0RFUy5pbmNsdWRlcyhyZXN1bHQuY29kZSlcbiAgICApIHtcbiAgICAgIHJldHVybiA8U2VydmljZVJlc3VsdD57XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHBheWxvYWQ6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6IHJlc3VsdC5jb2RlLFxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBkcm9wUmVsYXRpb25zaGlwcyhcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgdGFibGVOYW1lOiBzdHJpbmcsIC8vIHBvc3RzXG4gICAgcGFyZW50VGFibGVOYW1lOiBzdHJpbmcgLy8gYXV0aG9yc1xuICApIHtcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgdGhpcy5wb3N0KFwicGdfZHJvcF9yZWxhdGlvbnNoaXBcIiwge1xuICAgICAgdGFibGU6IHtcbiAgICAgICAgc2NoZW1hOiBzY2hlbWFOYW1lLFxuICAgICAgICBuYW1lOiB0YWJsZU5hbWUsIC8vIHBvc3RzXG4gICAgICB9LFxuICAgICAgcmVsYXRpb25zaGlwOiBgb2JqXyR7dGFibGVOYW1lfV8ke3BhcmVudFRhYmxlTmFtZX1gLCAvLyBvYmpfcG9zdHNfYXV0aG9yc1xuICAgIH0pO1xuICAgIGlmIChcbiAgICAgICFyZXN1bHQuc3VjY2VzcyAmJlxuICAgICAgKCFyZXN1bHQuY29kZSB8fFxuICAgICAgICAocmVzdWx0LmNvZGUgJiYgIUhhc3VyYUFwaS5IQVNVUkFfSUdOT1JFX0NPREVTLmluY2x1ZGVzKHJlc3VsdC5jb2RlKSkpXG4gICAgKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICByZXN1bHQgPSBhd2FpdCB0aGlzLnBvc3QoXCJwZ19kcm9wX3JlbGF0aW9uc2hpcFwiLCB7XG4gICAgICB0YWJsZToge1xuICAgICAgICBzY2hlbWE6IHNjaGVtYU5hbWUsXG4gICAgICAgIG5hbWU6IHBhcmVudFRhYmxlTmFtZSwgLy8gYXV0aG9yc1xuICAgICAgfSxcbiAgICAgIHJlbGF0aW9uc2hpcDogYGFycl8ke3BhcmVudFRhYmxlTmFtZX1fJHt0YWJsZU5hbWV9YCwgLy8gYXJyX2F1dGhvcnNfcG9zdHNcbiAgICB9KTtcbiAgICBpZiAoXG4gICAgICAhcmVzdWx0LnN1Y2Nlc3MgJiZcbiAgICAgIHJlc3VsdC5jb2RlICYmXG4gICAgICBIYXN1cmFBcGkuSEFTVVJBX0lHTk9SRV9DT0RFUy5pbmNsdWRlcyhyZXN1bHQuY29kZSlcbiAgICApIHtcbiAgICAgIHJldHVybiA8U2VydmljZVJlc3VsdD57XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHBheWxvYWQ6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6IHJlc3VsdC5jb2RlLFxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgaGFzdXJhQXBpID0gbmV3IEhhc3VyYUFwaSgpO1xuIiwiaW1wb3J0IHsgdHlwZURlZnMgYXMgU2NoZW1hLCByZXNvbHZlcnMgYXMgc2NoZW1hUmVzb2x2ZXJzIH0gZnJvbSBcIi4vc2NoZW1hXCI7XG5pbXBvcnQgeyB0eXBlRGVmcyBhcyBUZW5hbnQsIHJlc29sdmVycyBhcyB0ZW5hbnRSZXNvbHZlcnMgfSBmcm9tIFwiLi90ZW5hbnRcIjtcbmltcG9ydCB7IHR5cGVEZWZzIGFzIFVzZXIsIHJlc29sdmVycyBhcyB1c2VyUmVzb2x2ZXJzIH0gZnJvbSBcIi4vdXNlclwiO1xuaW1wb3J0IHsgdHlwZURlZnMgYXMgVGFibGUsIHJlc29sdmVycyBhcyB0YWJsZVJlc29sdmVycyB9IGZyb20gXCIuL3RhYmxlXCI7XG5pbXBvcnQgeyBtZXJnZSB9IGZyb20gXCJsb2Rhc2hcIjtcbmltcG9ydCB7IGdxbCwgQXBvbGxvRXJyb3IsIElSZXNvbHZlcnMgfSBmcm9tIFwiYXBvbGxvLXNlcnZlci1sYW1iZGFcIjtcbmltcG9ydCB7XG4gIGNvbnN0cmFpbnREaXJlY3RpdmUsXG4gIGNvbnN0cmFpbnREaXJlY3RpdmVUeXBlRGVmcyxcbn0gZnJvbSBcImdyYXBocWwtY29uc3RyYWludC1kaXJlY3RpdmVcIjtcbmltcG9ydCB7IG1ha2VFeGVjdXRhYmxlU2NoZW1hIH0gZnJvbSBcImdyYXBocWwtdG9vbHNcIjtcblxuZXhwb3J0IHR5cGUgU2VydmljZVJlc3VsdCA9XG4gIHwgeyBzdWNjZXNzOiB0cnVlOyBwYXlsb2FkOiBhbnk7IG1lc3NhZ2U/OiBzdHJpbmcgfVxuICB8IHsgc3VjY2VzczogZmFsc2U7IG1lc3NhZ2U6IHN0cmluZzsgY29kZT86IHN0cmluZzsgYXBvbGxvRXJyb3I/OiBzdHJpbmcgfTtcblxuZXhwb3J0IHR5cGUgUXVlcnlQYXJhbXMgPSB7XG4gIHF1ZXJ5OiBzdHJpbmc7XG4gIHBhcmFtcz86IGFueVtdO1xufTtcblxuZXhwb3J0IHR5cGUgQ29uc3RyYWludElkID0ge1xuICBjb25zdHJhaW50TmFtZTogc3RyaW5nO1xuICB0YWJsZU5hbWU6IHN0cmluZztcbiAgY29sdW1uTmFtZTogc3RyaW5nO1xuICByZWxUYWJsZU5hbWU/OiBzdHJpbmc7XG4gIHJlbENvbHVtbk5hbWU/OiBzdHJpbmc7XG59O1xuXG5jb25zdCB0eXBlRGVmcyA9IGdxbGBcbiAgdHlwZSBRdWVyeSB7XG4gICAgd2JIZWFsdGhDaGVjazogU3RyaW5nIVxuICB9XG5cbiAgdHlwZSBNdXRhdGlvbiB7XG4gICAgd2JSZXNldFRlc3REYXRhOiBCb29sZWFuIVxuICB9XG5gO1xuXG5jb25zdCByZXNvbHZlcnM6IElSZXNvbHZlcnMgPSB7XG4gIFF1ZXJ5OiB7XG4gICAgd2JIZWFsdGhDaGVjazogKCkgPT4gXCJBbGwgZ29vZFwiLFxuICB9LFxuICBNdXRhdGlvbjoge1xuICAgIHdiUmVzZXRUZXN0RGF0YTogYXN5bmMgKF8sIF9fLCBjb250ZXh0KSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQucmVzZXRUZXN0RGF0YSgpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5zdWNjZXNzO1xuICAgIH0sXG4gIH0sXG59O1xuXG5leHBvcnQgY29uc3Qgc2NoZW1hID0gbWFrZUV4ZWN1dGFibGVTY2hlbWEoe1xuICB0eXBlRGVmczogW1xuICAgIGNvbnN0cmFpbnREaXJlY3RpdmVUeXBlRGVmcyxcbiAgICB0eXBlRGVmcyxcbiAgICBUZW5hbnQsXG4gICAgVXNlcixcbiAgICBTY2hlbWEsXG4gICAgVGFibGUsXG4gIF0sXG4gIHJlc29sdmVyczogbWVyZ2UoXG4gICAgcmVzb2x2ZXJzLFxuICAgIHRlbmFudFJlc29sdmVycyxcbiAgICB1c2VyUmVzb2x2ZXJzLFxuICAgIHNjaGVtYVJlc29sdmVycyxcbiAgICB0YWJsZVJlc29sdmVyc1xuICApLFxuICBzY2hlbWFUcmFuc2Zvcm1zOiBbY29uc3RyYWludERpcmVjdGl2ZSgpXSxcbn0pO1xuIiwiaW1wb3J0IHsgZ3FsLCBJUmVzb2x2ZXJzIH0gZnJvbSBcImFwb2xsby1zZXJ2ZXItbGFtYmRhXCI7XG5pbXBvcnQgeyBBcG9sbG9FcnJvciB9IGZyb20gXCJhcG9sbG8tc2VydmVyLWxhbWJkYVwiO1xuXG5leHBvcnQgY29uc3QgdHlwZURlZnMgPSBncWxgXG4gIHR5cGUgU2NoZW1hIHtcbiAgICBpZDogSUQhXG4gICAgbmFtZTogU3RyaW5nIVxuICAgIGxhYmVsOiBTdHJpbmchXG4gICAgdGVuYW50T3duZXJJZDogSW50XG4gICAgdXNlck93bmVySWQ6IEludFxuICAgIHVzZXJSb2xlOiBTdHJpbmdcbiAgICBjb250ZXh0OiBKU09OXG4gICAgY3JlYXRlZEF0OiBTdHJpbmchXG4gICAgdXBkYXRlZEF0OiBTdHJpbmchXG4gIH1cblxuICBleHRlbmQgdHlwZSBRdWVyeSB7XG4gICAgd2JTY2hlbWFzKHVzZXJFbWFpbDogU3RyaW5nISk6IFtTY2hlbWFdXG4gIH1cblxuICBleHRlbmQgdHlwZSBNdXRhdGlvbiB7XG4gICAgd2JDcmVhdGVTY2hlbWEoXG4gICAgICBuYW1lOiBTdHJpbmchXG4gICAgICBsYWJlbDogU3RyaW5nIVxuICAgICAgdGVuYW50T3duZXJJZDogSW50XG4gICAgICB0ZW5hbnRPd25lck5hbWU6IFN0cmluZ1xuICAgICAgdXNlck93bmVySWQ6IEludFxuICAgICAgdXNlck93bmVyRW1haWw6IFN0cmluZ1xuICAgICk6IFNjaGVtYVxuICB9XG5gO1xuXG5leHBvcnQgY29uc3QgcmVzb2x2ZXJzOiBJUmVzb2x2ZXJzID0ge1xuICBRdWVyeToge1xuICAgIHdiU2NoZW1hczogYXN5bmMgKF8sIHsgdXNlckVtYWlsIH0sIGNvbnRleHQpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbnRleHQud2JDbG91ZC5hY2Nlc3NpYmxlU2NoZW1hcyh1c2VyRW1haWwpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5wYXlsb2FkO1xuICAgIH0sXG4gIH0sXG4gIE11dGF0aW9uOiB7XG4gICAgd2JDcmVhdGVTY2hlbWE6IGFzeW5jIChcbiAgICAgIF8sXG4gICAgICB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGxhYmVsLFxuICAgICAgICB0ZW5hbnRPd25lcklkLFxuICAgICAgICB0ZW5hbnRPd25lck5hbWUsXG4gICAgICAgIHVzZXJPd25lcklkLFxuICAgICAgICB1c2VyT3duZXJFbWFpbCxcbiAgICAgIH0sXG4gICAgICBjb250ZXh0XG4gICAgKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQuY3JlYXRlU2NoZW1hKFxuICAgICAgICBuYW1lLFxuICAgICAgICBsYWJlbCxcbiAgICAgICAgdGVuYW50T3duZXJJZCxcbiAgICAgICAgdGVuYW50T3duZXJOYW1lLFxuICAgICAgICB1c2VyT3duZXJJZCxcbiAgICAgICAgdXNlck93bmVyRW1haWxcbiAgICAgICk7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB0aHJvdyBjb250ZXh0LndiQ2xvdWQuZXJyKHJlc3VsdCk7XG4gICAgICByZXR1cm4gcmVzdWx0LnBheWxvYWQ7XG4gICAgfSxcbiAgfSxcbn07XG4iLCJpbXBvcnQgeyBncWwsIElSZXNvbHZlcnMgfSBmcm9tIFwiYXBvbGxvLXNlcnZlci1sYW1iZGFcIjtcbmltcG9ydCB7IEdyYXBoUUxKU09OIH0gZnJvbSBcImdyYXBocWwtdHlwZS1qc29uXCI7XG5pbXBvcnQgeyBsb2cgfSBmcm9tIFwiLi4vd2hpdGVicmljay1jbG91ZFwiO1xuXG5leHBvcnQgY29uc3QgdHlwZURlZnMgPSBncWxgXG4gIHNjYWxhciBKU09OXG5cbiAgdHlwZSBUYWJsZSB7XG4gICAgaWQ6IElEIVxuICAgIHNjaGVtYUlkOiBJbnQhXG4gICAgbmFtZTogU3RyaW5nIVxuICAgIGxhYmVsOiBTdHJpbmchXG4gICAgY3JlYXRlZEF0OiBTdHJpbmchXG4gICAgdXBkYXRlZEF0OiBTdHJpbmchXG4gICAgY29sdW1uczogW0NvbHVtbl0hXG4gIH1cblxuICB0eXBlIENvbHVtbiB7XG4gICAgaWQ6IElEIVxuICAgIHRhYmxlSWQ6IEludCFcbiAgICBuYW1lOiBTdHJpbmchXG4gICAgbGFiZWw6IFN0cmluZyFcbiAgICB0eXBlOiBTdHJpbmchXG4gICAgaXNQcmltYXJ5S2V5OiBCb29sZWFuIVxuICAgIGZvcmVpZ25LZXlzOiBbQ29uc3RyYWludElkXSFcbiAgICByZWZlcmVuY2VkQnk6IFtDb25zdHJhaW50SWRdIVxuICAgIGNyZWF0ZWRBdDogU3RyaW5nIVxuICAgIHVwZGF0ZWRBdDogU3RyaW5nIVxuICB9XG5cbiAgdHlwZSBDb25zdHJhaW50SWQge1xuICAgIGNvbnN0cmFpbnROYW1lOiBTdHJpbmchXG4gICAgdGFibGVOYW1lOiBTdHJpbmchXG4gICAgY29sdW1uTmFtZTogU3RyaW5nIVxuICAgIHJlbFRhYmxlTmFtZTogU3RyaW5nXG4gICAgcmVsQ29sdW1uTmFtZTogU3RyaW5nXG4gIH1cblxuICB0eXBlIFRhYmxlVXNlciB7XG4gICAgdGFibGVJZDogSW50IVxuICAgIHVzZXJJZDogSW50IVxuICAgIHJvbGVJZDogSW50IVxuICAgIHNldHRpbmdzOiBKU09OXG4gICAgY3JlYXRlZEF0OiBTdHJpbmchXG4gICAgdXBkYXRlZEF0OiBTdHJpbmchXG4gIH1cblxuICBleHRlbmQgdHlwZSBRdWVyeSB7XG4gICAgd2JUYWJsZXMoc2NoZW1hTmFtZTogU3RyaW5nISk6IFtUYWJsZV1cbiAgICB3YkNvbHVtbnMoc2NoZW1hTmFtZTogU3RyaW5nISwgdGFibGVOYW1lOiBTdHJpbmchKTogW0NvbHVtbl1cbiAgICB3YlRhYmxlVXNlcihcbiAgICAgIHVzZXJFbWFpbDogU3RyaW5nIVxuICAgICAgc2NoZW1hTmFtZTogU3RyaW5nIVxuICAgICAgdGFibGVOYW1lOiBTdHJpbmchXG4gICAgKTogVGFibGVVc2VyXG4gIH1cblxuICBleHRlbmQgdHlwZSBNdXRhdGlvbiB7XG4gICAgd2JBZGRPckNyZWF0ZVRhYmxlKFxuICAgICAgc2NoZW1hTmFtZTogU3RyaW5nIVxuICAgICAgdGFibGVOYW1lOiBTdHJpbmchXG4gICAgICB0YWJsZUxhYmVsOiBTdHJpbmchXG4gICAgICBjcmVhdGU6IEJvb2xlYW5cbiAgICApOiBCb29sZWFuIVxuICAgIHdiVXBkYXRlVGFibGUoXG4gICAgICBzY2hlbWFOYW1lOiBTdHJpbmchXG4gICAgICB0YWJsZU5hbWU6IFN0cmluZyFcbiAgICAgIG5ld1RhYmxlTmFtZTogU3RyaW5nXG4gICAgICBuZXdUYWJsZUxhYmVsOiBTdHJpbmdcbiAgICApOiBCb29sZWFuIVxuICAgIHdiQWRkQWxsRXhpc3RpbmdUYWJsZXMoc2NoZW1hTmFtZTogU3RyaW5nISk6IEJvb2xlYW4hXG4gICAgd2JBZGRPckNyZWF0ZUNvbHVtbihcbiAgICAgIHNjaGVtYU5hbWU6IFN0cmluZyFcbiAgICAgIHRhYmxlTmFtZTogU3RyaW5nIVxuICAgICAgY29sdW1uTmFtZTogU3RyaW5nIVxuICAgICAgY29sdW1uTGFiZWw6IFN0cmluZyFcbiAgICAgIGNyZWF0ZTogQm9vbGVhblxuICAgICAgY29sdW1uVHlwZTogU3RyaW5nXG4gICAgKTogQm9vbGVhbiFcbiAgICB3YkNyZWF0ZU9yRGVsZXRlUHJpbWFyeUtleShcbiAgICAgIHNjaGVtYU5hbWU6IFN0cmluZyFcbiAgICAgIHRhYmxlTmFtZTogU3RyaW5nIVxuICAgICAgY29sdW1uTmFtZXM6IFtTdHJpbmddIVxuICAgICAgZGVsOiBCb29sZWFuXG4gICAgKTogQm9vbGVhbiFcbiAgICB3YkFkZE9yQ3JlYXRlRm9yZWlnbktleShcbiAgICAgIHNjaGVtYU5hbWU6IFN0cmluZyFcbiAgICAgIHRhYmxlTmFtZTogU3RyaW5nIVxuICAgICAgY29sdW1uTmFtZXM6IFtTdHJpbmddIVxuICAgICAgcGFyZW50VGFibGVOYW1lOiBTdHJpbmchXG4gICAgICBwYXJlbnRDb2x1bW5OYW1lczogW1N0cmluZ10hXG4gICAgICBjcmVhdGU6IEJvb2xlYW5cbiAgICApOiBCb29sZWFuIVxuICAgIHdiUmVtb3ZlT3JEZWxldGVGb3JlaWduS2V5KFxuICAgICAgc2NoZW1hTmFtZTogU3RyaW5nIVxuICAgICAgdGFibGVOYW1lOiBTdHJpbmchXG4gICAgICBjb2x1bW5OYW1lczogW1N0cmluZ10hXG4gICAgICBwYXJlbnRUYWJsZU5hbWU6IFN0cmluZyFcbiAgICAgIGRlbDogQm9vbGVhblxuICAgICk6IEJvb2xlYW4hXG4gICAgd2JTYXZlVGFibGVVc2VyU2V0dGluZ3MoXG4gICAgICB1c2VyRW1haWw6IFN0cmluZyFcbiAgICAgIHNjaGVtYU5hbWU6IFN0cmluZyFcbiAgICAgIHRhYmxlTmFtZTogU3RyaW5nIVxuICAgICAgc2V0dGluZ3M6IEpTT04hXG4gICAgKTogQm9vbGVhbiFcbiAgfVxuYDtcbi8vIFNHLVRCRDogY29weSBhYm92ZSB3YkFkZEFsbEV4aXN0aW5nVGFibGVzIGFuZCBlZGl0IGZvciB3YkFkZEFsbEV4aXN0aW5nUmVsYXRpb25zaGlwc1xuXG5leHBvcnQgY29uc3QgcmVzb2x2ZXJzOiBJUmVzb2x2ZXJzID0ge1xuICBKU09OOiBHcmFwaFFMSlNPTixcbiAgUXVlcnk6IHtcbiAgICB3YlRhYmxlczogYXN5bmMgKF8sIHsgc2NoZW1hTmFtZSB9LCBjb250ZXh0KSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQudGFibGVzKHNjaGVtYU5hbWUpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5wYXlsb2FkO1xuICAgIH0sXG4gICAgd2JDb2x1bW5zOiBhc3luYyAoXywgeyBzY2hlbWFOYW1lLCB0YWJsZU5hbWUgfSwgY29udGV4dCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29udGV4dC53YkNsb3VkLmNvbHVtbnMoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRocm93IGNvbnRleHQud2JDbG91ZC5lcnIocmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQucGF5bG9hZDtcbiAgICB9LFxuICAgIHdiVGFibGVVc2VyOiBhc3luYyAoXywgeyBzY2hlbWFOYW1lLCB0YWJsZU5hbWUsIHVzZXJFbWFpbCB9LCBjb250ZXh0KSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQudGFibGVVc2VyKFxuICAgICAgICB1c2VyRW1haWwsXG4gICAgICAgIHNjaGVtYU5hbWUsXG4gICAgICAgIHRhYmxlTmFtZVxuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRocm93IGNvbnRleHQud2JDbG91ZC5lcnIocmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQucGF5bG9hZDtcbiAgICB9LFxuICB9LFxuICBNdXRhdGlvbjoge1xuICAgIHdiQWRkT3JDcmVhdGVUYWJsZTogYXN5bmMgKFxuICAgICAgXyxcbiAgICAgIHsgc2NoZW1hTmFtZSwgdGFibGVOYW1lLCB0YWJsZUxhYmVsLCBjcmVhdGUgfSxcbiAgICAgIGNvbnRleHRcbiAgICApID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbnRleHQud2JDbG91ZC5hZGRPckNyZWF0ZVRhYmxlKFxuICAgICAgICBzY2hlbWFOYW1lLFxuICAgICAgICB0YWJsZU5hbWUsXG4gICAgICAgIHRhYmxlTGFiZWwsXG4gICAgICAgIGNyZWF0ZVxuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRocm93IGNvbnRleHQud2JDbG91ZC5lcnIocmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQuc3VjY2VzcztcbiAgICB9LFxuICAgIHdiVXBkYXRlVGFibGU6IGFzeW5jIChcbiAgICAgIF8sXG4gICAgICB7IHNjaGVtYU5hbWUsIHRhYmxlTmFtZSwgbmV3VGFibGVOYW1lLCBuZXdUYWJsZUxhYmVsIH0sXG4gICAgICBjb250ZXh0XG4gICAgKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQudXBkYXRlVGFibGUoXG4gICAgICAgIHNjaGVtYU5hbWUsXG4gICAgICAgIHRhYmxlTmFtZSxcbiAgICAgICAgbmV3VGFibGVOYW1lLFxuICAgICAgICBuZXdUYWJsZUxhYmVsXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5zdWNjZXNzO1xuICAgIH0sXG4gICAgd2JBZGRBbGxFeGlzdGluZ1RhYmxlczogYXN5bmMgKF8sIHsgc2NoZW1hTmFtZSB9LCBjb250ZXh0KSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQuYWRkQWxsRXhpc3RpbmdUYWJsZXMoc2NoZW1hTmFtZSk7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB0aHJvdyBjb250ZXh0LndiQ2xvdWQuZXJyKHJlc3VsdCk7XG4gICAgICByZXR1cm4gcmVzdWx0LnN1Y2Nlc3M7XG4gICAgfSxcbiAgICAvLyBTRy1UQkQ6IGNvcHkgYWJvdmUgYmxvY2sgYW5kIGVkaXQgZm9yIHdiQWRkQWxsRXhpc3RpbmdSZWxhdGlvbnNoaXBzXG4gICAgd2JBZGRPckNyZWF0ZUNvbHVtbjogYXN5bmMgKFxuICAgICAgXyxcbiAgICAgIHsgc2NoZW1hTmFtZSwgdGFibGVOYW1lLCBjb2x1bW5OYW1lLCBjb2x1bW5MYWJlbCwgY3JlYXRlLCBjb2x1bW5UeXBlIH0sXG4gICAgICBjb250ZXh0XG4gICAgKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQuYWRkT3JDcmVhdGVDb2x1bW4oXG4gICAgICAgIHNjaGVtYU5hbWUsXG4gICAgICAgIHRhYmxlTmFtZSxcbiAgICAgICAgY29sdW1uTmFtZSxcbiAgICAgICAgY29sdW1uTGFiZWwsXG4gICAgICAgIGNyZWF0ZSxcbiAgICAgICAgY29sdW1uVHlwZVxuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRocm93IGNvbnRleHQud2JDbG91ZC5lcnIocmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQuc3VjY2VzcztcbiAgICB9LFxuICAgIHdiQ3JlYXRlT3JEZWxldGVQcmltYXJ5S2V5OiBhc3luYyAoXG4gICAgICBfLFxuICAgICAgeyBzY2hlbWFOYW1lLCB0YWJsZU5hbWUsIGNvbHVtbk5hbWVzLCBkZWwgfSxcbiAgICAgIGNvbnRleHRcbiAgICApID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbnRleHQud2JDbG91ZC5jcmVhdGVPckRlbGV0ZVByaW1hcnlLZXkoXG4gICAgICAgIHNjaGVtYU5hbWUsXG4gICAgICAgIHRhYmxlTmFtZSxcbiAgICAgICAgY29sdW1uTmFtZXMsXG4gICAgICAgIGRlbFxuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRocm93IGNvbnRleHQud2JDbG91ZC5lcnIocmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQuc3VjY2VzcztcbiAgICB9LFxuICAgIHdiQWRkT3JDcmVhdGVGb3JlaWduS2V5OiBhc3luYyAoXG4gICAgICBfLFxuICAgICAge1xuICAgICAgICBzY2hlbWFOYW1lLFxuICAgICAgICB0YWJsZU5hbWUsXG4gICAgICAgIGNvbHVtbk5hbWVzLFxuICAgICAgICBwYXJlbnRUYWJsZU5hbWUsXG4gICAgICAgIHBhcmVudENvbHVtbk5hbWVzLFxuICAgICAgICBjcmVhdGUsXG4gICAgICB9LFxuICAgICAgY29udGV4dFxuICAgICkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29udGV4dC53YkNsb3VkLmFkZE9yQ3JlYXRlRm9yZWlnbktleShcbiAgICAgICAgc2NoZW1hTmFtZSxcbiAgICAgICAgdGFibGVOYW1lLFxuICAgICAgICBjb2x1bW5OYW1lcyxcbiAgICAgICAgcGFyZW50VGFibGVOYW1lLFxuICAgICAgICBwYXJlbnRDb2x1bW5OYW1lcyxcbiAgICAgICAgY3JlYXRlXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5zdWNjZXNzO1xuICAgIH0sXG4gICAgd2JSZW1vdmVPckRlbGV0ZUZvcmVpZ25LZXk6IGFzeW5jIChcbiAgICAgIF8sXG4gICAgICB7XG4gICAgICAgIHNjaGVtYU5hbWUsXG4gICAgICAgIHRhYmxlTmFtZSxcbiAgICAgICAgY29sdW1uTmFtZXMsXG4gICAgICAgIHBhcmVudFRhYmxlTmFtZSxcbiAgICAgICAgcGFyZW50Q29sdW1uTmFtZXMsXG4gICAgICAgIGRlbCxcbiAgICAgIH0sXG4gICAgICBjb250ZXh0XG4gICAgKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQucmVtb3ZlT3JEZWxldGVGb3JlaWduS2V5KFxuICAgICAgICBzY2hlbWFOYW1lLFxuICAgICAgICB0YWJsZU5hbWUsXG4gICAgICAgIGNvbHVtbk5hbWVzLFxuICAgICAgICBwYXJlbnRUYWJsZU5hbWUsXG4gICAgICAgIGRlbFxuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRocm93IGNvbnRleHQud2JDbG91ZC5lcnIocmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQuc3VjY2VzcztcbiAgICB9LFxuICAgIHdiU2F2ZVRhYmxlVXNlclNldHRpbmdzOiBhc3luYyAoXG4gICAgICBfLFxuICAgICAgeyBzY2hlbWFOYW1lLCB0YWJsZU5hbWUsIHVzZXJFbWFpbCwgc2V0dGluZ3MgfSxcbiAgICAgIGNvbnRleHRcbiAgICApID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbnRleHQud2JDbG91ZC5zYXZlVGFibGVVc2VyU2V0dGluZ3MoXG4gICAgICAgIHNjaGVtYU5hbWUsXG4gICAgICAgIHRhYmxlTmFtZSxcbiAgICAgICAgdXNlckVtYWlsLFxuICAgICAgICBzZXR0aW5nc1xuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRocm93IGNvbnRleHQud2JDbG91ZC5lcnIocmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQuc3VjY2VzcztcbiAgICB9LFxuICB9LFxufTtcbiIsImltcG9ydCB7IGdxbCwgSVJlc29sdmVycyB9IGZyb20gXCJhcG9sbG8tc2VydmVyLWxhbWJkYVwiO1xuaW1wb3J0IHsgQXBvbGxvRXJyb3IgfSBmcm9tIFwiYXBvbGxvLXNlcnZlci1sYW1iZGFcIjtcblxuZXhwb3J0IGNvbnN0IHR5cGVEZWZzID0gZ3FsYFxuICB0eXBlIFRlbmFudCB7XG4gICAgaWQ6IElEIVxuICAgIG5hbWU6IFN0cmluZyFcbiAgICBsYWJlbDogU3RyaW5nIVxuICAgIGNyZWF0ZWRBdDogU3RyaW5nIVxuICAgIHVwZGF0ZWRBdDogU3RyaW5nIVxuICB9XG5cbiAgZXh0ZW5kIHR5cGUgUXVlcnkge1xuICAgIHdiVGVuYW50czogW1RlbmFudF1cbiAgICB3YlRlbmFudEJ5SWQoaWQ6IElEISk6IFRlbmFudFxuICAgIHdiVGVuYW50QnlOYW1lKG5hbWU6IFN0cmluZyEpOiBUZW5hbnRcbiAgfVxuXG4gIGV4dGVuZCB0eXBlIE11dGF0aW9uIHtcbiAgICB3YkNyZWF0ZVRlbmFudChuYW1lOiBTdHJpbmchLCBsYWJlbDogU3RyaW5nISk6IFRlbmFudFxuICAgIHdiVXBkYXRlVGVuYW50KGlkOiBJRCEsIG5hbWU6IFN0cmluZywgbGFiZWw6IFN0cmluZyk6IFRlbmFudFxuICB9XG5gO1xuXG5leHBvcnQgY29uc3QgcmVzb2x2ZXJzOiBJUmVzb2x2ZXJzID0ge1xuICBRdWVyeToge1xuICAgIHdiVGVuYW50czogYXN5bmMgKF8sIF9fLCBjb250ZXh0KSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQudGVuYW50cygpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5wYXlsb2FkO1xuICAgIH0sXG4gICAgd2JUZW5hbnRCeUlkOiBhc3luYyAoXywgeyBpZCB9LCBjb250ZXh0KSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQudGVuYW50QnlJZChpZCk7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB0aHJvdyBjb250ZXh0LndiQ2xvdWQuZXJyKHJlc3VsdCk7XG4gICAgICByZXR1cm4gcmVzdWx0LnBheWxvYWQ7XG4gICAgfSxcbiAgICB3YlRlbmFudEJ5TmFtZTogYXN5bmMgKF8sIHsgbmFtZSB9LCBjb250ZXh0KSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQudGVuYW50QnlOYW1lKG5hbWUpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5wYXlsb2FkO1xuICAgIH0sXG4gIH0sXG4gIE11dGF0aW9uOiB7XG4gICAgd2JDcmVhdGVUZW5hbnQ6IGFzeW5jIChfLCB7IG5hbWUsIGxhYmVsIH0sIGNvbnRleHQpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbnRleHQud2JDbG91ZC5jcmVhdGVUZW5hbnQobmFtZSwgbGFiZWwpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5wYXlsb2FkO1xuICAgIH0sXG4gICAgd2JVcGRhdGVUZW5hbnQ6IGFzeW5jIChfLCB7IGlkLCBuYW1lLCBsYWJlbCB9LCBjb250ZXh0KSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250ZXh0LndiQ2xvdWQudXBkYXRlVGVuYW50KGlkLCBuYW1lLCBsYWJlbCk7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB0aHJvdyBjb250ZXh0LndiQ2xvdWQuZXJyKHJlc3VsdCk7XG4gICAgICByZXR1cm4gcmVzdWx0LnBheWxvYWQ7XG4gICAgfSxcbiAgfSxcbn07XG4iLCJpbXBvcnQgeyBncWwsIElSZXNvbHZlcnMgfSBmcm9tIFwiYXBvbGxvLXNlcnZlci1sYW1iZGFcIjtcbmltcG9ydCB7IEFwb2xsb0Vycm9yIH0gZnJvbSBcImFwb2xsby1zZXJ2ZXItbGFtYmRhXCI7XG5cbmV4cG9ydCBjb25zdCB0eXBlRGVmcyA9IGdxbGBcbiAgdHlwZSBVc2VyIHtcbiAgICBpZDogSUQhXG4gICAgZW1haWw6IFN0cmluZyFcbiAgICBmaXJzdE5hbWU6IFN0cmluZ1xuICAgIGxhc3ROYW1lOiBTdHJpbmdcbiAgICBjcmVhdGVkQXQ6IFN0cmluZyFcbiAgICB1cGRhdGVkQXQ6IFN0cmluZyFcbiAgfVxuXG4gIGV4dGVuZCB0eXBlIFF1ZXJ5IHtcbiAgICB3YlVzZXJzQnlUZW5hbnRJZCh0ZW5hbnRJZDogSUQhKTogW1VzZXJdXG4gICAgd2JVc2VyQnlJZChpZDogSUQhKTogVXNlclxuICAgIHdiVXNlckJ5RW1haWwoZW1haWw6IFN0cmluZyEpOiBVc2VyXG4gIH1cblxuICBleHRlbmQgdHlwZSBNdXRhdGlvbiB7XG4gICAgd2JDcmVhdGVVc2VyKGVtYWlsOiBTdHJpbmchLCBmaXJzdE5hbWU6IFN0cmluZywgbGFzdE5hbWU6IFN0cmluZyk6IFVzZXJcbiAgICB3YlVwZGF0ZVVzZXIoXG4gICAgICBpZDogSUQhXG4gICAgICBlbWFpbDogU3RyaW5nXG4gICAgICBmaXJzdE5hbWU6IFN0cmluZ1xuICAgICAgbGFzdE5hbWU6IFN0cmluZ1xuICAgICk6IFVzZXJcbiAgICBcIlwiXCJcbiAgICBUZW5hbnQtVXNlci1Sb2xlc1xuICAgIFwiXCJcIlxuICAgIHdiQWRkVXNlclRvVGVuYW50KFxuICAgICAgdGVuYW50TmFtZTogU3RyaW5nIVxuICAgICAgdXNlckVtYWlsOiBTdHJpbmchXG4gICAgICB0ZW5hbnRSb2xlOiBTdHJpbmchXG4gICAgKTogVXNlclxuICAgIFwiXCJcIlxuICAgIFNjaGVtYS1Vc2VyLVJvbGVzXG4gICAgXCJcIlwiXG4gICAgd2JBZGRVc2VyVG9TY2hlbWEoXG4gICAgICBzY2hlbWFOYW1lOiBTdHJpbmchXG4gICAgICB1c2VyRW1haWw6IFN0cmluZyFcbiAgICAgIHNjaGVtYVJvbGU6IFN0cmluZyFcbiAgICApOiBVc2VyXG4gIH1cbmA7XG5cbmV4cG9ydCBjb25zdCByZXNvbHZlcnM6IElSZXNvbHZlcnMgPSB7XG4gIFF1ZXJ5OiB7XG4gICAgd2JVc2Vyc0J5VGVuYW50SWQ6IGFzeW5jIChfLCB7IHRlbmFudElkIH0sIGNvbnRleHQpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbnRleHQud2JDbG91ZC51c2Vyc0J5VGVuYW50SWQodGVuYW50SWQpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5wYXlsb2FkO1xuICAgIH0sXG4gICAgd2JVc2VyQnlJZDogYXN5bmMgKF8sIHsgaWQgfSwgY29udGV4dCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29udGV4dC53YkNsb3VkLnVzZXJCeUlkKGlkKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRocm93IGNvbnRleHQud2JDbG91ZC5lcnIocmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQucGF5bG9hZDtcbiAgICB9LFxuICAgIHdiVXNlckJ5RW1haWw6IGFzeW5jIChfLCB7IGVtYWlsIH0sIGNvbnRleHQpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbnRleHQud2JDbG91ZC51c2VyQnlFbWFpbChlbWFpbCk7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB0aHJvdyBjb250ZXh0LndiQ2xvdWQuZXJyKHJlc3VsdCk7XG4gICAgICByZXR1cm4gcmVzdWx0LnBheWxvYWQ7XG4gICAgfSxcbiAgfSxcbiAgTXV0YXRpb246IHtcbiAgICAvLyBVc2Vyc1xuICAgIHdiQ3JlYXRlVXNlcjogYXN5bmMgKF8sIHsgZW1haWwsIGZpcnN0TmFtZSwgbGFzdE5hbWUgfSwgY29udGV4dCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29udGV4dC53YkNsb3VkLmNyZWF0ZVVzZXIoXG4gICAgICAgIGVtYWlsLFxuICAgICAgICBmaXJzdE5hbWUsXG4gICAgICAgIGxhc3ROYW1lXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5wYXlsb2FkO1xuICAgIH0sXG4gICAgd2JVcGRhdGVVc2VyOiBhc3luYyAoXywgeyBpZCwgZW1haWwsIGZpcnN0TmFtZSwgbGFzdE5hbWUgfSwgY29udGV4dCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29udGV4dC53YkNsb3VkLnVwZGF0ZVVzZXIoXG4gICAgICAgIGlkLFxuICAgICAgICBlbWFpbCxcbiAgICAgICAgZmlyc3ROYW1lLFxuICAgICAgICBsYXN0TmFtZVxuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRocm93IGNvbnRleHQud2JDbG91ZC5lcnIocmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQucGF5bG9hZDtcbiAgICB9LFxuICAgIC8vIFRlbmFudC1Vc2VyLVJvbGVzXG4gICAgd2JBZGRVc2VyVG9UZW5hbnQ6IGFzeW5jIChcbiAgICAgIF8sXG4gICAgICB7IHRlbmFudE5hbWUsIHVzZXJFbWFpbCwgdGVuYW50Um9sZSB9LFxuICAgICAgY29udGV4dFxuICAgICkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29udGV4dC53YkNsb3VkLmFkZFVzZXJUb1RlbmFudChcbiAgICAgICAgdGVuYW50TmFtZSxcbiAgICAgICAgdXNlckVtYWlsLFxuICAgICAgICB0ZW5hbnRSb2xlXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgdGhyb3cgY29udGV4dC53YkNsb3VkLmVycihyZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5wYXlsb2FkO1xuICAgIH0sXG4gICAgLy8gVGVuYW50LVNjaGVtYS1Sb2xlc1xuICAgIHdiQWRkVXNlclRvU2NoZW1hOiBhc3luYyAoXG4gICAgICBfLFxuICAgICAgeyBzY2hlbWFOYW1lLCB1c2VyRW1haWwsIHNjaGVtYVJvbGUgfSxcbiAgICAgIGNvbnRleHRcbiAgICApID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbnRleHQud2JDbG91ZC5hZGRVc2VyVG9TY2hlbWEoXG4gICAgICAgIHNjaGVtYU5hbWUsXG4gICAgICAgIHVzZXJFbWFpbCxcbiAgICAgICAgc2NoZW1hUm9sZVxuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHRocm93IGNvbnRleHQud2JDbG91ZC5lcnIocmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQucGF5bG9hZDtcbiAgICB9LFxuICB9LFxufTtcbiIsImltcG9ydCB7IEFwb2xsb1NlcnZlciwgQXBvbGxvRXJyb3IgfSBmcm9tIFwiYXBvbGxvLXNlcnZlci1sYW1iZGFcIjtcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJ0c2xvZ1wiO1xuaW1wb3J0IHsgREFMIH0gZnJvbSBcIi4vZGFsXCI7XG5pbXBvcnQgeyBoYXN1cmFBcGkgfSBmcm9tIFwiLi9oYXN1cmEtYXBpXCI7XG5pbXBvcnQgeyBDb25zdHJhaW50SWQsIHNjaGVtYSwgU2VydmljZVJlc3VsdCB9IGZyb20gXCIuL3R5cGVzXCI7XG5pbXBvcnQgdiA9IHJlcXVpcmUoXCJ2b2NhXCIpO1xuaW1wb3J0IHsgQ29sdW1uLCBTY2hlbWEgfSBmcm9tIFwiLi9lbnRpdHlcIjtcbmltcG9ydCB7IGlzVGhpc1R5cGVOb2RlIH0gZnJvbSBcInR5cGVzY3JpcHRcIjtcblxuZXhwb3J0IGNvbnN0IGdyYXBocWxIYW5kbGVyID0gbmV3IEFwb2xsb1NlcnZlcih7XG4gIHNjaGVtYSxcbiAgaW50cm9zcGVjdGlvbjogdHJ1ZSxcbiAgY29udGV4dDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICB3YkNsb3VkOiBuZXcgV2hpdGVicmlja0Nsb3VkKCksXG4gICAgfTtcbiAgfSxcbn0pLmNyZWF0ZUhhbmRsZXIoKTtcblxuZXhwb3J0IGNvbnN0IGxvZzogTG9nZ2VyID0gbmV3IExvZ2dlcih7XG4gIG1pbkxldmVsOiBcImRlYnVnXCIsXG59KTtcblxuY2xhc3MgV2hpdGVicmlja0Nsb3VkIHtcbiAgZGFsID0gbmV3IERBTCgpO1xuXG4gIHB1YmxpYyBlcnIocmVzdWx0OiBTZXJ2aWNlUmVzdWx0KTogRXJyb3Ige1xuICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcihcbiAgICAgICAgXCJXaGl0ZWJyaWNrQ2xvdWQuZXJyOiByZXN1bHQgaXMgbm90IGFuIGVycm9yIChzdWNjZXNzPT10cnVlKVwiXG4gICAgICApO1xuICAgIH1cbiAgICBsZXQgYXBvbGxvRXJyb3IgPSBcIklOVEVSTkFMX1NFUlZFUl9FUlJPUlwiO1xuICAgIGlmIChyZXN1bHQuYXBvbGxvRXJyb3IpIGFwb2xsb0Vycm9yID0gcmVzdWx0LmFwb2xsb0Vycm9yO1xuICAgIHJldHVybiBuZXcgQXBvbGxvRXJyb3IocmVzdWx0Lm1lc3NhZ2UsIGFwb2xsb0Vycm9yLCB7XG4gICAgICByZWY6IHJlc3VsdC5jb2RlLFxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGFkZFNjaGVtYUNvbnRleHQoc2NoZW1hOiBTY2hlbWEpOiBTY2hlbWEge1xuICAgIHNjaGVtYS5jb250ZXh0ID0ge1xuICAgICAgZGVmYXVsdENvbHVtblR5cGVzOiBDb2x1bW4uQ09NTU9OX1RZUEVTLFxuICAgIH07XG4gICAgcmV0dXJuIHNjaGVtYTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUZXN0XG4gICAqL1xuXG4gIHB1YmxpYyBhc3luYyByZXNldFRlc3REYXRhKCk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC5zY2hlbWFzKFwidGVzdF8lXCIpO1xuICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgZm9yIChjb25zdCBzY2hlbWEgb2YgcmVzdWx0LnBheWxvYWQpIHtcbiAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMucmVtb3ZlT3JEZWxldGVTY2hlbWEoc2NoZW1hLm5hbWUsIHRydWUpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwuZGVsZXRlVGVzdFRlbmFudHMoKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLmRlbGV0ZVRlc3RVc2VycygpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogVGVuYW50c1xuICAgKiBUQkQ6IHZhbGlkYXRlIG5hbWUgfiBbYS16XXsxfVthLXowLTldezIsfVxuICAgKi9cblxuICBwdWJsaWMgYXN5bmMgdGVuYW50cygpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICByZXR1cm4gdGhpcy5kYWwudGVuYW50cygpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHRlbmFudEJ5SWQoaWQ6IG51bWJlcik6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIHJldHVybiB0aGlzLmRhbC50ZW5hbnRCeUlkKGlkKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB0ZW5hbnRCeU5hbWUobmFtZTogc3RyaW5nKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgcmV0dXJuIHRoaXMuZGFsLnRlbmFudEJ5TmFtZShuYW1lKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjcmVhdGVUZW5hbnQoXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIGxhYmVsOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgcmV0dXJuIHRoaXMuZGFsLmNyZWF0ZVRlbmFudChuYW1lLCBsYWJlbCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgdXBkYXRlVGVuYW50KFxuICAgIGlkOiBudW1iZXIsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIGxhYmVsOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgcmV0dXJuIHRoaXMuZGFsLnVwZGF0ZVRlbmFudChpZCwgbmFtZSwgbGFiZWwpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGRlbGV0ZVRlc3RUZW5hbnRzKCk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIHJldHVybiB0aGlzLmRhbC5kZWxldGVUZXN0VGVuYW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlbmFudC1Vc2VyLVJvbGVzXG4gICAqL1xuXG4gIHB1YmxpYyBhc3luYyBhZGRVc2VyVG9UZW5hbnQoXG4gICAgdGVuYW50TmFtZTogc3RyaW5nLFxuICAgIHVzZXJFbWFpbDogc3RyaW5nLFxuICAgIHRlbmFudFJvbGU6IHN0cmluZ1xuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBsb2cuZGVidWcoXG4gICAgICBgd2hpdGVicmlja0Nsb3VkLmFkZFVzZXJUb1RlbmFudDogJHt0ZW5hbnROYW1lfSwgJHt1c2VyRW1haWx9LCAke3RlbmFudFJvbGV9YFxuICAgICk7XG4gICAgY29uc3QgdXNlclJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLnVzZXJCeUVtYWlsKHVzZXJFbWFpbCk7XG4gICAgaWYgKCF1c2VyUmVzdWx0LnN1Y2Nlc3MpIHJldHVybiB1c2VyUmVzdWx0O1xuICAgIGNvbnN0IHRlbmFudFJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLnRlbmFudEJ5TmFtZSh0ZW5hbnROYW1lKTtcbiAgICBpZiAoIXRlbmFudFJlc3VsdC5zdWNjZXNzKSByZXR1cm4gdGVuYW50UmVzdWx0O1xuICAgIGNvbnN0IHJvbGVSZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC5yb2xlQnlOYW1lKHRlbmFudFJvbGUpO1xuICAgIGlmICghcm9sZVJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcm9sZVJlc3VsdDtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC5hZGRVc2VyVG9UZW5hbnQoXG4gICAgICB0ZW5hbnRSZXN1bHQucGF5bG9hZC5pZCxcbiAgICAgIHVzZXJSZXN1bHQucGF5bG9hZC5pZCxcbiAgICAgIHJvbGVSZXN1bHQucGF5bG9hZC5pZFxuICAgICk7XG4gICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICByZXR1cm4gdXNlclJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2Vyc1xuICAgKi9cblxuICBwdWJsaWMgYXN5bmMgdXNlcnNCeVRlbmFudElkKHRlbmFudElkOiBudW1iZXIpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICByZXR1cm4gdGhpcy5kYWwudXNlcnNCeVRlbmFudElkKHRlbmFudElkKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB1c2VyQnlJZChpZDogbnVtYmVyKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgcmV0dXJuIHRoaXMuZGFsLnVzZXJCeUlkKGlkKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB1c2VyQnlFbWFpbChlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgcmV0dXJuIHRoaXMuZGFsLnVzZXJCeUVtYWlsKGVtYWlsKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjcmVhdGVVc2VyKFxuICAgIGVtYWlsOiBzdHJpbmcsXG4gICAgZmlyc3ROYW1lOiBzdHJpbmcsXG4gICAgbGFzdE5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICAvLyBUQkQ6IGF1dGhlbnRpY2F0aW9uLCBzYXZlIHBhc3N3b3JkXG4gICAgcmV0dXJuIHRoaXMuZGFsLmNyZWF0ZVVzZXIoZW1haWwsIGZpcnN0TmFtZSwgbGFzdE5hbWUpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHVwZGF0ZVVzZXIoXG4gICAgaWQ6IG51bWJlcixcbiAgICBlbWFpbDogc3RyaW5nLFxuICAgIGZpcnN0TmFtZTogc3RyaW5nLFxuICAgIGxhc3ROYW1lOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgcmV0dXJuIHRoaXMuZGFsLnVwZGF0ZVVzZXIoaWQsIGVtYWlsLCBmaXJzdE5hbWUsIGxhc3ROYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSb2xlc1xuICAgKi9cblxuICBwdWJsaWMgYXN5bmMgcm9sZUJ5TmFtZShuYW1lOiBzdHJpbmcpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICByZXR1cm4gdGhpcy5kYWwucm9sZUJ5TmFtZShuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2hlbWFzXG4gICAqIFRCRDogdmFsaWRhdGUgbmFtZSB+IFthLXpdezF9W19hLXowLTldezIsfVxuICAgKi9cblxuICBwdWJsaWMgYXN5bmMgY3JlYXRlU2NoZW1hKFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBsYWJlbDogc3RyaW5nLFxuICAgIHRlbmFudE93bmVySWQ6IG51bWJlciB8IG51bGwsXG4gICAgdGVuYW50T3duZXJOYW1lOiBzdHJpbmcgfCBudWxsLFxuICAgIHVzZXJPd25lcklkOiBudW1iZXIgfCBudWxsLFxuICAgIHVzZXJPd25lckVtYWlsOiBzdHJpbmcgfCBudWxsXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGxvZy5pbmZvKGBcbiAgICAgIHdiQ2xvdWQuY3JlYXRlU2NoZW1hIG5hbWU9JHtuYW1lfSxcbiAgICAgIGxhYmVsPSR7bGFiZWx9LFxuICAgICAgdGVuYW50T3duZXJJZD0ke3RlbmFudE93bmVySWR9LFxuICAgICAgdGVuYW50T3duZXJOYW1lPSR7dGVuYW50T3duZXJOYW1lfSxcbiAgICAgIHVzZXJPd25lcklkPSR7dXNlck93bmVySWR9LFxuICAgICAgdXNlck93bmVyRW1haWw9JHt1c2VyT3duZXJFbWFpbH1cbiAgICBgKTtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmICghdGVuYW50T3duZXJJZCAmJiAhdXNlck93bmVySWQpIHtcbiAgICAgIGlmICh0ZW5hbnRPd25lck5hbWUpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwudGVuYW50QnlOYW1lKHRlbmFudE93bmVyTmFtZSk7XG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgICAgIHRlbmFudE93bmVySWQgPSByZXN1bHQucGF5bG9hZC5pZDtcbiAgICAgIH0gZWxzZSBpZiAodXNlck93bmVyRW1haWwpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwudXNlckJ5RW1haWwodXNlck93bmVyRW1haWwpO1xuICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICB1c2VyT3duZXJJZCA9IHJlc3VsdC5wYXlsb2FkLmlkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiBcIk93bmVyIGNvdWxkIG5vdCBiZSBmb3VuZFwiLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobmFtZS5zdGFydHNXaXRoKFwicGdfXCIpIHx8IFNjaGVtYS5TWVNfU0NIRU1BX05BTUVTLmluY2x1ZGVzKG5hbWUpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogYERhdGFiYXNlIG5hbWUgY2FuIG5vdCBiZWdpbiB3aXRoICdwZ18nIG9yIGJlIGluIHRoZSByZXNlcnZlZCBsaXN0OiAke1NjaGVtYS5TWVNfU0NIRU1BX05BTUVTLmpvaW4oXG4gICAgICAgICAgXCIsIFwiXG4gICAgICAgICl9YCxcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBhd2FpdCB0aGlzLmRhbC5jcmVhdGVTY2hlbWEobmFtZSwgbGFiZWwsIHRlbmFudE93bmVySWQsIHVzZXJPd25lcklkKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZW1vdmVPckRlbGV0ZVNjaGVtYShcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgZGVsOiBib29sZWFuXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC5kaXNjb3ZlclRhYmxlcyhzY2hlbWFOYW1lKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIGZvciAoY29uc3QgdGFibGVOYW1lIG9mIHJlc3VsdC5wYXlsb2FkKSB7XG4gICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLnJlbW92ZU9yRGVsZXRlVGFibGUoc2NoZW1hTmFtZSwgdGFibGVOYW1lLCBkZWwpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwucmVtb3ZlQWxsVXNlcnNGcm9tU2NoZW1hKHNjaGVtYU5hbWUpO1xuICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuZGFsLnJlbW92ZU9yRGVsZXRlU2NoZW1hKHNjaGVtYU5hbWUsIGRlbCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgc2NoZW1hc0J5VXNlck93bmVyKHVzZXJFbWFpbDogc3RyaW5nKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgcmV0dXJuIHRoaXMuZGFsLnNjaGVtYXNCeVVzZXJPd25lcih1c2VyRW1haWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNjaGVtYS1Vc2VyLVJvbGVzXG4gICAqL1xuXG4gIHB1YmxpYyBhc3luYyBhZGRVc2VyVG9TY2hlbWEoXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHVzZXJFbWFpbDogc3RyaW5nLFxuICAgIHNjaGVtYVJvbGU6IHN0cmluZ1xuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCB1c2VyUmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwudXNlckJ5RW1haWwodXNlckVtYWlsKTtcbiAgICBpZiAoIXVzZXJSZXN1bHQuc3VjY2VzcykgcmV0dXJuIHVzZXJSZXN1bHQ7XG4gICAgY29uc3Qgc2NoZW1hUmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwuc2NoZW1hQnlOYW1lKHNjaGVtYU5hbWUpO1xuICAgIGlmICghc2NoZW1hUmVzdWx0LnN1Y2Nlc3MpIHJldHVybiBzY2hlbWFSZXN1bHQ7XG4gICAgY29uc3Qgcm9sZVJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLnJvbGVCeU5hbWUoc2NoZW1hUm9sZSk7XG4gICAgaWYgKCFyb2xlUmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByb2xlUmVzdWx0O1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLmFkZFVzZXJUb1NjaGVtYShcbiAgICAgIHNjaGVtYVJlc3VsdC5wYXlsb2FkLmlkLFxuICAgICAgdXNlclJlc3VsdC5wYXlsb2FkLmlkLFxuICAgICAgcm9sZVJlc3VsdC5wYXlsb2FkLmlkXG4gICAgKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIHJldHVybiB1c2VyUmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGFjY2Vzc2libGVTY2hlbWFzKHVzZXJFbWFpbDogc3RyaW5nKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgY29uc3Qgc2NoZW1hT3duZXJSZXN1bHQgPSBhd2FpdCB0aGlzLnNjaGVtYXNCeVVzZXJPd25lcih1c2VyRW1haWwpO1xuICAgIGlmICghc2NoZW1hT3duZXJSZXN1bHQuc3VjY2VzcykgcmV0dXJuIHNjaGVtYU93bmVyUmVzdWx0O1xuICAgIGNvbnN0IHVzZXJSb2xlc1Jlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLnNjaGVtYXNCeVVzZXIodXNlckVtYWlsKTtcbiAgICBpZiAoIXVzZXJSb2xlc1Jlc3VsdC5zdWNjZXNzKSByZXR1cm4gdXNlclJvbGVzUmVzdWx0O1xuICAgIGNvbnN0IHNjaGVtYXM6IFNjaGVtYVtdID0gW107XG4gICAgZm9yIChjb25zdCBzY2hlbWEgb2Ygc2NoZW1hT3duZXJSZXN1bHQucGF5bG9hZC5jb25jYXQoXG4gICAgICB1c2VyUm9sZXNSZXN1bHQucGF5bG9hZFxuICAgICkpIHtcbiAgICAgIHNjaGVtYXMucHVzaCh0aGlzLmFkZFNjaGVtYUNvbnRleHQoc2NoZW1hKSk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgcGF5bG9hZDogc2NoZW1hcyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFRhYmxlc1xuICAgKiBUQkQ6IHZhbGlkYXRlIG5hbWUgfiBbYS16XXsxfVtfYS16MC05XXsyLH1cbiAgICovXG5cbiAgcHVibGljIGFzeW5jIHRhYmxlcyhzY2hlbWFOYW1lOiBzdHJpbmcpOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC50YWJsZXMoc2NoZW1hTmFtZSk7XG4gICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICBmb3IgKGNvbnN0IHRhYmxlIG9mIHJlc3VsdC5wYXlsb2FkKSB7XG4gICAgICBjb25zdCBjb2x1bW5zUmVzdWx0ID0gYXdhaXQgdGhpcy5jb2x1bW5zKHNjaGVtYU5hbWUsIHRhYmxlLm5hbWUpO1xuICAgICAgaWYgKCFjb2x1bW5zUmVzdWx0LnN1Y2Nlc3MpIHJldHVybiBjb2x1bW5zUmVzdWx0O1xuICAgICAgdGFibGUuY29sdW1ucyA9IGNvbHVtbnNSZXN1bHQucGF5bG9hZDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjb2x1bW5zKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZU5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwucHJpbWFyeUtleXMoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIGNvbnN0IHBLQ29sc0NvbnN0cmFpbnRzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0gcmVzdWx0LnBheWxvYWQ7XG4gICAgY29uc3QgcEtDb2x1bW5OYW1lczogc3RyaW5nW10gPSBPYmplY3Qua2V5cyhwS0NvbHNDb25zdHJhaW50cyk7XG4gICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwuY29sdW1ucyhzY2hlbWFOYW1lLCB0YWJsZU5hbWUpO1xuICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgZm9yIChjb25zdCBjb2x1bW4gb2YgcmVzdWx0LnBheWxvYWQpIHtcbiAgICAgIGNvbHVtbi5pc1ByaW1hcnlLZXkgPSBwS0NvbHVtbk5hbWVzLmluY2x1ZGVzKGNvbHVtbi5uYW1lKTtcbiAgICAgIGNvbnN0IGZvcmVpZ25LZXlzUmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwuZm9yZWlnbktleXNPclJlZmVyZW5jZXMoXG4gICAgICAgIHNjaGVtYU5hbWUsXG4gICAgICAgIHRhYmxlTmFtZSxcbiAgICAgICAgY29sdW1uLm5hbWUsXG4gICAgICAgIFwiRk9SRUlHTl9LRVlTXCJcbiAgICAgICk7XG4gICAgICBpZiAoIWZvcmVpZ25LZXlzUmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgICBjb2x1bW4uZm9yZWlnbktleXMgPSBmb3JlaWduS2V5c1Jlc3VsdC5wYXlsb2FkO1xuICAgICAgY29uc3QgcmVmZXJlbmNlc1Jlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLmZvcmVpZ25LZXlzT3JSZWZlcmVuY2VzKFxuICAgICAgICBzY2hlbWFOYW1lLFxuICAgICAgICB0YWJsZU5hbWUsXG4gICAgICAgIGNvbHVtbi5uYW1lLFxuICAgICAgICBcIlJFRkVSRU5DRVNcIlxuICAgICAgKTtcbiAgICAgIGlmICghcmVmZXJlbmNlc1Jlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgICAgY29sdW1uLnJlZmVyZW5jZWRCeSA9IHJlZmVyZW5jZXNSZXN1bHQucGF5bG9hZDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBhZGRPckNyZWF0ZVRhYmxlKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZUxhYmVsOiBzdHJpbmcsXG4gICAgY3JlYXRlPzogYm9vbGVhblxuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBpZiAoIWNyZWF0ZSkgY3JlYXRlID0gZmFsc2U7XG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLmFkZE9yQ3JlYXRlVGFibGUoXG4gICAgICBzY2hlbWFOYW1lLFxuICAgICAgdGFibGVOYW1lLFxuICAgICAgdGFibGVMYWJlbCxcbiAgICAgIGNyZWF0ZVxuICAgICk7XG4gICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICByZXR1cm4gYXdhaXQgaGFzdXJhQXBpLnRyYWNrVGFibGUoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZW1vdmVPckRlbGV0ZVRhYmxlKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZU5hbWU6IHN0cmluZyxcbiAgICBkZWw/OiBib29sZWFuXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGlmICghZGVsKSBkZWwgPSBmYWxzZTtcbiAgICAvLyAxLiB1bnRyYWNrXG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IGhhc3VyYUFwaS51bnRyYWNrVGFibGUoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vIDIuIHJlbW92ZS9kZWxldGUgY29sdW1uc1xuICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLmNvbHVtbnMoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIGNvbnN0IGNvbHVtbnMgPSByZXN1bHQucGF5bG9hZDtcbiAgICBmb3IgKGNvbnN0IGNvbHVtbiBvZiBjb2x1bW5zKSB7XG4gICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLnJlbW92ZU9yRGVsZXRlQ29sdW1uKFxuICAgICAgICBzY2hlbWFOYW1lLFxuICAgICAgICB0YWJsZU5hbWUsXG4gICAgICAgIGNvbHVtbi5uYW1lLFxuICAgICAgICBkZWxcbiAgICAgICk7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICAvLyAzLiByZW1vdmUgdXNlciBzZXR0aW5nc1xuICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLnJlbW92ZVRhYmxlVXNlcnMoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vIDQuIHJlbW92ZS9kZWxldGUgdGhlIHRhYmxlXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuZGFsLnJlbW92ZU9yRGVsZXRlVGFibGUoc2NoZW1hTmFtZSwgdGFibGVOYW1lLCBkZWwpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHJlbW92ZU9yRGVsZXRlQ29sdW1uKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZU5hbWU6IHN0cmluZyxcbiAgICBjb2x1bW5OYW1lOiBzdHJpbmcsXG4gICAgZGVsPzogYm9vbGVhblxuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBpZiAoIWRlbCkgZGVsID0gZmFsc2U7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuZGFsLnJlbW92ZU9yRGVsZXRlQ29sdW1uKFxuICAgICAgc2NoZW1hTmFtZSxcbiAgICAgIHRhYmxlTmFtZSxcbiAgICAgIGNvbHVtbk5hbWUsXG4gICAgICBkZWxcbiAgICApO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHVwZGF0ZVRhYmxlKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZU5hbWU6IHN0cmluZyxcbiAgICBuZXdUYWJsZU5hbWU/OiBzdHJpbmcsXG4gICAgbmV3VGFibGVMYWJlbD86IHN0cmluZ1xuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBsZXQgcmVzdWx0OiBTZXJ2aWNlUmVzdWx0O1xuICAgIGlmIChuZXdUYWJsZU5hbWUpIHtcbiAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMudGFibGVzKHNjaGVtYU5hbWUpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICAgIGNvbnN0IGV4aXN0aW5nVGFibGVOYW1lcyA9IHJlc3VsdC5wYXlsb2FkLm1hcChcbiAgICAgICAgKHRhYmxlOiB7IG5hbWU6IHN0cmluZyB9KSA9PiB0YWJsZS5uYW1lXG4gICAgICApO1xuICAgICAgaWYgKGV4aXN0aW5nVGFibGVOYW1lcy5pbmNsdWRlcyhuZXdUYWJsZU5hbWUpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogXCJUaGUgbmV3IHRhYmxlIG5hbWUgbXVzdCBiZSB1bmlxdWVcIixcbiAgICAgICAgICBjb2RlOiBcIldCX1RBQkxFX05BTUVfRVhJU1RTXCIsXG4gICAgICAgICAgYXBvbGxvRXJyb3I6IFwiQkFEX1VTRVJfSU5QVVRcIixcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGF3YWl0IGhhc3VyYUFwaS51bnRyYWNrVGFibGUoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLnVwZGF0ZVRhYmxlKFxuICAgICAgc2NoZW1hTmFtZSxcbiAgICAgIHRhYmxlTmFtZSxcbiAgICAgIG5ld1RhYmxlTmFtZSxcbiAgICAgIG5ld1RhYmxlTGFiZWxcbiAgICApO1xuICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5ld1RhYmxlTmFtZSkge1xuICAgICAgcmVzdWx0ID0gYXdhaXQgaGFzdXJhQXBpLnRyYWNrVGFibGUoc2NoZW1hTmFtZSwgbmV3VGFibGVOYW1lKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgYWRkQWxsRXhpc3RpbmdUYWJsZXMoXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC5kaXNjb3ZlclRhYmxlcyhzY2hlbWFOYW1lKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIGNvbnN0IHRhYmxlTmFtZXMgPSByZXN1bHQucGF5bG9hZDtcbiAgICBmb3IgKGNvbnN0IHRhYmxlTmFtZSBvZiB0YWJsZU5hbWVzKSB7XG4gICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLmFkZE9yQ3JlYXRlVGFibGUoXG4gICAgICAgIHNjaGVtYU5hbWUsXG4gICAgICAgIHRhYmxlTmFtZSxcbiAgICAgICAgdi50aXRsZUNhc2UodGFibGVOYW1lLnJlcGxhY2VBbGwoXCJfXCIsIFwiIFwiKSksXG4gICAgICAgIGZhbHNlXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLmRpc2NvdmVyQ29sdW1ucyhzY2hlbWFOYW1lLCB0YWJsZU5hbWUpO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICAgIGNvbnN0IGNvbHVtbnMgPSByZXN1bHQucGF5bG9hZDtcbiAgICAgIGZvciAoY29uc3QgY29sdW1uIG9mIGNvbHVtbnMpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5hZGRPckNyZWF0ZUNvbHVtbihcbiAgICAgICAgICBzY2hlbWFOYW1lLFxuICAgICAgICAgIHRhYmxlTmFtZSxcbiAgICAgICAgICBjb2x1bW4ubmFtZSxcbiAgICAgICAgICB2LnRpdGxlQ2FzZShjb2x1bW4ubmFtZS5yZXBsYWNlQWxsKFwiX1wiLCBcIiBcIikpLFxuICAgICAgICAgIGZhbHNlXG4gICAgICAgICk7XG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgYWRkQWxsRXhpc3RpbmdSZWxhdGlvbnNoaXBzKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBsb2cud2FybihcIioqKioqKioqKiogQWxsIGV4aXN0aW5nIHJlbGF0aW9uc2hpcHM6XCIpO1xuICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC5mb3JlaWduS2V5c09yUmVmZXJlbmNlcyhcbiAgICAgIHNjaGVtYU5hbWUsXG4gICAgICBcIiVcIixcbiAgICAgIFwiJVwiLFxuICAgICAgXCJBTExcIlxuICAgICk7XG4gICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICBjb25zdCByZWxhdGlvbnNoaXBzOiBDb25zdHJhaW50SWRbXSA9IHJlc3VsdC5wYXlsb2FkO1xuICAgIGlmIChyZWxhdGlvbnNoaXBzLmxlbmd0aCA+IDApIHtcbiAgICAgIGZvciAoY29uc3QgcmVsYXRpb25zaGlwIG9mIHJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgbG9nLndhcm4oSlNPTi5zdHJpbmdpZnkocmVsYXRpb25zaGlwKSk7XG4gICAgICAgIC8vIFRCRDogQ2FsbCBhZGRPckNyZWF0ZUZvcmVpZ25LZXkgd2l0aCB0aGUgY29ycmVjdCB0YWJsZS9wYXJlbnRUYWJsZSBjb2wvcGFyZW50Q29sIGNvbWJpbmF0aW9uc1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGFkZE9yQ3JlYXRlQ29sdW1uKFxuICAgIHNjaGVtYU5hbWU6IHN0cmluZyxcbiAgICB0YWJsZU5hbWU6IHN0cmluZyxcbiAgICBjb2x1bW5OYW1lOiBzdHJpbmcsXG4gICAgY29sdW1uTGFiZWw6IHN0cmluZyxcbiAgICBjcmVhdGU/OiBib29sZWFuLFxuICAgIGNvbHVtblR5cGU/OiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgaWYgKCFjcmVhdGUpIGNyZWF0ZSA9IGZhbHNlO1xuICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC5hZGRPckNyZWF0ZUNvbHVtbihcbiAgICAgIHNjaGVtYU5hbWUsXG4gICAgICB0YWJsZU5hbWUsXG4gICAgICBjb2x1bW5OYW1lLFxuICAgICAgY29sdW1uTGFiZWwsXG4gICAgICBjcmVhdGUsXG4gICAgICBjb2x1bW5UeXBlXG4gICAgKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChjcmVhdGUpIHtcbiAgICAgIHJlc3VsdCA9IGF3YWl0IGhhc3VyYUFwaS51bnRyYWNrVGFibGUoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgICByZXN1bHQgPSBhd2FpdCBoYXN1cmFBcGkudHJhY2tUYWJsZShzY2hlbWFOYW1lLCB0YWJsZU5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gUGFzcyBlbXB0eSBjb2x1bW5OYW1lc1tdIHRvIGNsZWFyXG4gIHB1YmxpYyBhc3luYyBjcmVhdGVPckRlbGV0ZVByaW1hcnlLZXkoXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTmFtZTogc3RyaW5nLFxuICAgIGNvbHVtbk5hbWVzOiBzdHJpbmdbXSxcbiAgICBkZWw/OiBib29sZWFuXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGlmICghZGVsKSBkZWwgPSBmYWxzZTtcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwucHJpbWFyeUtleXMoc2NoZW1hTmFtZSwgdGFibGVOYW1lKTtcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgIGNvbnN0IGV4aXN0aW5nQ29uc3RyYWludE5hbWVzID0gT2JqZWN0LnZhbHVlcyhyZXN1bHQucGF5bG9hZCk7XG4gICAgaWYgKGRlbCkge1xuICAgICAgaWYgKGV4aXN0aW5nQ29uc3RyYWludE5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gbXVsdGlwbGUgY291bG1uIHByaW1hcnkga2V5cyB3aWxsIGFsbCBoYXZlIHNhbWUgY29uc3RyYWludCBuYW1lXG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLmRlbGV0ZUNvbnN0cmFpbnQoXG4gICAgICAgICAgc2NoZW1hTmFtZSxcbiAgICAgICAgICB0YWJsZU5hbWUsXG4gICAgICAgICAgZXhpc3RpbmdDb25zdHJhaW50TmFtZXNbMF0gYXMgc3RyaW5nXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChleGlzdGluZ0NvbnN0cmFpbnROYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogXCJSZW1vdmUgZXhpc3RpbmcgcHJpbWFyeSBrZXkgZmlyc3RcIixcbiAgICAgICAgICBjb2RlOiBcIldCX1BLX0VYSVNUU1wiLFxuICAgICAgICAgIGFwb2xsb0Vycm9yOiBcIkJBRF9VU0VSX0lOUFVUXCIsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXN1bHQgPSBhd2FpdCBoYXN1cmFBcGkudW50cmFja1RhYmxlKHNjaGVtYU5hbWUsIHRhYmxlTmFtZSk7XG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYWwuY3JlYXRlUHJpbWFyeUtleShcbiAgICAgICAgc2NoZW1hTmFtZSxcbiAgICAgICAgdGFibGVOYW1lLFxuICAgICAgICBjb2x1bW5OYW1lc1xuICAgICAgKTtcbiAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHJldHVybiByZXN1bHQ7XG4gICAgICByZXN1bHQgPSBhd2FpdCBoYXN1cmFBcGkudHJhY2tUYWJsZShzY2hlbWFOYW1lLCB0YWJsZU5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGFkZE9yQ3JlYXRlRm9yZWlnbktleShcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgdGFibGVOYW1lOiBzdHJpbmcsXG4gICAgY29sdW1uTmFtZXM6IHN0cmluZ1tdLFxuICAgIHBhcmVudFRhYmxlTmFtZTogc3RyaW5nLFxuICAgIHBhcmVudENvbHVtbk5hbWVzOiBzdHJpbmdbXSxcbiAgICBjcmVhdGU/OiBib29sZWFuXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGxldCBvcGVyYXRpb246IHN0cmluZyA9IFwiQ1JFQVRFXCI7XG4gICAgaWYgKCFjcmVhdGUpIG9wZXJhdGlvbiA9IFwiQUREXCI7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0Rm9yZWlnbktleShcbiAgICAgIHNjaGVtYU5hbWUsXG4gICAgICB0YWJsZU5hbWUsXG4gICAgICBjb2x1bW5OYW1lcyxcbiAgICAgIHBhcmVudFRhYmxlTmFtZSxcbiAgICAgIHBhcmVudENvbHVtbk5hbWVzLFxuICAgICAgb3BlcmF0aW9uXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZW1vdmVPckRlbGV0ZUZvcmVpZ25LZXkoXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTmFtZTogc3RyaW5nLFxuICAgIGNvbHVtbk5hbWVzOiBzdHJpbmdbXSxcbiAgICBwYXJlbnRUYWJsZU5hbWU6IHN0cmluZyxcbiAgICBkZWw/OiBib29sZWFuXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIGxldCBvcGVyYXRpb246IHN0cmluZyA9IFwiREVMRVRFXCI7XG4gICAgaWYgKCFkZWwpIG9wZXJhdGlvbiA9IFwiUkVNT1ZFXCI7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0Rm9yZWlnbktleShcbiAgICAgIHNjaGVtYU5hbWUsXG4gICAgICB0YWJsZU5hbWUsXG4gICAgICBjb2x1bW5OYW1lcyxcbiAgICAgIHBhcmVudFRhYmxlTmFtZSxcbiAgICAgIFtdLFxuICAgICAgb3BlcmF0aW9uXG4gICAgKTtcbiAgfVxuXG4gIC8vIG9wZXJhdGlvbiA9IFwiQUREfENSRUFURXxSRU1PVkV8REVMRVRFXCJcbiAgcHVibGljIGFzeW5jIHNldEZvcmVpZ25LZXkoXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTmFtZTogc3RyaW5nLFxuICAgIGNvbHVtbk5hbWVzOiBzdHJpbmdbXSxcbiAgICBwYXJlbnRUYWJsZU5hbWU6IHN0cmluZyxcbiAgICBwYXJlbnRDb2x1bW5OYW1lczogc3RyaW5nW10sXG4gICAgb3BlcmF0aW9uOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxTZXJ2aWNlUmVzdWx0PiB7XG4gICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLmZvcmVpZ25LZXlzT3JSZWZlcmVuY2VzKFxuICAgICAgc2NoZW1hTmFtZSxcbiAgICAgIHRhYmxlTmFtZSxcbiAgICAgIGNvbHVtbk5hbWVzWzBdLFxuICAgICAgXCJGT1JFSUdOX0tFWVNcIlxuICAgICk7XG4gICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICBjb25zdCBleGlzdGluZ0ZvcmVpZ25LZXlzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgZm9yIChjb25zdCBjb25zdHJhaW50SWQgb2YgcmVzdWx0LnBheWxvYWQpIHtcbiAgICAgIGV4aXN0aW5nRm9yZWlnbktleXNbY29uc3RyYWludElkLmNvbHVtbk5hbWVdID1cbiAgICAgICAgY29uc3RyYWludElkLmNvbnN0cmFpbnROYW1lO1xuICAgIH1cbiAgICAvLyBDaGVjayBmb3IgZXhpc3RpbmcgZm9yZWlnbiBrZXlzXG4gICAgZm9yIChjb25zdCBjb2x1bW5OYW1lIG9mIGNvbHVtbk5hbWVzKSB7XG4gICAgICBpZiAoT2JqZWN0LmtleXMoZXhpc3RpbmdGb3JlaWduS2V5cykuaW5jbHVkZXMoY29sdW1uTmFtZSkpIHtcbiAgICAgICAgaWYgKG9wZXJhdGlvbiA9PSBcIlJFTU9WRVwiIHx8IG9wZXJhdGlvbiA9PSBcIkRFTEVURVwiKSB7XG4gICAgICAgICAgcmVzdWx0ID0gYXdhaXQgaGFzdXJhQXBpLmRyb3BSZWxhdGlvbnNoaXBzKFxuICAgICAgICAgICAgc2NoZW1hTmFtZSxcbiAgICAgICAgICAgIHRhYmxlTmFtZSxcbiAgICAgICAgICAgIHBhcmVudFRhYmxlTmFtZVxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzICYmIG9wZXJhdGlvbiA9PSBcIkRFTEVURVwiKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC5kZWxldGVDb25zdHJhaW50KFxuICAgICAgICAgICAgICBzY2hlbWFOYW1lLFxuICAgICAgICAgICAgICB0YWJsZU5hbWUsXG4gICAgICAgICAgICAgIGV4aXN0aW5nRm9yZWlnbktleXNbY29sdW1uTmFtZV0gYXMgc3RyaW5nXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBSZW1vdmUgZXhpc3RpbmcgZm9yZWlnbiBrZXkgb24gJHtjb2x1bW5OYW1lfSBmaXJzdGAsXG4gICAgICAgICAgICBjb2RlOiBcIldCX0ZLX0VYSVNUU1wiLFxuICAgICAgICAgICAgYXBvbGxvRXJyb3I6IFwiQkFEX1VTRVJfSU5QVVRcIixcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvcGVyYXRpb24gPT0gXCJBRERcIiB8fCBvcGVyYXRpb24gPT0gXCJDUkVBVEVcIikge1xuICAgICAgLy8gcmVzdWx0ID0gYXdhaXQgaGFzdXJhQXBpLnVudHJhY2tUYWJsZShzY2hlbWFOYW1lLCB0YWJsZU5hbWUpO1xuICAgICAgLy8gaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICAgIGlmIChvcGVyYXRpb24gPT0gXCJDUkVBVEVcIikge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC5jcmVhdGVGb3JlaWduS2V5KFxuICAgICAgICAgIHNjaGVtYU5hbWUsXG4gICAgICAgICAgdGFibGVOYW1lLFxuICAgICAgICAgIGNvbHVtbk5hbWVzLFxuICAgICAgICAgIHBhcmVudFRhYmxlTmFtZSxcbiAgICAgICAgICBwYXJlbnRDb2x1bW5OYW1lc1xuICAgICAgICApO1xuICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gYXdhaXQgaGFzdXJhQXBpLmNyZWF0ZU9iamVjdFJlbGF0aW9uc2hpcChcbiAgICAgICAgc2NoZW1hTmFtZSxcbiAgICAgICAgdGFibGVOYW1lLCAvLyBwb3N0c1xuICAgICAgICBjb2x1bW5OYW1lc1swXSwgLy8gYXV0aG9yX2lkXG4gICAgICAgIHBhcmVudFRhYmxlTmFtZSAvLyBhdXRob3JzXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHJlc3VsdCA9IGF3YWl0IGhhc3VyYUFwaS5jcmVhdGVBcnJheVJlbGF0aW9uc2hpcChcbiAgICAgICAgc2NoZW1hTmFtZSxcbiAgICAgICAgcGFyZW50VGFibGVOYW1lLCAvLyBhdXRob3JzXG4gICAgICAgIHRhYmxlTmFtZSwgLy8gcG9zdHNcbiAgICAgICAgY29sdW1uTmFtZXMgLy8gYXV0aG9yX2lkXG4gICAgICApO1xuICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB0YWJsZVVzZXIoXG4gICAgdXNlckVtYWlsOiBzdHJpbmcsXG4gICAgc2NoZW1hTmFtZTogc3RyaW5nLFxuICAgIHRhYmxlTmFtZTogc3RyaW5nXG4gICk6IFByb21pc2U8U2VydmljZVJlc3VsdD4ge1xuICAgIHJldHVybiB0aGlzLmRhbC50YWJsZVVzZXIodXNlckVtYWlsLCBzY2hlbWFOYW1lLCB0YWJsZU5hbWUpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHNhdmVUYWJsZVVzZXJTZXR0aW5ncyhcbiAgICBzY2hlbWFOYW1lOiBzdHJpbmcsXG4gICAgdGFibGVOYW1lOiBzdHJpbmcsXG4gICAgdXNlckVtYWlsOiBzdHJpbmcsXG4gICAgc2V0dGluZ3M6IG9iamVjdFxuICApOiBQcm9taXNlPFNlcnZpY2VSZXN1bHQ+IHtcbiAgICBjb25zdCB0YWJsZVJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLnRhYmxlQnlTY2hlbWFOYW1lVGFibGVOYW1lKFxuICAgICAgc2NoZW1hTmFtZSxcbiAgICAgIHRhYmxlTmFtZVxuICAgICk7XG4gICAgaWYgKCF0YWJsZVJlc3VsdC5zdWNjZXNzKSByZXR1cm4gdGFibGVSZXN1bHQ7XG4gICAgY29uc3QgdXNlclJlc3VsdCA9IGF3YWl0IHRoaXMuZGFsLnVzZXJCeUVtYWlsKHVzZXJFbWFpbCk7XG4gICAgaWYgKCF1c2VyUmVzdWx0LnN1Y2Nlc3MpIHJldHVybiB1c2VyUmVzdWx0O1xuICAgIGNvbnN0IHJvbGVSZXN1bHQgPSBhd2FpdCB0aGlzLmRhbC5yb2xlQnlOYW1lKFwidGFibGVfaW5oZXJpdFwiKTtcbiAgICBpZiAoIXJvbGVSZXN1bHQuc3VjY2VzcykgcmV0dXJuIHJvbGVSZXN1bHQ7XG4gICAgcmV0dXJuIHRoaXMuZGFsLnNhdmVUYWJsZVVzZXJTZXR0aW5ncyhcbiAgICAgIHRhYmxlUmVzdWx0LnBheWxvYWQuaWQsXG4gICAgICB1c2VyUmVzdWx0LnBheWxvYWQuaWQsXG4gICAgICByb2xlUmVzdWx0LnBheWxvYWQuaWQsXG4gICAgICBzZXR0aW5nc1xuICAgICk7XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImFwb2xsby1zZXJ2ZXItbGFtYmRhXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJheGlvc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZ3JhcGhxbC1jb25zdHJhaW50LWRpcmVjdGl2ZVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZ3JhcGhxbC10b29sc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZ3JhcGhxbC10eXBlLWpzb25cIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImxvZGFzaFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicGdcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInRzbG9nXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ2b2NhXCIpOzsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvd2hpdGVicmljay1jbG91ZC50c1wiKTtcbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBR0E7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFHQTtBQUNBO0FBQ0E7QUFFQTs7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUlBO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFNQTs7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUNBO0FBQ0E7Ozs7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBQ0E7QUFDQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUlBO0FBQ0E7Ozs7O0FBS0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUNBO0FBQ0E7QUFDQTs7Ozs7QUFLQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFNQTs7QUFLQTtBQUNBOzs7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBS0E7OztBQUdBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQU1BOztBQUNBO0FBQ0E7Ozs7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBQ0E7QUFDQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBS0E7QUFDQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQU1BOztBQUNBO0FBQ0E7Ozs7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUFBO0FBTUE7O0FBTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFDQTtBQUNBOzs7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBQ0E7QUFDQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFJQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBR0E7QUFDQTtBQUFBO0FBTUE7O0FBS0E7QUFDQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUtBOzs7QUFHQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFHQTtBQUNBOzs7OztBQUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUNBO0FBQ0E7Ozs7Ozs7QUFPQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQU1BOztBQUNBO0FBQ0E7Ozs7O0FBS0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUNBO0FBQ0E7Ozs7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBR0E7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFJQTtBQUNBOzs7Ozs7Ozs7O0FBVUE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUlBO0FBQ0E7Ozs7O0FBS0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUdBOztBQU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQThCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUlBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7O0FBVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQU9BO0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFJQTtBQUNBOzs7OztBQUtBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFNQTtBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBR0E7QUFDQTtBQUFBO0FBRUE7O0FBS0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFHQTtBQUNBO0FBQUE7QUFFQTs7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFHQTtBQUNBO0FBQUE7QUFFQTs7QUFRQTtBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFHQTtBQUNBO0FBQUE7QUFFQTs7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBR0E7QUFDQTtBQUFBO0FBTUE7O0FBS0E7QUFDQTs7Ozs7Ozs7QUFRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFLQTtBQUNBOzs7Ozs7OztBQVFBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQU1BO0FBQ0E7Ozs7Ozs7QUFPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQXprQ0E7QUFDQTtBQUNBO0E7Ozs7Ozs7Ozs7O0FDTEE7QUFzQkE7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QTs7Ozs7Ozs7Ozs7QUNGQTtBQUlBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQXBCQTtBQUNBO0FBQ0E7QTs7Ozs7Ozs7Ozs7QUNWQTtBQW1CQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUF2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0E7Ozs7Ozs7Ozs7O0FDUkE7QUFVQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQTlCQTtBQUNBO0FBQ0E7QTs7Ozs7Ozs7Ozs7QUNIQTtBQVFBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBNUJBO0FBQ0E7QUFDQTtBOzs7Ozs7Ozs7OztBQ0ZBO0FBT0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBMUJBO0FBQ0E7QUFDQTtBOzs7Ozs7Ozs7OztBQ0ZBO0FBU0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUE3QkE7QUFDQTtBQUNBO0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0E7Ozs7Ozs7Ozs7O0FDTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBR0E7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDOUJBO0FBQ0E7QUFFQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUFBO0FBTUE7QUFvTkE7QUFsTkE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFHQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBR0E7O0FBTUE7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUdBOztBQU1BO0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTs7QUF4TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQXVOQTtBQUNBO0FBQ0E7QTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUMzT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFJQTtBQW1CQTs7Ozs7Ozs7QUFRQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFPQTtBQUNBO0FBQ0E7QUFDQTtBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3ZFQTtBQUdBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUEyQkE7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBWUE7QUFRQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDbkVBO0FBQ0E7QUFHQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXVHQTtBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFLQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUtBO0FBTUE7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUtBO0FBTUE7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFFQTtBQUtBO0FBUUE7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUtBO0FBTUE7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQVlBO0FBUUE7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQVlBO0FBT0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUtBO0FBTUE7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3BRQTtBQUdBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBbUJBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3hEQTtBQUdBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXlDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUtBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQU1BO0FBQUE7QUFDQTtBQUNBO0FBRUE7QUFLQTtBQUtBO0FBQUE7QUFDQTtBQUNBO0FBRUE7QUFLQTtBQUtBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUFBO0FBQ0E7QUE0cEJBO0FBMXBCQTtBQUNBO0FBQ0E7QUFHQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBTUE7O0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBT0E7O0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBSUE7QUFDQTtBQUFBO0FBRUE7O0FBS0E7QUFDQTtBQUFBO0FBRUE7O0FBQ0E7QUFDQTtBQUFBO0FBTUE7O0FBS0E7QUFHQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUtBO0FBQUE7QUFDQTtBQUNBO0FBQUE7QUFNQTs7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFNQTtBQUNBO0FBQUE7QUFFQTs7QUFNQTtBQUNBO0FBQUE7QUFNQTs7QUFDQTtBQUNBO0FBQUE7QUFPQTs7QUFRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBSUE7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUNBO0FBQ0E7QUFBQTtBQU1BOztBQUtBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBS0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBT0E7O0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBSUE7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQU1BO0FBQUE7QUFDQTtBQUNBO0FBTUE7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFNQTtBQUFBO0FBQ0E7QUFNQTtBQUFBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBS0E7QUFBQTtBQUVBO0FBQ0E7QUFBQTtBQUVBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQU1BO0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFBQTtBQUVBO0FBQ0E7QUFBQTtBQUVBOztBQU1BO0FBQUE7QUFDQTtBQU1BO0FBQUE7QUFFQTs7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQU1BO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBR0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBTUE7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQU9BO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBRUE7O0FBR0E7QUFDQTtBQU1BO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFRQTtBQUFBO0FBQ0E7QUFRQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBR0E7O0FBTUE7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBS0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBS0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFFQTs7QUFRQTtBQUNBO0FBQUE7QUFDQTtBQVFBO0FBQUE7QUFFQTs7QUFPQTtBQUNBO0FBQUE7QUFDQTtBQVFBO0FBQUE7QUFHQTs7QUFRQTtBQU1BO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFLQTtBQUNBO0FBS0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUdBO0FBQ0E7QUFPQTtBQUFBO0FBQ0E7QUFDQTtBQU1BO0FBQUE7QUFDQTtBQU1BO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUVBOztBQUtBO0FBQ0E7QUFBQTtBQUVBOztBQU1BO0FBSUE7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBTUE7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBOzs7Ozs7OztBQ3RyQkE7QUFDQTtBOzs7Ozs7OztBQ0RBO0FBQ0E7QTs7Ozs7Ozs7QUNEQTtBQUNBO0E7Ozs7Ozs7O0FDREE7QUFDQTtBOzs7Ozs7OztBQ0RBO0FBQ0E7QTs7Ozs7Ozs7QUNEQTtBQUNBO0E7Ozs7Ozs7O0FDREE7QUFDQTtBOzs7Ozs7OztBQ0RBO0FBQ0E7QTs7Ozs7Ozs7QUNEQTtBQUNBO0E7Ozs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7O0EiLCJzb3VyY2VSb290IjoiIn0=