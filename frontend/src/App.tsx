import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GetTableSchema,
  ExecuteQuery,
  ConnectServerWithId,
  DisconnectServerWithId,
  ListDatabasesForServer,
  ListTablesForServer,
  GetTableSchemaForServer,
  ExecuteQueryForServer,
  ListConnectionProfiles,
  SaveConnectionProfile,
  DeleteConnectionProfile,
  GetStatusInfo
} from '../wailsjs/go/main/App';

import {
  type DatabaseNode,
  type ServerConnection,
  type Column,
  type ContextMenuState,
  type TableSchemaColumn,
  type ConnectionProfile,
  generateId
} from './types';

import { formatTableName, extractTableNameFromQuery } from './utils/sql';

import StatusBar from './components/StatusBar';
import ConnectionModal from './components/ConnectionModal';
import ObjectExplorer from './components/ObjectExplorer';
import QueryEditor from './components/QueryEditor';
import DataGrid from './components/DataGrid';
import ProfileModal from './components/ProfileModal';
import ContextMenu from './components/ContextMenu';
import { useQueryTabs } from './hooks/useQueryTabs';
import { useGridEditing } from './hooks/useGridEditing';

import './App.css';

function App() {
  // --- Query Tabs & State Hook ---
  const {
    tabs,
    activeTabId,
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
  } = useQueryTabs();

  // --- Multi-Server Connections State ---
  const [servers, setServers] = useState<ServerConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // --- Grid Editing Hook ---
  const {
    isIdentityColumn,
    startEditing,
    handleCellChange,
    handleCellKeyDown,
    handleRowSelect,
    handleInsertRow,
    handleDeleteSelectedRows,
    handleSaveChanges,
  } = useGridEditing({
    columns,
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
    currentTable,
    currentDatabase,
    query,
    setStatusMessage,
    setIsLoadingResults,
  });

  // --- Connection State ---
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [serverName, setServerName] = useState('');
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connectServer, setConnectServer] = useState('MSI\\SQLEXPRESS01');
  const [connectAuthType, setConnectAuthType] = useState('windows');
  const [connectUsername, setConnectUsername] = useState('sa');
  const [connectPassword, setConnectPassword] = useState('');
  const [connectDatabase, setConnectDatabase] = useState('');


  // --- Context Menu ---
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // --- Theme State ---
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ssms-go-theme') || 'light';
  });

  // --- Connection Profiles ---
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ConnectionProfile | null>(null);

  const loadProfiles = useCallback(async () => {
    try {
      const res = await ListConnectionProfiles();
      if (res && res.profiles) {
        setProfiles(res.profiles);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleSelectProfile = (p: ConnectionProfile) => {
    setConnectServer(p.server || '');
    setConnectAuthType(p.authType || 'windows');
    setConnectUsername(p.username || '');
    setConnectPassword(p.password || '');
    setConnectDatabase(p.defaultDatabase || '');
  };

  const handleDeleteProfile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await DeleteConnectionProfile(id);
      if (res && res.profiles) {
        setProfiles(res.profiles);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Resizable Panes ---
  const [leftPaneWidth, setLeftPaneWidth] = useState(280);
  const resizingRef = useRef(false);
  const lastXRef = useRef(0);

  // Refs
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // --- Theme Effect ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ssms-go-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // --- Status Bar Update ---
  const updateStatusBar = useCallback(async () => {
    try {
      const status = await GetStatusInfo();
      if (status) {
        setExecutionTime(status.executionTime || '');
        setRowsAffected(status.rowsAffected || 0);
      }
    } catch (err) {
      // Silently handle
    }
  }, []);
  // --- Connection ---
  const handleConnect = async () => {
    await loadProfiles();
    setShowConnectDialog(true);
  };

  const handleConnectSubmit = async () => {
    setShowConnectDialog(false);
    setLoading(true);
    setStatusMessage('Connecting...');
    try {
      let connStr: string;
      if (connectAuthType === 'windows') {
        connStr = `server=${connectServer};integrated security=true;trustservercertificate=true;`;
      } else {
        connStr = `server=${connectServer};user id=${connectUsername};password=${connectPassword};trustservercertificate=true;`;
      }
      if (connectDatabase) {
        connStr += `database=${connectDatabase};`;
      }

      const serverId = generateId();
      const response = await ConnectServerWithId(serverId, connStr, connectServer, connectDatabase);
      if (response.success) {
        setConnected(true);
        setConnectionStatus('Connected');
        setServerName(connectServer);
        if (connectDatabase) setCurrentDatabase(connectDatabase);
        setStatusMessage(`Connected to ${connectServer}`);

        let dbNodes: DatabaseNode[] = [];
        try {
          const dbRes = await ListDatabasesForServer(serverId);
          if (dbRes.databases) {
            dbNodes = dbRes.databases.map((name: string) => ({
              name,
              tables: [],
              expanded: false,
              loaded: false,
              loading: false,
            }));
          }
        } catch (e) {
          console.error(e);
        }

        const newServer: ServerConnection = {
          id: serverId,
          serverName: connectServer,
          authType: connectAuthType,
          username: connectUsername,
          defaultDatabase: connectDatabase,
          databases: dbNodes,
          expanded: true,
          databasesFolderExpanded: true,
        };

        setServers(prev => [...prev, newServer]);

        // Auto-save connection profile in connection history (deduplicating existing)
        try {
          const existing = profiles.find(p =>
            p.server.toLowerCase() === connectServer.toLowerCase() &&
            p.authType === connectAuthType &&
            (p.username || '') === connectUsername &&
            (p.defaultDatabase || '') === connectDatabase
          );
          const profileToSave: ConnectionProfile = {
            id: existing ? existing.id : generateId(),
            name: `${connectServer} (${connectDatabase || 'default'})`,
            server: connectServer,
            authType: connectAuthType,
            username: connectUsername,
            password: connectPassword,
            defaultDatabase: connectDatabase,
          };
          await SaveConnectionProfile(profileToSave);
          await loadProfiles();
        } catch (e) {
          console.error('Failed to save profile:', e);
        }
      } else {
        setStatusMessage(response.message);
      }
    } catch (err: any) {
      setStatusMessage(`Connection failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectServer = async (serverId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await DisconnectServerWithId(serverId);
    } catch (err) {
      console.error(err);
    }
    setServers(prev => {
      const remaining = prev.filter(s => s.id !== serverId);
      if (remaining.length === 0) {
        setConnected(false);
        setConnectionStatus('Disconnected');
        setServerName('');
        setCurrentDatabase('');
      }
      return remaining;
    });
    setStatusMessage('Server disconnected');
  };

  // --- Multi-Server Tree Toggle Handlers ---
  const toggleServerNode = (serverId: string) => {
    setServers(prev => prev.map(s => s.id === serverId ? { ...s, expanded: !s.expanded } : s));
  };

  const toggleDatabasesFolder = (serverId: string) => {
    setServers(prev => prev.map(s => s.id === serverId ? { ...s, databasesFolderExpanded: !(s.databasesFolderExpanded ?? true) } : s));
  };

  const toggleDatabaseNode = async (serverId: string, dbName: string) => {
    const sIndex = servers.findIndex(s => s.id === serverId);
    if (sIndex === -1) return;

    const serverObj = servers[sIndex];
    const dbIndex = serverObj.databases.findIndex(d => d.name === dbName);
    if (dbIndex === -1) return;

    const db = serverObj.databases[dbIndex];
    if (db.expanded) {
      setServers(prev => prev.map(s => {
        if (s.id === serverId) {
          const updatedDbs = [...s.databases];
          updatedDbs[dbIndex] = { ...db, expanded: false };
          return { ...s, databases: updatedDbs };
        }
        return s;
      }));
      return;
    }

    if (!db.loaded && !db.loading) {
      setServers(prev => prev.map(s => {
        if (s.id === serverId) {
          const updatedDbs = [...s.databases];
          updatedDbs[dbIndex] = { ...db, loading: true };
          return { ...s, databases: updatedDbs };
        }
        return s;
      }));

      try {
        const response = await ListTablesForServer(serverId, dbName);
        const tables = response.tables || [];
        setServers(prev => prev.map(s => {
          if (s.id === serverId) {
            const updatedDbs = [...s.databases];
            updatedDbs[dbIndex] = { ...db, tables, expanded: true, loaded: true, loading: false };
            return { ...s, databases: updatedDbs };
          }
          return s;
        }));
        setCurrentDatabase(dbName);
      } catch (err) {
        console.error('Failed to load tables:', err);
        setServers(prev => prev.map(s => {
          if (s.id === serverId) {
            const updatedDbs = [...s.databases];
            updatedDbs[dbIndex] = { ...db, loading: false };
            return { ...s, databases: updatedDbs };
          }
          return s;
        }));
      }
    } else {
      setServers(prev => prev.map(s => {
        if (s.id === serverId) {
          const updatedDbs = [...s.databases];
          updatedDbs[dbIndex] = { ...db, expanded: true };
          return { ...s, databases: updatedDbs };
        }
        return s;
      }));
      setCurrentDatabase(dbName);
    }
  };

  const toggleTablesFolder = (serverId: string, dbName: string) => {
    setServers(prev => prev.map(s => {
      if (s.id === serverId) {
        const updatedDbs = s.databases.map(db => {
          if (db.name === dbName) {
            return { ...db, tablesFolderExpanded: !(db.tablesFolderExpanded ?? true) };
          }
          return db;
        });
        return { ...s, databases: updatedDbs };
      }
      return s;
    }));
  };

  const toggleTableNode = async (serverId: string, dbName: string, tableName: string) => {
    setCurrentTable(tableName);
    setCurrentDatabase(dbName);
    setContextMenu(null);

    const formattedTable = formatTableName(tableName);
    const queryText = `SELECT TOP 100 * FROM ${formattedTable}`;
    setQuery(queryText);
    setStatusMessage(`Loading ${tableName}...`);
    setIsLoadingResults(true);

    try {
      const schemaResponse = await GetTableSchemaForServer(serverId, dbName, tableName);
      const schemaCols = schemaResponse.schema || [];

      setServers(prev => prev.map(s => {
        if (s.id === serverId) {
          const updatedDbs = s.databases.map(db => {
            if (db.name === dbName) {
              const details = db.tableDetails || {};
              const curDet = details[tableName] || { name: tableName };
              return {
                ...db,
                tableDetails: {
                  ...details,
                  [tableName]: { ...curDet, columns: schemaCols, loaded: true, expanded: !(curDet.expanded ?? false) }
                }
              };
            }
            return db;
          });
          return { ...s, databases: updatedDbs };
        }
        return s;
      }));

      setColumns(schemaCols.map((col: TableSchemaColumn) => ({
        name: col.ColumnName,
        isPrimaryKey: col.IsPrimaryKey,
        isIdentity: col.IsIdentity,
        dataType: col.DataType,
      })));

      setStatusMessage(`Schema loaded for ${tableName}. Click Execute to run query.`);
    } catch (err: any) {
      setStatusMessage(`Error loading table ${tableName}: ${err}`);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // --- Query Execution ---
  const handleExecuteQuery = async () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    const targetDb = activeTab?.currentDatabase || currentDatabase;
    const serverId = activeTab?.serverId || (servers.length > 0 ? servers[servers.length - 1].id : '');

    setIsLoadingResults(true);
    setStatusMessage('Executing query...');
    setSelectedRows(new Set());
    setEditingRows([]);
    setNewRow(null);

    try {
      const response = await ExecuteQueryForServer(serverId, targetDb, query);
      if (response.columns) {
        let cols: Column[] = response.columns.map((col: string) => ({ name: col }));

        const detectedTable = extractTableNameFromQuery(query) || currentTable;
        if (detectedTable) {
          setCurrentTable(detectedTable);
          try {
            const schemaParts = detectedTable.split('.');
            const schemaName = schemaParts.length > 1 ? schemaParts[0] : 'dbo';
            const actualTableName = schemaParts.length > 1 ? schemaParts[1] : detectedTable;
            const schemaResponse = await GetTableSchemaForServer(serverId, targetDb, `${schemaName}.${actualTableName}`);

            if (schemaResponse.schema) {
              const schemaMap = new Map(schemaResponse.schema.map((c: TableSchemaColumn) => [c.ColumnName.toLowerCase(), c]));
              cols = cols.map(c => {
                const schemaCol = schemaMap.get(c.name.toLowerCase());
                return {
                  ...c,
                  isPrimaryKey: schemaCol ? schemaCol.IsPrimaryKey : false,
                  isIdentity: schemaCol ? schemaCol.IsIdentity : false,
                  dataType: schemaCol ? schemaCol.DataType : undefined,
                };
              });
            }
          } catch (e) {
            // Silently ignore schema fetch errors
          }
        }

        setColumns(cols);
        setData(response.results || []);
        setOriginalData(response.results ? response.results.map(r => ({...r})) : []);
        setStatusMessage(response.message);
        if (response.duration) setExecutionTime(response.duration);
        if (response.rowsAffected !== undefined) setRowsAffected(response.rowsAffected);
        await updateStatusBar();
      }
    } catch (err: any) {
      setStatusMessage(`Query failed: ${err}`);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // --- Context Menu ---
  const handleTableContextMenu = (e: React.MouseEvent, tableName: string, dbName: string, serverId: string) => {
    e.preventDefault();
    setCurrentDatabase(dbName);
    setContextMenu({ x: e.clientX, y: e.clientY, table: tableName, db: dbName, serverId });
  };

  const handleSelectTop100 = async () => {
    if (!contextMenu) return;
    const { table } = contextMenu;
    const formattedTable = formatTableName(table);
    const queryText = `SELECT TOP 100 * FROM ${formattedTable}`;
    setQuery(queryText);
    setCurrentTable(table);
    setContextMenu(null);

    if (currentDatabase) {
      setIsLoadingResults(true);
      setStatusMessage('Executing query...');
      try {
        const response = await ExecuteQuery(currentDatabase, queryText);
        if (response.columns) {
          setColumns(response.columns.map((col: string) => ({ name: col })));
          setData(response.results || []);
          setOriginalData(response.results ? response.results.map(r => ({...r})) : []);
          setStatusMessage(response.message);
        }
      } catch (err: any) {
        setStatusMessage(`Query failed: ${err}`);
      } finally {
        setIsLoadingResults(false);
      }
    }
  };

  const handleEditTop100 = async () => {
    if (!contextMenu) return;
    const { table, db } = contextMenu;
    const editDb = db || currentDatabase;
    const formattedTable = formatTableName(table);
    setQuery(`SELECT TOP 100 * FROM ${formattedTable}`);

    setCurrentTable(table);
    if (db) setCurrentDatabase(db);
    setContextMenu(null);
    setStatusMessage(`Editing table: ${table}`);
    setIsLoadingResults(true);

    try {
      const response = await ExecuteQuery(editDb, `SELECT TOP 100 * FROM ${formattedTable}`);
      if (response.results) {
        setData(response.results);
        setOriginalData(JSON.parse(JSON.stringify(response.results)));
        setColumns(response.columns ? response.columns.map((col: string) => ({ name: col })) : []);
        setEditingRows([]);
        setNewRow(null);

        // Fetch table schema
        const schemaParts = table.split('.');
        const schemaName = schemaParts.length > 1 ? schemaParts[0] : 'dbo';
        const actualTableName = schemaParts.length > 1 ? schemaParts[1] : table;
        const schemaResponse = await GetTableSchema(editDb, `${schemaName}.${actualTableName}`);

        if (schemaResponse.schema) {
          setColumns(schemaResponse.schema.map((col: TableSchemaColumn) => ({
            name: col.ColumnName,
            isPrimaryKey: col.IsPrimaryKey,
            isIdentity: col.IsIdentity,
            dataType: col.DataType,
          })));
        }
        setStatusMessage(`Editing Top 100 rows for ${table}`);
      }
    } catch (err: any) {
      setStatusMessage(`Error loading table data for editing: ${err}`);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // --- Click Outside Context Menu ---
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
      setContextMenu(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // --- Resizable Panes ---
  const handleMouseDown = (e: React.MouseEvent) => {
    resizingRef.current = true;
    lastXRef.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const delta = e.clientX - lastXRef.current;
    setLeftPaneWidth(prev => Math.max(150, Math.min(600, prev + delta)));
    lastXRef.current = e.clientX;
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // --- Connection Profiles Dialog Handlers ---
  const handleSaveProfileInDialog = async (profile: ConnectionProfile) => {
    try {
      await SaveConnectionProfile(profile);
      await loadProfiles();
      setShowProfileDialog(false);
      setEditingProfile(null);
      setStatusMessage('Profile saved');
    } catch (err: any) {
      setStatusMessage(`Failed to save profile: ${err}`);
    }
  };

  const handleConnectWithProfile = async (profile: ConnectionProfile) => {
    setShowProfileDialog(false);
    setLoading(true);
    setStatusMessage(`Connecting to profile: ${profile.name}...`);
    try {
      const serverId = generateId();
      let connStr = profile.connectionString;
      if (!connStr) {
        if (profile.authType === 'windows') {
          connStr = `server=${profile.server};integrated security=true;trustservercertificate=true;`;
        } else {
          connStr = `server=${profile.server};user id=${profile.username};password=${profile.password};trustservercertificate=true;`;
        }
        if (profile.defaultDatabase) {
          connStr += `database=${profile.defaultDatabase};`;
        }
      }
      const response = await ConnectServerWithId(serverId, connStr, profile.server, profile.defaultDatabase || '');
      if (response.success) {
        setConnected(true);
        setConnectionStatus('Connected');
        setServerName(profile.server);
        if (profile.defaultDatabase) setCurrentDatabase(profile.defaultDatabase);
        setStatusMessage(`Connected to ${profile.name}`);

        let dbNodes: DatabaseNode[] = [];
        try {
          const dbRes = await ListDatabasesForServer(serverId);
          if (dbRes.databases) {
            dbNodes = dbRes.databases.map((name: string) => ({
              name,
              tables: [],
              expanded: false,
              loaded: false,
              loading: false,
            }));
          }
        } catch (e) {
          console.error(e);
        }

        const newServer: ServerConnection = {
          id: serverId,
          serverName: profile.server,
          authType: profile.authType,
          username: profile.username,
          defaultDatabase: profile.defaultDatabase,
          databases: dbNodes,
          expanded: true,
          databasesFolderExpanded: true,
        };

        setServers(prev => [...prev, newServer]);
      } else {
        setStatusMessage(response.message);
      }
    } catch (err: any) {
      setStatusMessage(`Connection failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---
  return (
    <div id="app">
      {/* Header / Toolbar */}
      <div className="app-header">
        <div className="menu-bar">
          <span className="menu-item">File</span>
          <span className="menu-item">Edit</span>
          <span className="menu-item">View</span>
          <span className="menu-item">Tools</span>
          <span className="menu-item">Help</span>
        </div>

        <div className="toolbar">
          <button
            className="toolbar-btn"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : '🔗 Connect to Server'}
          </button>

          <div className="toolbar-separator" />

          <button
            className="toolbar-btn btn-execute"
            onClick={handleExecuteQuery}
            disabled={!connected || !query.trim() || isLoadingResults}
          >
            ▶ Execute
          </button>

          <button
            className="toolbar-btn"
            onClick={handleInsertRow}
            disabled={!currentTable || isLoadingResults}
          >
            ➕ Insert Row
          </button>

          <button
            className="toolbar-btn"
            onClick={handleSaveChanges}
            disabled={(!editingRows.length && !newRow) || isLoadingResults}
          >
            💾 Save Changes
          </button>

          <button
            className="toolbar-btn"
            onClick={handleDeleteSelectedRows}
            disabled={selectedRows.size === 0 || isLoadingResults}
          >
            🗑️ Delete Selected ({selectedRows.size})
          </button>

          <div className="toolbar-separator" />

          <div className="toolbar-right">
            <button className="toolbar-btn" onClick={() => setShowProfileDialog(true)}>
              📋 Profiles
            </button>

            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Pane: Object Explorer */}
        <ObjectExplorer
          servers={servers}
          currentTable={currentTable}
          onOpenConnectModal={handleConnect}
          onDisconnectServer={handleDisconnectServer}
          toggleServerNode={toggleServerNode}
          toggleDatabasesFolder={toggleDatabasesFolder}
          toggleDatabaseNode={toggleDatabaseNode}
          toggleTablesFolder={toggleTablesFolder}
          toggleTableNode={toggleTableNode}
          handleTableContextMenu={handleTableContextMenu}
          handleMouseDown={handleMouseDown}
          leftPaneWidth={leftPaneWidth}
        />

        {/* Right Pane: Results */}
        <div className="pane-right">
          <QueryEditor
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={handleSelectTab}
            onAddTab={handleAddTab}
            onCloseTab={handleCloseTab}
            query={query}
            setQuery={setQuery}
            handleExecuteQuery={handleExecuteQuery}
            theme={theme}
          />

          <DataGrid
            isLoadingResults={isLoadingResults}
            columns={columns}
            data={data}
            selectedRows={selectedRows}
            newRow={newRow}
            setNewRow={setNewRow}
            editingCell={editingCell}
            setEditingCell={setEditingCell}
            editValue={editValue}
            setEditValue={setEditValue}
            isIdentityColumn={isIdentityColumn}
            handleRowSelect={handleRowSelect}
            startEditing={startEditing}
            handleCellChange={handleCellChange}
            handleCellKeyDown={handleCellKeyDown}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        connected={connected}
        connectionStatus={connectionStatus}
        serverName={serverName}
        currentDatabase={currentDatabase}
        executionTime={executionTime}
        rowsAffected={rowsAffected}
        statusMessage={statusMessage}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          contextMenu={contextMenu}
          contextMenuRef={contextMenuRef}
          onSelectTop100={handleSelectTop100}
          onEditTop100={handleEditTop100}
          onCopyTableName={() => {
            navigator.clipboard.writeText(contextMenu.table);
            setContextMenu(null);
          }}
        />
      )}

      {/* Profile Dialog */}
      {showProfileDialog && (
        <ProfileModal
          profiles={profiles}
          editingProfile={editingProfile}
          onConnectProfile={handleConnectWithProfile}
          onSaveProfile={handleSaveProfileInDialog}
          onDeleteProfile={handleDeleteProfile}
          onSetEditingProfile={setEditingProfile}
          onClose={() => {
            setShowProfileDialog(false);
            setEditingProfile(null);
          }}
        />
      )}

      {/* Connect Dialog */}
      <ConnectionModal
        show={showConnectDialog}
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
        onDeleteProfile={handleDeleteProfile}
        connectServer={connectServer}
        setConnectServer={setConnectServer}
        connectAuthType={connectAuthType}
        setConnectAuthType={setConnectAuthType}
        connectUsername={connectUsername}
        setConnectUsername={setConnectUsername}
        connectPassword={connectPassword}
        setConnectPassword={setConnectPassword}
        connectDatabase={connectDatabase}
        setConnectDatabase={setConnectDatabase}
        loading={loading}
        onConnect={handleConnectSubmit}
        onCancel={() => setShowConnectDialog(false)}
      />
    </div>
  );
}

export default App;
