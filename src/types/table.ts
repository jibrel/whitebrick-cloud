import { gql, IResolvers } from "apollo-server-lambda";
import { GraphQLJSON } from "graphql-type-json";
import { log } from "../whitebrick-cloud";

export const typeDefs = gql`
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
    wbRemoveOrDeleteTable(
      schemaName: String!
      tableName: String!
      del: Boolean
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
    wbUpdateColumn(
      schemaName: String!
      tableName: String!
      columnName: String!
      newColumnName: String
      newColumnLabel: String
      newType: String
    ): Boolean!
    wbRemoveOrDeleteColumn(
      schemaName: String!
      tableName: String!
      columnName: String!
      del: Boolean
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
    wbAddAllExistingRelationships(schemaName: String!): Boolean!
  }
`;

export const resolvers: IResolvers = {
  JSON: GraphQLJSON,
  Query: {
    wbTables: async (_, { schemaName }, context) => {
      const result = await context.wbCloud.tables(schemaName);
      if (!result.success) throw context.wbCloud.err(result);
      return result.payload;
    },
    wbColumns: async (_, { schemaName, tableName }, context) => {
      const result = await context.wbCloud.columns(schemaName, tableName);
      if (!result.success) throw context.wbCloud.err(result);
      return result.payload;
    },
    wbTableUser: async (_, { schemaName, tableName, userEmail }, context) => {
      const result = await context.wbCloud.tableUser(
        userEmail,
        schemaName,
        tableName
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.payload;
    },
  },
  Mutation: {
    wbAddOrCreateTable: async (
      _,
      { schemaName, tableName, tableLabel, create },
      context
    ) => {
      const result = await context.wbCloud.addOrCreateTable(
        schemaName,
        tableName,
        tableLabel,
        create
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbUpdateTable: async (
      _,
      { schemaName, tableName, newTableName, newTableLabel },
      context
    ) => {
      const result = await context.wbCloud.updateTable(
        schemaName,
        tableName,
        newTableName,
        newTableLabel
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbRemoveOrDeleteTable: async (
      _,
      { schemaName, tableName, del },
      context
    ) => {
      const result = await context.wbCloud.removeOrDeleteTable(
        schemaName,
        tableName,
        del
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbAddAllExistingTables: async (_, { schemaName }, context) => {
      const result = await context.wbCloud.addAllExistingTables(schemaName);
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbAddAllExistingRelationships: async (_, { schemaName }, context) => {
      const result = await context.wbCloud.addAllExistingRelationships(
        schemaName
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbAddOrCreateColumn: async (
      _,
      { schemaName, tableName, columnName, columnLabel, create, columnType },
      context
    ) => {
      const result = await context.wbCloud.addOrCreateColumn(
        schemaName,
        tableName,
        columnName,
        columnLabel,
        create,
        columnType
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbUpdateColumn: async (
      _,
      {
        schemaName,
        tableName,
        columnName,
        newColumnName,
        newColumnLabel,
        newType,
      },
      context
    ) => {
      const result = await context.wbCloud.updateColumn(
        schemaName,
        tableName,
        columnName,
        newColumnName,
        newColumnLabel,
        newType
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbRemoveOrDeleteColumn: async (
      _,
      { schemaName, tableName, columnName, del },
      context
    ) => {
      const result = await context.wbCloud.removeOrDeleteColumn(
        schemaName,
        tableName,
        columnName,
        del
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbCreateOrDeletePrimaryKey: async (
      _,
      { schemaName, tableName, columnNames, del },
      context
    ) => {
      const result = await context.wbCloud.createOrDeletePrimaryKey(
        schemaName,
        tableName,
        columnNames,
        del
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbAddOrCreateForeignKey: async (
      _,
      {
        schemaName,
        tableName,
        columnNames,
        parentTableName,
        parentColumnNames,
        create,
      },
      context
    ) => {
      const result = await context.wbCloud.addOrCreateForeignKey(
        schemaName,
        tableName,
        columnNames,
        parentTableName,
        parentColumnNames,
        create
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbRemoveOrDeleteForeignKey: async (
      _,
      {
        schemaName,
        tableName,
        columnNames,
        parentTableName,
        parentColumnNames,
        del,
      },
      context
    ) => {
      const result = await context.wbCloud.removeOrDeleteForeignKey(
        schemaName,
        tableName,
        columnNames,
        parentTableName,
        del
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
    wbSaveTableUserSettings: async (
      _,
      { schemaName, tableName, userEmail, settings },
      context
    ) => {
      const result = await context.wbCloud.saveTableUserSettings(
        schemaName,
        tableName,
        userEmail,
        settings
      );
      if (!result.success) throw context.wbCloud.err(result);
      return result.success;
    },
  },
};
