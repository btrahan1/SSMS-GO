import React from 'react';
import type { ServerConnection } from '../types';

interface ObjectExplorerProps {
  servers: ServerConnection[];
  currentTable: string;
  onOpenConnectModal: () => void;
  onDisconnectServer: (serverId: string, e: React.MouseEvent) => void;
  toggleServerNode: (serverId: string) => void;
  toggleDatabasesFolder: (serverId: string) => void;
  toggleDatabaseNode: (serverId: string, dbName: string) => void;
  toggleTablesFolder: (serverId: string, dbName: string) => void;
  toggleTableNode: (serverId: string, dbName: string, tableName: string) => void;
  handleTableContextMenu: (e: React.MouseEvent, tableName: string, dbName: string, serverId: string) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  leftPaneWidth: number;
}

export const ObjectExplorer: React.FC<ObjectExplorerProps> = ({
  servers,
  currentTable,
  onOpenConnectModal,
  onDisconnectServer,
  toggleServerNode,
  toggleDatabasesFolder,
  toggleDatabaseNode,
  toggleTablesFolder,
  toggleTableNode,
  handleTableContextMenu,
  handleMouseDown,
  leftPaneWidth,
}) => {
  return (
    <div className="pane-left" style={{ width: leftPaneWidth }}>
      <div className="object-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>Object Explorer</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn-secondary"
            onClick={onOpenConnectModal}
            title="Connect to a SQL Server"
            style={{ fontSize: '11px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            ⚡ Connect
          </button>
        </div>
      </div>

      <div className="object-tree" style={{ padding: '6px 0' }}>
        {servers.length === 0 && (
          <div style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center' }}>
            No connected servers.<br />
            <button
              className="btn-primary"
              onClick={onOpenConnectModal}
              style={{ marginTop: '10px', fontSize: '12px', padding: '4px 12px' }}
            >
              ⚡ Connect to Server
            </button>
          </div>
        )}

        {servers.map(server => {
          const isServerExpanded = server.expanded ?? true;
          const isDatabasesFolderExpanded = server.databasesFolderExpanded ?? true;

          return (
            <div key={server.id} className="server-group" style={{ marginBottom: '8px' }}>
              {/* Level 0: Server Root Node */}
              <div
                className="server-header"
                onClick={() => toggleServerNode(server.id)}
                style={{
                  paddingLeft: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  background: 'var(--bg-input)',
                  borderRadius: '4px',
                  margin: '2px 4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <span className={`chevron ${isServerExpanded ? 'open' : ''}`}>▶</span>
                  <span style={{ fontSize: '14px' }}>🖥️</span>
                  <span className="server-name" style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {server.serverName}
                  </span>
                </div>

                <button
                  onClick={(e) => onDisconnectServer(server.id, e)}
                  title={`Disconnect ${server.serverName}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-disabled)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '2px 4px',
                  }}
                >
                  ✕
                </button>
              </div>

              {isServerExpanded && (
                <div className="server-children">
                  {/* Level 1: Databases Folder Node */}
                  <div
                    className="databases-folder-header"
                    onClick={() => toggleDatabasesFolder(server.id)}
                    style={{
                      paddingLeft: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      paddingTop: '3px',
                      paddingBottom: '3px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    <span className={`chevron ${isDatabasesFolderExpanded ? 'open' : ''}`}>▶</span>
                    <span>📁</span>
                    <span style={{ fontWeight: 600 }}>Databases ({server.databases.length})</span>
                  </div>

                  {/* Level 2: Databases List */}
                  {isDatabasesFolderExpanded && server.databases.map(db => {
                    const isTablesFolderExpanded = db.tablesFolderExpanded ?? true;

                    return (
                      <div key={db.name} className="database-group">
                        {/* Level 2: Database Node */}
                        <div
                          className="database-header"
                          onClick={() => toggleDatabaseNode(server.id, db.name)}
                          style={{ paddingLeft: '40px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingTop: '3px', paddingBottom: '3px' }}
                        >
                          <span className={`chevron ${db.expanded ? 'open' : ''}`}>▶</span>
                          <span style={{ fontSize: '13px' }}>🗄️</span>
                          <span className="database-name" style={{ fontWeight: 600, fontSize: '12px' }}>{db.name}</span>
                          {db.loading && <span className="spinner" />}
                        </div>

                        {/* Level 3: Tables Folder Node */}
                        {db.expanded && (
                          <div className="tables-container">
                            <div
                              className="tables-folder-header"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTablesFolder(server.id, db.name);
                              }}
                              style={{
                                paddingLeft: '56px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                paddingTop: '3px',
                                paddingBottom: '3px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: 'var(--text-primary)',
                              }}
                            >
                              <span className={`chevron ${isTablesFolderExpanded ? 'open' : ''}`}>▶</span>
                              <span>📁</span>
                              <span style={{ fontWeight: 600 }}>Tables {db.loaded ? `(${db.tables.length})` : ''}</span>
                              {db.loading && <span className="spinner" />}
                            </div>

                            {/* Level 4: Tables List */}
                            {isTablesFolderExpanded && db.tables.map(t => {
                              const tableDetail = db.tableDetails?.[t];
                              const isTableExpanded = tableDetail?.expanded ?? false;
                              const columns = tableDetail?.columns || [];

                              return (
                                <div key={t} className="table-group">
                                  <div
                                    className={`table-item ${currentTable === t ? 'active' : ''}`}
                                    onClick={() => toggleTableNode(server.id, db.name, t)}
                                    onContextMenu={(e) => handleTableContextMenu(e, t, db.name, server.id)}
                                    style={{ paddingLeft: '72px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    <span className={`chevron ${isTableExpanded ? 'open' : ''}`}>▶</span>
                                    <span className="table-icon">📋</span>
                                    <span className="table-name">{t}</span>
                                    {tableDetail?.loading && <span className="spinner" />}
                                  </div>

                                  {/* Level 5: Columns Folder Node */}
                                  {isTableExpanded && (
                                    <div className="columns-folder-container">
                                      <div
                                        style={{
                                          paddingLeft: '88px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          paddingTop: '2px',
                                          paddingBottom: '2px',
                                          fontSize: '11px',
                                          color: 'var(--text-secondary)',
                                          fontWeight: 600,
                                        }}
                                      >
                                        <span className="chevron open">▶</span>
                                        <span>📁</span>
                                        <span>Columns {tableDetail?.loaded ? `(${columns.length})` : ''}</span>
                                      </div>

                                      {/* Level 6: Column Field Items */}
                                      <div className="columns-group" style={{ paddingLeft: '104px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {tableDetail?.loading ? (
                                          <div style={{ padding: '2px 0', fontSize: '11px' }}>Loading columns...</div>
                                        ) : columns.length > 0 ? (
                                          columns.map(col => (
                                            <div
                                              key={col.ColumnName}
                                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0' }}
                                              title={`${col.ColumnName} (${col.DataType})`}
                                            >
                                              <span>{col.IsPrimaryKey ? '🔑' : col.IsIdentity ? '🆔' : '🔹'}</span>
                                              <span style={{ fontWeight: col.IsPrimaryKey ? 'bold' : 'normal', color: 'var(--text-primary)' }}>
                                                {col.ColumnName}
                                              </span>
                                              <span style={{ fontSize: '10px', color: 'var(--text-disabled)' }}>
                                                ({col.DataType}{col.CharacterMaxLength ? `(${col.CharacterMaxLength})` : ''}{col.IsPrimaryKey ? ', PK' : ''}{col.IsNullable === 'YES' ? ', null' : ', not null'})
                                              </span>
                                            </div>
                                          ))
                                        ) : (
                                          <div style={{ padding: '2px 0', fontSize: '11px', color: 'var(--text-disabled)' }}>No column details</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resize Handle */}
      <div className="pane-resize-handle" onMouseDown={handleMouseDown} />
    </div>
  );
};

export default ObjectExplorer;
