/**
 * Wraps a single column or table name in SQL Server square brackets `[...]`.
 * Escapes any embedded right brackets `]` by doubling them `]]`.
 */
export function escapeIdentifier(identifier: string): string {
  if (!identifier) return identifier;
  if (identifier.startsWith('[') && identifier.endsWith(']')) {
    return identifier;
  }
  const escaped = identifier.replace(/\]/g, ']]');
  return `[${escaped}]`;
}

/**
 * Formats a table name (e.g. `dbo.MyTable` or `MyTable`) into bracketed form `[dbo].[MyTable]`.
 */
export function formatTableName(tableName: string): string {
  if (!tableName) return tableName;
  const parts = tableName.split('.');
  return parts.map(escapeIdentifier).join('.');
}

/**
 * Extracts the primary table name from a SELECT query (e.g. `FROM [dbo].[Customers]` or `FROM Customers`).
 */
export function extractTableNameFromQuery(query: string): string | null {
  if (!query) return null;
  const match = query.match(/from\s+((?:\[[^\]]+\]|\w+)(?:\.(?:\[[^\]]+\]|\w+))?)/i);
  if (match && match[1]) {
    return match[1].replace(/\[|\]/g, '');
  }
  return null;
}
