import React, { useState, useEffect, useRef } from 'react';

interface FilterModalProps {
  show: boolean;
  folderName: string;
  databaseName: string;
  initialFilter: string;
  onApply: (filterText: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  show,
  folderName,
  databaseName,
  initialFilter,
  onApply,
  onClear,
  onClose,
}) => {
  const [filterText, setFilterText] = useState(initialFilter || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFilterText(initialFilter || '');
  }, [initialFilter, show]);

  useEffect(() => {
    if (show) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [show]);

  if (!show) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(filterText.trim());
  };

  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div
        className="modal-content scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', width: '90%' }}
      >
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>
            🔍 Filter {folderName} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({databaseName})</span>
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-disabled)',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '16px 0 8px 0' }}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>
              Filter Criteria (contains string):
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                ref={inputRef}
                type="text"
                className="form-input"
                placeholder="e.g. customer, dbo, sp_..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
              />
              {filterText && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setFilterText('')}
                  title="Clear input"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  ✕
                </button>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '4px' }}>
              Filters matching object names in real-time. Leave blank to show all objects.
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            {initialFilter && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onClear}
                style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--accent-danger)' }}
              >
                Clear Filter
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '6px 16px', fontSize: '12px' }}
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FilterModal;
