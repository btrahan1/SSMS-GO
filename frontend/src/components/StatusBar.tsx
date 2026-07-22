import React from 'react';

interface StatusBarProps {
  connected: boolean;
  connectionStatus: string;
  serverName: string;
  currentDatabase: string;
  executionTime: string;
  rowsAffected: number;
  statusMessage: string;
  theme: string;
  toggleTheme: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  connected,
  connectionStatus,
  serverName,
  currentDatabase,
  executionTime,
  rowsAffected,
  statusMessage,
  theme,
  toggleTheme,
}) => {
  return (
    <div className="status-bar">
      <div className="status-bar-item">
        <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
        <span>{connected ? connectionStatus : 'Disconnected'}</span>
      </div>

      <div className="status-bar-item connection-info" title="Server">
        {serverName && `🗄️ ${serverName}`}
      </div>

      <div className="status-bar-item connection-info" title="Database">
        {currentDatabase && `📁 ${currentDatabase}`}
      </div>

      <div className="status-bar-spacer" />

      <div className="status-bar-right">
        {executionTime && (
          <div className="status-bar-item" title="Execution time">
            ⏱️ {executionTime}
          </div>
        )}
        {rowsAffected > 0 && (
          <div className="status-bar-item" title="Rows affected">
            📊 {rowsAffected} rows
          </div>
        )}
        <div className="status-bar-item" title="Status">
          {statusMessage}
        </div>
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          style={{ marginLeft: '10px', padding: '2px 8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-color)' }}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
