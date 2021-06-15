import { QueryResult } from "pg";

export class Schema {
  static SYS_SCHEMA_NAMES: string[] = [
    "public",
    "information_schema",
    "hdb_catalog",
    "wb",
  ];

  id!: number;
  name!: string;
  label!: string;
  organizationOwnerId?: number;
  userOwnerId?: number;
  createdAt!: Date;
  updatedAt!: Date;
  // not persisted
  userRole?: string;

  public static parseResult(data: QueryResult | null): Array<Schema> {
    if (!data) throw new Error("Schema.parseResult: input is null");
    const schemas = Array<Schema>();
    data.rows.forEach((row: any) => {
      schemas.push(Schema.parse(row));
    });
    return schemas;
  }

  public static parse(data: Record<string, any>): Schema {
    if (!data) throw new Error("Schema.parse: input is null");
    const schema = new Schema();
    schema.id = data.id;
    schema.name = data.name;
    schema.label = data.label;
    schema.organizationOwnerId = data.organizationOwnerId;
    schema.userOwnerId = data.userOwnerId;
    schema.createdAt = data.created_at;
    schema.updatedAt = data.updated_at;
    if (data.user_role) schema.userRole = data.user_role;
    return schema;
  }
}
