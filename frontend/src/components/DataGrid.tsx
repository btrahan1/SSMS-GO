import React, { useState } from 'react';
import type { Column, DataRow } from '../types';
import {
  copyToClipboardTSV,
  copyToClipboardJSON,
  exportToFileCSV,
  exportToFileJSON
} from '../utils/export';

interface DataGridProps {
  isLoadingResults: boolean;
  columns: Column[];
  data: DataRow[];
  selectedRows: Set<number>;
  newRow: DataRow | null;
  setNewRow: (val: DataRow | null) => void;
  editingCell: { row: number; col: string } | null;
  setEditingCell: (val: { row: number; col: string } | null) => void;
  editValue: string;
  setEditValue: (val: string) => void;
  isIdentityColumn: (colName: string) => boolean;
  handleRowSelect: (rowIndex: number) => void;
  startEditing: (rowIndex: number, colName: string, value: any) => void;
  handleCellChange: (rowIndex: number, colName: string, value: string) => void;
  handleCellKeyDown: (e: React.KeyboardEvent, rowIndex: number, colName: string) => void;
}

export const DataGrid: React.FC<DataGridProps> = ({
  isLoadingResults,
  columns,
  data,
  selectedRows,
  newRow,
  setNewRow,
  editingCell,
  setEditingCell,
  editValue,
  setEditValue,
  isIdentityColumn,
  handleRowSelect,
  startEditing,
  handleCellChange,
  handleCellKeyDown,
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleCopyTSV = async () => {
    const count = await copyToClipboardTSV(columns, data, selectedRows);
    const scope = selectedRows.size > 0 ? `${count} selected row(s)` : `${count} row(s)`;
    showFeedback(`Copied ${scope} to clipboard!`);
  };

  const handleCopyJSON = async () => {
    const count = await copyToClipboardJSON(data, selectedRows);
    const scope = selectedRows.size > 0 ? `${count} selected row(s)` : `${count} row(s)`;
    showFeedback(`Copied ${scope} (JSON) to clipboard!`);
  };

  const handleExportCSV = () => {
    exportToFileCSV('query_results', columns, data);
    showFeedback(`Exported ${data.length} row(s) to query_results.csv`);
  };

  const handleExportJSON = () => {
    exportToFileJSON('query_results', data);
    showFeedback(`Exported ${data.length} row(s) to query_results.json`);
  };

  return (
    <div className="results-area" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {!isLoadingResults && columns.length > 0 && (
        <div
          className="results-header-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              {data.length} row(s) {selectedRows.size > 0 ? `(${selectedRows.size} selected)` : ''}
            </span>
            {copyFeedback && (
              <span
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                ✓ {copyFeedback}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="toolbar-btn"
              onClick={handleCopyTSV}
              title="Copy to clipboard formatted for Excel, Google Sheets, or Notepad"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              📋 Copy to Clipboard
            </button>
            <button
              className="toolbar-btn"
              onClick={handleCopyJSON}
              title="Copy rows as JSON string"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              📋 Copy JSON
            </button>
            <span style={{ color: 'var(--border-color)', margin: '0 2px' }}>|</span>
            <button
              className="toolbar-btn"
              onClick={handleExportCSV}
              title="Download results as CSV file"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              💾 Export CSV
            </button>
            <button
              className="toolbar-btn"
              onClick={handleExportJSON}
              title="Download results as JSON file"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              💾 Export JSON
            </button>
          </div>
        </div>
      )}

      {isLoadingResults && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <span className="spinner" /> Loading...
        </div>
      )}

      {!isLoadingResults && columns.length > 0 && (
        <div className="results-table-wrapper" style={{ flex: 1, overflow: 'auto' }}>
          <table className="results-table">
            <thead>
              <tr>
                {selectedRows.size > 0 && <th style={{ width: '40px' }}></th>}
                {columns.map(col => (
                  <th key={col.name}>
                    {col.name}
                    {col.isIdentity && <span className="identity-badge">ID</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {newRow && (
                <tr className="new-row">
                  {columns.map(col => (
                    <td key={col.name} className={newRow[col.name] === null ? 'null-cell' : ''}>
                      {isIdentityColumn(col.name) ? (
                        <em style={{ color: 'var(--text-disabled)' }}>auto</em>
                      ) : (
                        <input
                          className="cell-editor"
                          value={newRow[col.name] || ''}
                          onChange={e => {
                            const updated = { ...newRow, [col.name]: e.target.value };
                            setNewRow(updated);
                          }}
                          placeholder="NULL"
                          autoFocus={col === columns[0]}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              )}
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={selectedRows.has(rowIndex) ? 'selected' : ''}
                >
                  {selectedRows.size > 0 && (
                    <td className="row-select">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={() => handleRowSelect(rowIndex)}
                      />
                    </td>
                  )}
                  {columns.map(col => {
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === col.name;
                    const val = row[col.name];
                    const displayVal = val === null || val === undefined ? 'NULL' : String(val);

                    return (
                      <td
                        key={col.name}
                        className={`${val === null || val === undefined ? 'null-cell' : ''} ${isEditing ? 'editing' : ''}`}
                        onClick={() => {
                          if (!isEditing) {
                            startEditing(rowIndex, col.name, val);
                          }
                        }}
                        onDoubleClick={() => startEditing(rowIndex, col.name, val)}
                      >
                        {isEditing ? (
                          <input
                            className="cell-editor"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => {
                              handleCellChange(rowIndex, col.name, editValue);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => handleCellKeyDown(e, rowIndex, col.name)}
                            autoFocus
                          />
                        ) : (
                          displayVal
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {data.length === 0 && !newRow && (
                <tr>
                  <td colSpan={columns.length || 1} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                    No results. Execute a query or select a table.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataGrid;
