import React, { useState } from 'react';
import type { ConnectionProfile } from '../types';
import { generateId } from '../types';

interface ProfileModalProps {
  profiles: ConnectionProfile[];
  editingProfile: ConnectionProfile | null;
  onConnectProfile: (profile: ConnectionProfile) => void;
  onSaveProfile: (profile: ConnectionProfile) => void;
  onDeleteProfile: (id: string, e: React.MouseEvent) => void;
  onSetEditingProfile: (profile: ConnectionProfile | null) => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profiles,
  editingProfile,
  onConnectProfile,
  onSaveProfile,
  onDeleteProfile,
  onSetEditingProfile,
  onClose,
}) => {
  const [name, setName] = useState(editingProfile?.name || '');
  const [server, setServer] = useState(editingProfile?.server || '');
  const [authType, setAuthType] = useState(editingProfile?.authType || 'windows');
  const [username, setUsername] = useState(editingProfile?.username || '');
  const [password, setPassword] = useState(editingProfile?.password || '');
  const [defaultDb, setDefaultDb] = useState(editingProfile?.defaultDatabase || '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !server.trim()) {
      setError('Name and Server are required');
      return;
    }
    onSaveProfile({
      id: editingProfile?.id || generateId(),
      name: name.trim(),
      server: server.trim(),
      authType,
      username: authType === 'sql' ? username.trim() : '',
      password: authType === 'sql' ? password : '',
      defaultDatabase: defaultDb.trim(),
      connectionString: '',
    });
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog fade-in">
        <h2>Connection Profiles</h2>

        {profiles.length > 0 && (
          <>
            <h3>Saved Profiles</h3>
            <div className="profile-list">
              {profiles.map(p => (
                <div key={p.id} className="profile-item">
                  <div className="profile-item-info">
                    <span className="profile-item-name">{p.name}</span>
                    <span className="profile-item-detail">
                      {p.server} · {p.authType === 'windows' ? 'Windows Auth' : 'SQL Auth'}
                      {p.defaultDatabase ? ` · ${p.defaultDatabase}` : ''}
                    </span>
                  </div>
                  <div className="profile-item-actions">
                    <button onClick={() => onConnectProfile(p)} title="Connect">🔗</button>
                    <button onClick={() => onSetEditingProfile(p)} title="Edit">✏️</button>
                    <button onClick={(e) => onDeleteProfile(p.id, e)} title="Delete">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="profile-form">
          <h3>{editingProfile ? 'Edit Profile' : 'New Profile'}</h3>
          {error && <div style={{ color: 'var(--accent-danger)', fontSize: '12px', marginBottom: '8px' }}>{error}</div>}
          <div className="form-row">
            <label>Profile Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="My Server" />
          </div>
          <div className="form-row">
            <label>Server *</label>
            <input value={server} onChange={e => setServer(e.target.value)} placeholder="MSI\SQLEXPRESS01" />
          </div>
          <div className="form-row">
            <label>Authentication</label>
            <select value={authType} onChange={e => setAuthType(e.target.value)}>
              <option value="windows">Windows Authentication</option>
              <option value="sql">SQL Server Authentication</option>
            </select>
          </div>
          {authType === 'sql' && (
            <>
              <div className="form-row">
                <label>User name</label>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="sa" />
              </div>
              <div className="form-row">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
              </div>
            </>
          )}
          <div className="form-row">
            <label>Default Database</label>
            <input value={defaultDb} onChange={e => setDefaultDb(e.target.value)} placeholder="master" />
          </div>
          <div className="profile-form-actions">
            <button className="btn-primary" onClick={handleSubmit}>
              {editingProfile ? 'Update' : 'Save'} Profile
            </button>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
