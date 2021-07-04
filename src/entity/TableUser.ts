import { QueryResult } from "pg";

export class TableUser {
  tableId!: number;
  userId!: number;
  roleId!: number;
  impliedFromroleId?: number;
  settings!: object;
  createdAt!: Date;
  updatedAt!: Date;
  // not persisted
  schemaName?: string;
  tableName?: string;
  userEmail?: string;
  role?: string;
  roleImpliedFrom?: string;

  public static parseResult(data: QueryResult | null): Array<TableUser> {
    if (!data) throw new Error("TableUser.parseResult: input is null");
    const tableUsers = Array<TableUser>();
    data.rows.forEach((row: any) => {
      tableUsers.push(TableUser.parse(row));
    });
    return tableUsers;
  }

  public static parse(data: Record<string, any>): TableUser {
    if (!data) throw new Error("TableUser.parse: input is null");
    const tableUser = new TableUser();
    tableUser.tableId = data.table_id;
    tableUser.userId = data.user_id;
    tableUser.roleId = data.role_id;
    if (data.implied_from_role_id) {
      tableUser.impliedFromroleId = data.implied_from_role_id;
    }
    tableUser.settings = data.settings;
    tableUser.createdAt = data.created_at;
    tableUser.updatedAt = data.updated_at;
    if (data.schema_name) tableUser.schemaName = data.schema_name;
    if (data.table_name) tableUser.tableName = data.table_name;
    if (data.user_email) tableUser.userEmail = data.user_email;
    if (data.role) tableUser.role = data.role;
    if (data.role_implied_from) {
      tableUser.roleImpliedFrom = data.role_implied_from;
    }
    return tableUser;
  }
}
