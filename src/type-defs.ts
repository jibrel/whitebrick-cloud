import { gql } from "apollo-server-lambda";

export type ServiceResult =
  | { success: true; payload: any }
  | { success: false; message: string; code?: string };

export type QueryParam = {
  query: string;
  params?: any[];
};

export const typeDefs = gql`
  type Tenant {
    id: ID!
    name: String!
    label: String!
    createdAt: String!
    updatedAt: String!
  }
  type User {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    createdAt: String!
    updatedAt: String!
  }
  type Schema {
    id: ID!
    name: String!
    label: String!
    tenantOwnerId: Int
    userOwnerId: Int
    createdAt: String!
    updatedAt: String!
    userRole: String
  }
  type Query {
    wbHealthCheck: String!
    """
    Tenants
    """
    wbTenants: [Tenant]
    wbTenantById(id: ID!): Tenant
    wbTenantByName(name: String!): Tenant
    """
    Users
    """
    wbUsersByTenantId(tenantId: ID!): [User]
    wbUserById(id: ID!): User
    wbUserByEmail(email: String!): User
    """
    Schemas
    """
    wbSchemas(userEmail: String!): [Schema]
    """
    Tables
    """
    wbSchemaTableNames(schemaName: String!): [String]
  }
  type Mutation {
    """
    Test
    """
    wbResetTestData: Boolean!
    """
    Tenants
    """
    wbCreateTenant(name: String!, label: String!): Tenant
    wbUpdateTenant(id: ID!, name: String, label: String): Tenant
    """
    Tenant-User-Roles
    """
    wbAddUserToTenant(
      tenantName: String!
      userEmail: String!
      tenantRole: String!
    ): User
    """
    Users
    """
    wbCreateUser(email: String!, firstName: String, lastName: String): User
    wbUpdateUser(
      id: ID!
      email: String
      firstName: String
      lastName: String
    ): User
    """
    Schemas
    """
    wbCreateSchema(
      name: String! #@constraint(minLength: 3)
      label: String!
      tenantOwnerId: Int
      tenantOwnerName: String
      userOwnerId: Int
      userOwnerEmail: String
    ): Schema
    wbTrackAllTables(schemaName: String!): Boolean!
    """
    Schema-User-Roles
    """
    wbAddUserToSchema(
      schemaName: String!
      userEmail: String!
      schemaRole: String!
    ): User
    """
    Tables
    """
    wbCreateTable(schemaName: String!, tableName: String!): Boolean!
  }
`;
