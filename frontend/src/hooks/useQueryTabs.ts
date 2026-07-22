import { useState } from 'react';
import type { QueryTab, Column, DataRow, EditedRow } from '../types';

export function useQueryTabs() {
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: 'tab-1',
      title: 'Query 1',
      query: 'SELECT TOP 100 * FROM ',
      currentDatabase: '',
      currentTable: '',
      columns: [],
      data: [],
      originalData: [],
      selectedRows: new Set(),
      editingCell: null,
      editValue: '',
      editingRows: [],
      newRow: null,
      statusMessage: 'Ready',
      executionTime: '',
      rowsAffected: 0,
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateActiveTab = (updater: (prevTab: QueryTab) => Partial<QueryTab>) => {
    setTabs(prevTabs =>
      prevTabs.map(t => (t.id === activeTabId ? { ...t, ...updater(t) } : t))
    );
  };

  const query = activeTab?.query || '';
  const setQuery = (val: string) => updateActiveTab(() => ({ query: val }));

  const currentDatabase = activeTab?.currentDatabase || '';
  const setCurrentDatabase = (db: string) => updateActiveTab(() => ({ currentDatabase: db }));

  const currentTable = activeTab?.currentTable || '';
  const setCurrentTable = (table: string) => updateActiveTab(t => ({
    currentTable: table,
    title: table ? table : t.title
  }));

  const columns = activeTab?.columns || [];
  const setColumns = (cols: Column[]) => updateActiveTab(() => ({ columns: cols }));

  const data = activeTab?.data || [];
  const setData = (d: DataRow[]) => updateActiveTab(() => ({ data: d }));

  const originalData = activeTab?.originalData || [];
  const setOriginalData = (d: DataRow[]) => updateActiveTab(() => ({ originalData: d }));

  const selectedRows = activeTab?.selectedRows || new Set();
  const setSelectedRows = (s: Set<number>) => updateActiveTab(() => ({ selectedRows: s }));

  const editingCell = activeTab?.editingCell || null;
  const setEditingCell = (cell: { row: number; col: string } | null) => updateActiveTab(() => ({ editingCell: cell }));

  const editValue = activeTab?.editValue || '';
  const setEditValue = (val: string) => updateActiveTab(() => ({ editValue: val }));

  const editingRows = activeTab?.editingRows || [];
  const setEditingRows = (rows: EditedRow[]) => updateActiveTab(() => ({ editingRows: rows }));

  const newRow = activeTab?.newRow || null;
  const setNewRow = (row: DataRow | null) => updateActiveTab(() => ({ newRow: row }));

  const statusMessage = activeTab?.statusMessage || 'Ready';
  const setStatusMessage = (msg: string) => updateActiveTab(() => ({ statusMessage: msg }));

  const executionTime = activeTab?.executionTime || '';
  const setExecutionTime = (t: string) => updateActiveTab(() => ({ executionTime: t }));

  const rowsAffected = activeTab?.rowsAffected || 0;
  const setRowsAffected = (r: number) => updateActiveTab(() => ({ rowsAffected: r }));

  const handleAddTab = () => {
    const newNum = tabs.length + 1;
    const newTab: QueryTab = {
      id: `tab-${Date.now()}`,
      title: `Query ${newNum}`,
      query: 'SELECT TOP 100 * FROM ',
      currentDatabase: currentDatabase,
      currentTable: '',
      columns: [],
      data: [],
      originalData: [],
      selectedRows: new Set(),
      editingCell: null,
      editValue: '',
      editingRows: [],
      newRow: null,
      statusMessage: 'Ready',
      executionTime: '',
      rowsAffected: 0,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
  };

  return {
    tabs,
    activeTabId,
    activeTab,
    query,
    setQuery,
    currentDatabase,
    setCurrentDatabase,
    currentTable,
    setCurrentTable,
    columns,
    setColumns,
    data,
    setData,
    originalData,
    setOriginalData,
    selectedRows,
    setSelectedRows,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    editingRows,
    setEditingRows,
    newRow,
    setNewRow,
    statusMessage,
    setStatusMessage,
    executionTime,
    setExecutionTime,
    rowsAffected,
    setRowsAffected,
    handleAddTab,
    handleCloseTab,
    handleSelectTab,
  };
}
