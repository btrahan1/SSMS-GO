import { main } from '../../wailsjs/go/models';

export type TableSchemaColumn = main.TableSchemaColumn;
export type ConnectionProfile = main.ConnectionProfile;

export interface TableDetail {
  name: string;
  expanded?: boolean;
  loading?: boolean;
  loaded?: boolean;
  columns?: TableSchemaColumn[];
}

export interface DatabaseNode {
  name: string;
  tables: string[];
  tableDetails?: { [tableName: string]: TableDetail };
  expanded: boolean;
  tablesFolderExpanded?: boolean;
  loaded: boolean;
  loading: boolean;
}

export interface ServerConnection {
  id: string;
  serverName: string;
  authType: string;
  username?: string;
  defaultDatabase?: string;
  databases: DatabaseNode[];
  expanded: boolean;
  databasesFolderExpanded?: boolean;
}

export interface Column {
  name: string;
  isPrimaryKey?: boolean;
  isIdentity?: boolean;
  dataType?: string;
}

export interface DataRow {
  [key: string]: any;
}

export interface EditedRow {
  id: number;
  changes: { [column: string]: string };
}

export interface ContextMenuState {
  x: number;
  y: number;
  table: string;
  db: string;
  serverId?: string;
}

export interface QueryTab {
  id: string;
  title: string;
  query: string;
  serverId?: string;
  currentDatabase: string;
  currentTable: string;
  columns: Column[];
  data: DataRow[];
  originalData: DataRow[];
  selectedRows: Set<number>;
  editingCell: { row: number; col: string } | null;
  editValue: string;
  editingRows: EditedRow[];
  newRow: DataRow | null;
  statusMessage: string;
  executionTime: string;
  rowsAffected: number;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
