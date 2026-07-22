import React from 'react';
import type { ConnectionProfile } from '../types';

interface ConnectionModalProps {
  show: boolean;
  profiles?: ConnectionProfile[];
  onSelectProfile?: (profile: ConnectionProfile) => void;
  onDeleteProfile?: (id: string, e: React.MouseEvent) => void;
  connectServer: string;
  setConnectServer: (val: string) => void;
  connectAuthType: string;
  setConnectAuthType: (val: string) => void;
  connectUsername: string;
  setConnectUsername: (val: string) => void;
  connectPassword: string;
  setConnectPassword: (val: string) => void;
  connectDatabase: string;
  setConnectDatabase: (val: string) => void;
  loading: boolean;
  onConnect: () => void;
  onCancel: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  show,
  profiles = [],
  onSelectProfile,
  onDeleteProfile,
  connectServer,
  setConnectServer,
  connectAuthType,
  setConnectAuthType,
  connectUsername,
  setConnectUsername,
  connectPassword,
  setConnectPassword,
  connectDatabase,
  setConnectDatabase,
  loading,
  onConnect,
  onCancel,
}) => {
  if (!show) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog fade-in" style={{ width: '460px', maxWidth: '90vw' }}>
        <h2>Connect to Server</h2>

        {profiles.length > 0 && (
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Recent Connections:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
              {profiles.map(p => (
                <div
                  key={p.id}
                  onClick={() => onSelectProfile && onSelectProfile(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: p.server === connectServer && (p.username || '') === connectUsername ? 'var(--accent-glowing)' : 'var(--bg-input)',
                    border: `1px solid ${p.server === connectServer ? 'var(--accent)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🖥️ {p.server} {p.defaultDatabase ? `[${p.defaultDatabase}]` : ''}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {p.authType === 'windows' ? 'Windows Auth' : `SQL Auth: ${p.username}`}
                    </span>
                  </div>

                  {onDeleteProfile && (
                    <button
                      onClick={(e) => onDeleteProfile(p.id, e)}
                      title="Delete profile"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-disabled)', cursor: 'pointer', padding: '4px', fontSize: '13px' }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Server name:</label>
          <input
            value={connectServer}
            onChange={e => setConnectServer(e.target.value)}
            placeholder="MSI\SQLEXPRESS01"
          />
        </div>

        <div className="form-group">
          <label>Authentication:</label>
          <select value={connectAuthType} onChange={e => setConnectAuthType(e.target.value)}>
            <option value="windows">Windows Authentication</option>
            <option value="sql">SQL Server Authentication</option>
          </select>
        </div>

        {connectAuthType === 'sql' && (
          <>
            <div className="form-group">
              <label>User name:</label>
              <input
                value={connectUsername}
                onChange={e => setConnectUsername(e.target.value)}
                placeholder="sa"
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={connectPassword}
                onChange={e => setConnectPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label>Database (optional):</label>
          <input
            value={connectDatabase}
            onChange={e => setConnectDatabase(e.target.value)}
            placeholder="master"
          />
          <span className="input-hint">Leave empty to use default</span>
        </div>

        <div className="dialog-actions">
          <button className="btn-primary" onClick={onConnect} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect'}
          </button>
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal;
