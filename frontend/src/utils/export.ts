import type { Column, DataRow } from '../types';

/**
 * Filters rows if selectedRows set is non-empty, otherwise returns all rows.
 */
function getTargetRows(rows: DataRow[], selectedRows?: Set<number>): DataRow[] {
  if (selectedRows && selectedRows.size > 0) {
    return rows.filter((_, idx) => selectedRows.has(idx));
  }
  return rows;
}

/**
 * Formats data as Tab-Separated Values (TSV) with column headers.
 * Ideal for pasting directly into Excel, Google Sheets, or Notepad.
 */
export async function copyToClipboardTSV(columns: Column[], rows: DataRow[], selectedRows?: Set<number>): Promise<number> {
  const targetRows = getTargetRows(rows, selectedRows);
  if (columns.length === 0 || targetRows.length === 0) return 0;

  const header = columns.map(c => c.name).join('\t');
  const body = targetRows.map(row => {
    return columns.map(col => {
      const val = row[col.name];
      if (val === null || val === undefined) return '';
      // Replace tabs or newlines inside values to keep row format intact
      return String(val).replace(/[\t\r\n]+/g, ' ');
    }).join('\t');
  }).join('\n');

  const text = `${header}\n${body}`;
  await navigator.clipboard.writeText(text);
  return targetRows.length;
}

/**
 * Copies formatted JSON string to clipboard.
 */
export async function copyToClipboardJSON(rows: DataRow[], selectedRows?: Set<number>): Promise<number> {
  const targetRows = getTargetRows(rows, selectedRows);
  if (targetRows.length === 0) return 0;

  const text = JSON.stringify(targetRows, null, 2);
  await navigator.clipboard.writeText(text);
  return targetRows.length;
}

/**
 * Copies CSV formatted string to clipboard.
 */
export async function copyToClipboardCSV(columns: Column[], rows: DataRow[], selectedRows?: Set<number>): Promise<number> {
  const targetRows = getTargetRows(rows, selectedRows);
  if (columns.length === 0 || targetRows.length === 0) return 0;

  const formatCell = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map(c => formatCell(c.name)).join(',');
  const body = targetRows.map(row => {
    return columns.map(col => formatCell(row[col.name])).join(',');
  }).join('\n');

  const text = `${header}\n${body}`;
  await navigator.clipboard.writeText(text);
  return targetRows.length;
}

/**
 * Downloads query results as a CSV file.
 */
export function exportToFileCSV(filename: string, columns: Column[], rows: DataRow[]) {
  if (columns.length === 0 || rows.length === 0) return;

  const formatCell = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map(c => formatCell(c.name)).join(',');
  const body = rows.map(row => {
    return columns.map(col => formatCell(row[col.name])).join(',');
  }).join('\n');

  const csvContent = `\uFEFF${header}\n${body}`; // Add BOM for Excel UTF-8 support
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads query results as a JSON file.
 */
export function exportToFileJSON(filename: string, rows: DataRow[]) {
  if (rows.length === 0) return;

  const jsonContent = JSON.stringify(rows, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
