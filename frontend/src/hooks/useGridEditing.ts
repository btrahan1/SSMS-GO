import React from 'react';
import type { Column, DataRow, EditedRow } from '../types';
import { escapeIdentifier, formatTableName } from '../utils/sql';
import { ExecuteQuery, ExecuteNonQuery } from '../../wailsjs/go/main/App';

interface UseGridEditingParams {
  columns: Column[];
  data: DataRow[];
  setData: (d: DataRow[]) => void;
  originalData: DataRow[];
  setOriginalData: (d: DataRow[]) => void;
  selectedRows: Set<number>;
  setSelectedRows: (s: Set<number>) => void;
  editingCell: { row: number; col: string } | null;
  setEditingCell: (cell: { row: number; col: string } | null) => void;
  editValue: string;
  setEditValue: (val: string) => void;
  editingRows: EditedRow[];
  setEditingRows: (rows: EditedRow[]) => void;
  newRow: DataRow | null;
  setNewRow: (row: DataRow | null) => void;
  currentTable: string;
  currentDatabase: string;
  query: string;
  setStatusMessage: (msg: string) => void;
  setIsLoadingResults: (loading: boolean) => void;
}

export function useGridEditing({
  columns,
  data,
  setData,
  originalData,
  setOriginalData,
  selectedRows,
  setSelectedRows,
  setEditingCell,
  editValue,
  setEditValue,
  editingRows,
  setEditingRows,
  newRow,
  setNewRow,
  currentTable,
  currentDatabase,
  query,
  setStatusMessage,
  setIsLoadingResults,
}: UseGridEditingParams) {
  const isIdentityColumn = (columnName: string) => {
    const col = columns.find(c => c.name === columnName);
    return col ? !!col.isIdentity : false;
  };

  const startEditing = (rowIndex: number, colName: string, value: any) => {
    if (isIdentityColumn(colName)) return;
    setEditingCell({ row: rowIndex, col: colName });
    setEditValue(value === null || value === undefined ? '' : String(value));
  };

  const handleCellChange = (rowIndex: number, colName: string, newValue: string) => {
    const updatedData = [...data];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [colName]: newValue };
    setData(updatedData);

    const existingIndex = editingRows.findIndex(e => e.id === rowIndex);
    if (existingIndex >= 0) {
      const updated = [...editingRows];
      updated[existingIndex].changes[colName] = newValue;
      setEditingRows(updated);
    } else {
      setEditingRows([...editingRows, { id: rowIndex, changes: { [colName]: newValue } }]);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colName: string) => {
    if (e.key === 'Enter') {
      handleCellChange(rowIndex, colName, editValue);
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleRowSelect = (rowIndex: number) => {
    const updated = new Set(selectedRows);
    if (updated.has(rowIndex)) {
      updated.delete(rowIndex);
    } else {
      updated.add(rowIndex);
    }
    setSelectedRows(updated);
  };

  const handleInsertRow = () => {
    if (!currentTable) return;
    const emptyRow: DataRow = {};
    columns.forEach(c => {
      emptyRow[c.name] = null;
    });
    setNewRow(emptyRow);
  };

  const handleDeleteSelectedRows = async () => {
    if (!currentTable || selectedRows.size === 0) return;

    const pkColumns = columns.filter(c => c.isPrimaryKey);
    if (pkColumns.length === 0) {
      setStatusMessage('Cannot delete rows: No Primary Key found in schema');
      return;
    }

    setIsLoadingResults(true);
    let deletedCount = 0;
    const formattedTable = formatTableName(currentTable);

    try {
      const rowsToDelete = Array.from(selectedRows).map(index => originalData[index]);
      for (const row of rowsToDelete) {
        if (!row) continue;
        const whereClauses = pkColumns.map(pk => {
          const val = row[pk.name];
          const escapedCol = escapeIdentifier(pk.name);
          if (val === null || val === undefined) return `${escapedCol} IS NULL`;
          const escaped = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : String(val);
          return `${escapedCol} = ${escaped}`;
        });

        const deleteQuery = `DELETE FROM ${formattedTable} WHERE ${whereClauses.join(' AND ')}`;
        await ExecuteNonQuery(currentDatabase, deleteQuery);
        deletedCount++;
      }

      setStatusMessage(`Successfully deleted ${deletedCount} row(s)`);

      const reloadQuery = query.trim() ? query : `SELECT TOP 100 * FROM ${formattedTable}`;
      const queryResponse = await ExecuteQuery(currentDatabase, reloadQuery);
      if (queryResponse.results) {
        setData(queryResponse.results.map((r: DataRow) => ({ ...r })));
        setOriginalData(queryResponse.results.map((r: DataRow) => ({ ...r })));
        setSelectedRows(new Set());
      }
    } catch (err: any) {
      setStatusMessage(`Delete failed: ${err}`);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!currentTable) return;

    setIsLoadingResults(true);
    let updateCount = 0;
    let insertCount = 0;
    const formattedTable = formatTableName(currentTable);

    try {
      if (newRow) {
        const nonNullColumns = columns.filter(c => newRow[c.name] !== null && newRow[c.name] !== undefined);
        if (nonNullColumns.length > 0) {
          const colNames = nonNullColumns.map(c => escapeIdentifier(c.name)).join(', ');
          const values = nonNullColumns.map(c => {
            const val = newRow[c.name];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return String(val);
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ');
          const insertQuery = `INSERT INTO ${formattedTable} (${colNames}) VALUES (${values})`;
          await ExecuteNonQuery(currentDatabase, insertQuery);
          insertCount++;
        }
      }

      for (const edit of editingRows) {
        const originalRow = originalData[edit.id];
        if (!originalRow) continue;

        const pkColumns = columns.filter(c => c.isPrimaryKey);
        if (pkColumns.length === 0) continue;

        const setClauses = Object.entries(edit.changes).map(([col, val]) => {
          const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : String(val);
          return `${escapeIdentifier(col)} = ${escapedVal}`;
        });

        if (setClauses.length === 0) continue;

        const whereClauses = pkColumns.map(pk => {
          const originalVal = originalRow[pk.name];
          const escapedCol = escapeIdentifier(pk.name);
          if (originalVal === null || originalVal === undefined) return `${escapedCol} IS NULL`;
          const escapedVal = typeof originalVal === 'string' ? `'${originalVal.replace(/'/g, "''")}'` : String(originalVal);
          return `${escapedCol} = ${escapedVal}`;
        });

        const updateQuery = `UPDATE ${formattedTable} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
        await ExecuteNonQuery(currentDatabase, updateQuery);
        updateCount++;
      }

      setStatusMessage(`Saved: ${insertCount} inserted, ${updateCount} updated`);

      const reloadQuery = query.trim() ? query : `SELECT TOP 100 * FROM ${formattedTable}`;
      const queryResponse = await ExecuteQuery(currentDatabase, reloadQuery);
      if (queryResponse.results) {
        setData(queryResponse.results.map((r: DataRow) => ({ ...r })));
        setOriginalData(queryResponse.results.map((r: DataRow) => ({ ...r })));
        setEditingRows([]);
        setNewRow(null);
        setSelectedRows(new Set());
      }
    } catch (err: any) {
      setStatusMessage(`Save failed: ${err}`);
    } finally {
      setIsLoadingResults(false);
    }
  };

  return {
    isIdentityColumn,
    startEditing,
    handleCellChange,
    handleCellKeyDown,
    handleRowSelect,
    handleInsertRow,
    handleDeleteSelectedRows,
    handleSaveChanges,
  };
}
