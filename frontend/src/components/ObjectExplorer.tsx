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
  toggleProgrammabilityFolder: (serverId: string, dbName: string) => void;
  toggleProceduresFolder: (serverId: string, dbName: string) => void;
  toggleProcedureNode: (serverId: string, dbName: string, procName: string) => void;
  toggleFunctionsFolder: (serverId: string, dbName: string) => void;
  toggleScalarFunctionsFolder: (serverId: string, dbName: string) => void;
  toggleTableFunctionsFolder: (serverId: string, dbName: string) => void;
  toggleFunctionNode: (serverId: string, dbName: string, funcName: string) => void;
  handleTableContextMenu: (e: React.MouseEvent, tableName: string, dbName: string, serverId: string) => void;
  handleRoutineContextMenu: (e: React.MouseEvent, routineName: string, dbName: string, serverId: string, objectType: 'procedure' | 'function', routineType?: string) => void;
  handleFolderContextMenu: (e: React.MouseEvent, serverId: string, dbName: string, folderType: 'tables' | 'procedures' | 'functions') => void;
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
  toggleProgrammabilityFolder,
  toggleProceduresFolder,
  toggleProcedureNode,
  toggleFunctionsFolder,
  toggleScalarFunctionsFolder,
  toggleTableFunctionsFolder,
  toggleFunctionNode,
  handleTableContextMenu,
  handleRoutineContextMenu,
  handleFolderContextMenu,
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

                  {isDatabasesFolderExpanded && server.databases.map(db => {
                    const isTablesFolderExpanded = db.tablesFolderExpanded ?? true;

                    const filteredTables = db.tablesFilter
                      ? db.tables.filter(t => t.toLowerCase().includes(db.tablesFilter!.toLowerCase()))
                      : db.tables;

                    const filteredProcs = db.proceduresFilter
                      ? (db.storedProcedures || []).filter(p => p.toLowerCase().includes(db.proceduresFilter!.toLowerCase()))
                      : (db.storedProcedures || []);

                    const filteredFuncs = db.functionsFilter
                      ? (db.functions || []).filter(f => f.name.toLowerCase().includes(db.functionsFilter!.toLowerCase()))
                      : (db.functions || []);

                    return (
                      <div key={db.name} className="database-group">
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

                        {db.expanded && (
                          <div className="database-contents">
                            {/* Tables Folder Node */}
                            <div className="tables-container">
                              <div
                                className="tables-folder-header"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTablesFolder(server.id, db.name);
                                }}
                                onContextMenu={(e) => handleFolderContextMenu(e, server.id, db.name, 'tables')}
                                style={{
                                  paddingLeft: '56px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  paddingTop: '3px',
                                  paddingBottom: '3px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  color: db.tablesFilter ? 'var(--accent-primary)' : 'var(--text-primary)',
                                }}
                                title="Right-click to filter tables"
                              >
                                <span className={`chevron ${isTablesFolderExpanded ? 'open' : ''}`}>▶</span>
                                <span>📁</span>
                                <span style={{ fontWeight: 600 }}>
                                  Tables {db.loaded ? `(${filteredTables.length}${db.tablesFilter ? ` / ${db.tables.length}` : ''})` : ''}
                                </span>
                                {db.tablesFilter && <span style={{ fontSize: '11px' }}>🔍</span>}
                                {db.loading && <span className="spinner" />}
                              </div>

                              {/* Tables List */}
                              {isTablesFolderExpanded && filteredTables.map(t => {
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

                            {/* Programmability Folder Node */}
                            <div className="programmability-container">
                              <div
                                className="programmability-folder-header"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProgrammabilityFolder(server.id, db.name);
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
                                <span className={`chevron ${db.programmabilityExpanded ? 'open' : ''}`}>▶</span>
                                <span>📁</span>
                                <span style={{ fontWeight: 600 }}>Programmability</span>
                              </div>

                              {db.programmabilityExpanded && (
                                <div className="programmability-children">
                                  {/* Stored Procedures Folder */}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleProceduresFolder(server.id, db.name);
                                    }}
                                    onContextMenu={(e) => handleFolderContextMenu(e, server.id, db.name, 'procedures')}
                                    style={{
                                      paddingLeft: '72px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      paddingTop: '3px',
                                      paddingBottom: '3px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      color: db.proceduresFilter ? 'var(--accent-primary)' : 'inherit',
                                    }}
                                    title="Right-click to filter stored procedures"
                                  >
                                    <span className={`chevron ${db.proceduresFolderExpanded ? 'open' : ''}`}>▶</span>
                                    <span>📁</span>
                                    <span style={{ fontWeight: 600 }}>
                                      Stored Procedures {db.proceduresLoaded ? `(${filteredProcs.length}${db.proceduresFilter ? ` / ${(db.storedProcedures || []).length}` : ''})` : ''}
                                    </span>
                                    {db.proceduresFilter && <span style={{ fontSize: '11px' }}>🔍</span>}
                                    {db.proceduresLoading && <span className="spinner" />}
                                  </div>

                                  {db.proceduresFolderExpanded && filteredProcs.map(proc => {
                                    const procDetail = db.procedureDetails?.[proc];
                                    const isProcExpanded = procDetail?.expanded ?? false;
                                    const parameters = procDetail?.parameters || [];

                                    return (
                                      <div key={proc} className="procedure-group">
                                        <div
                                          className="procedure-item"
                                          onClick={() => toggleProcedureNode(server.id, db.name, proc)}
                                          onContextMenu={(e) => handleRoutineContextMenu(e, proc, db.name, server.id, 'procedure')}
                                          style={{ paddingLeft: '88px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingTop: '2px', paddingBottom: '2px', fontSize: '12px' }}
                                        >
                                          <span className={`chevron ${isProcExpanded ? 'open' : ''}`}>▶</span>
                                          <span>⚡</span>
                                          <span className="routine-name">{proc}</span>
                                          {procDetail?.loading && <span className="spinner" />}
                                        </div>

                                        {isProcExpanded && (
                                          <div className="parameters-container" style={{ paddingLeft: '104px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '2px', paddingBottom: '2px', fontWeight: 600 }}>
                                              <span className="chevron open">▶</span>
                                              <span>📁</span>
                                              <span>Parameters {procDetail?.loaded ? `(${parameters.length})` : ''}</span>
                                            </div>

                                            <div className="parameters-group" style={{ paddingLeft: '16px' }}>
                                              {procDetail?.loading ? (
                                                <div style={{ padding: '2px 0' }}>Loading parameters...</div>
                                              ) : parameters.length > 0 ? (
                                                parameters.map(param => (
                                                  <div key={param.parameterName} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0' }} title={`${param.parameterName} (${param.dataType})`}>
                                                    <span>{param.isOutput ? '📤' : '📥'}</span>
                                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{param.parameterName}</span>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-disabled)' }}>
                                                      ({param.dataType}{param.characterMaxLength ? `(${param.characterMaxLength})` : ''}{param.isOutput ? ', out' : ''})
                                                    </span>
                                                  </div>
                                                ))
                                              ) : (
                                                <div style={{ padding: '2px 0', color: 'var(--text-disabled)' }}>No parameters</div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Functions Folder */}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFunctionsFolder(server.id, db.name);
                                    }}
                                    onContextMenu={(e) => handleFolderContextMenu(e, server.id, db.name, 'functions')}
                                    style={{
                                      paddingLeft: '72px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      paddingTop: '3px',
                                      paddingBottom: '3px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      color: db.functionsFilter ? 'var(--accent-primary)' : 'inherit',
                                    }}
                                    title="Right-click to filter functions"
                                  >
                                    <span className={`chevron ${db.functionsFolderExpanded ? 'open' : ''}`}>▶</span>
                                    <span>📁</span>
                                    <span style={{ fontWeight: 600 }}>
                                      Functions {db.functionsLoaded ? `(${filteredFuncs.length}${db.functionsFilter ? ` / ${(db.functions || []).length}` : ''})` : ''}
                                    </span>
                                    {db.functionsFilter && <span style={{ fontSize: '11px' }}>🔍</span>}
                                    {db.functionsLoading && <span className="spinner" />}
                                  </div>

                                  {db.functionsFolderExpanded && (
                                    <div className="functions-subfolders">
                                      {/* Scalar-valued Functions */}
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleScalarFunctionsFolder(server.id, db.name);
                                        }}
                                        style={{ paddingLeft: '88px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingTop: '2px', paddingBottom: '2px', fontSize: '12px' }}
                                      >
                                        <span className={`chevron ${db.scalarFunctionsFolderExpanded ? 'open' : ''}`}>▶</span>
                                        <span>📁</span>
                                        <span style={{ fontWeight: 600 }}>
                                          Scalar-valued Functions ({filteredFuncs.filter(f => f.routineType === 'Scalar').length})
                                        </span>
                                      </div>

                                      {db.scalarFunctionsFolderExpanded && filteredFuncs.filter(f => f.routineType === 'Scalar').map(func => {
                                        const funcDetail = db.functionDetails?.[func.name];
                                        const isFuncExpanded = funcDetail?.expanded ?? false;
                                        const parameters = funcDetail?.parameters || [];

                                        return (
                                          <div key={func.name} className="function-group">
                                            <div
                                              className="function-item"
                                              onClick={() => toggleFunctionNode(server.id, db.name, func.name)}
                                              onContextMenu={(e) => handleRoutineContextMenu(e, func.name, db.name, server.id, 'function', func.routineType)}
                                              style={{ paddingLeft: '104px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingTop: '2px', paddingBottom: '2px', fontSize: '12px' }}
                                            >
                                              <span className={`chevron ${isFuncExpanded ? 'open' : ''}`}>▶</span>
                                              <span>⚙️</span>
                                              <span className="routine-name">{func.name}</span>
                                              {funcDetail?.loading && <span className="spinner" />}
                                            </div>

                                            {isFuncExpanded && (
                                              <div className="parameters-container" style={{ paddingLeft: '120px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '2px', paddingBottom: '2px', fontWeight: 600 }}>
                                                  <span className="chevron open">▶</span>
                                                  <span>📁</span>
                                                  <span>Parameters {funcDetail?.loaded ? `(${parameters.length})` : ''}</span>
                                                </div>

                                                <div className="parameters-group" style={{ paddingLeft: '16px' }}>
                                                  {funcDetail?.loading ? (
                                                    <div style={{ padding: '2px 0' }}>Loading parameters...</div>
                                                  ) : parameters.length > 0 ? (
                                                    parameters.map(param => (
                                                      <div key={param.parameterName} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0' }} title={`${param.parameterName} (${param.dataType})`}>
                                                        <span>{param.isOutput ? '📤' : '📥'}</span>
                                                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{param.parameterName}</span>
                                                        <span style={{ fontSize: '10px', color: 'var(--text-disabled)' }}>
                                                          ({param.dataType}{param.characterMaxLength ? `(${param.characterMaxLength})` : ''})
                                                        </span>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <div style={{ padding: '2px 0', color: 'var(--text-disabled)' }}>No parameters</div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}

                                      {/* Table-valued Functions */}
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleTableFunctionsFolder(server.id, db.name);
                                        }}
                                        style={{ paddingLeft: '88px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingTop: '2px', paddingBottom: '2px', fontSize: '12px' }}
                                      >
                                        <span className={`chevron ${db.tableFunctionsFolderExpanded ? 'open' : ''}`}>▶</span>
                                        <span>📁</span>
                                        <span style={{ fontWeight: 600 }}>
                                          Table-valued Functions ({filteredFuncs.filter(f => f.routineType === 'Table-valued').length})
                                        </span>
                                      </div>

                                      {db.tableFunctionsFolderExpanded && filteredFuncs.filter(f => f.routineType === 'Table-valued').map(func => {
                                        const funcDetail = db.functionDetails?.[func.name];
                                        const isFuncExpanded = funcDetail?.expanded ?? false;
                                        const parameters = funcDetail?.parameters || [];

                                        return (
                                          <div key={func.name} className="function-group">
                                            <div
                                              className="function-item"
                                              onClick={() => toggleFunctionNode(server.id, db.name, func.name)}
                                              onContextMenu={(e) => handleRoutineContextMenu(e, func.name, db.name, server.id, 'function', func.routineType)}
                                              style={{ paddingLeft: '104px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingTop: '2px', paddingBottom: '2px', fontSize: '12px' }}
                                            >
                                              <span className={`chevron ${isFuncExpanded ? 'open' : ''}`}>▶</span>
                                              <span>⚙️</span>
                                              <span className="routine-name">{func.name}</span>
                                              {funcDetail?.loading && <span className="spinner" />}
                                            </div>

                                            {isFuncExpanded && (
                                              <div className="parameters-container" style={{ paddingLeft: '120px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '2px', paddingBottom: '2px', fontWeight: 600 }}>
                                                  <span className="chevron open">▶</span>
                                                  <span>📁</span>
                                                  <span>Parameters {funcDetail?.loaded ? `(${parameters.length})` : ''}</span>
                                                </div>

                                                <div className="parameters-group" style={{ paddingLeft: '16px' }}>
                                                  {funcDetail?.loading ? (
                                                    <div style={{ padding: '2px 0' }}>Loading parameters...</div>
                                                  ) : parameters.length > 0 ? (
                                                    parameters.map(param => (
                                                      <div key={param.parameterName} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0' }} title={`${param.parameterName} (${param.dataType})`}>
                                                        <span>{param.isOutput ? '📤' : '📥'}</span>
                                                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{param.parameterName}</span>
                                                        <span style={{ fontSize: '10px', color: 'var(--text-disabled)' }}>
                                                          ({param.dataType}{param.characterMaxLength ? `(${param.characterMaxLength})` : ''})
                                                        </span>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <div style={{ padding: '2px 0', color: 'var(--text-disabled)' }}>No parameters</div>
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

      <div className="pane-resize-handle" onMouseDown={handleMouseDown} />
    </div>
  );
};

export default ObjectExplorer;
