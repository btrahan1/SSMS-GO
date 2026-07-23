import React from 'react';
import type { ContextMenuState } from '../types';

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  onSelectTop100: () => void;
  onEditTop100: () => void;
  onCopyTableName: () => void;
  onScriptAsCreate?: () => void;
  onExecTemplate?: () => void;
  onOpenFilterModal?: () => void;
  onClearFilter?: () => void;
  hasActiveFilter?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  contextMenuRef,
  onSelectTop100,
  onEditTop100,
  onCopyTableName,
  onScriptAsCreate,
  onExecTemplate,
  onOpenFilterModal,
  onClearFilter,
  hasActiveFilter,
}) => {
  const isFolder = contextMenu.objectType === 'folder';
  const isRoutine = contextMenu.objectType === 'procedure' || contextMenu.objectType === 'function';
  const labelPrefix = contextMenu.objectType === 'procedure' ? 'Procedure' : contextMenu.objectType === 'function' ? 'Function' : 'Table';

  return (
    <div
      ref={contextMenuRef}
      className="context-menu fade-in"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {isFolder ? (
        <>
          {onOpenFilterModal && (
            <div className="context-menu-item" onClick={onOpenFilterModal}>
              🔍 Filter Settings...
            </div>
          )}
          {hasActiveFilter && onClearFilter && (
            <div className="context-menu-item" onClick={onClearFilter} style={{ color: 'var(--accent-danger)' }}>
              ❌ Clear Filter
            </div>
          )}
        </>
      ) : isRoutine ? (
        <>
          {onScriptAsCreate && (
            <div className="context-menu-item" onClick={onScriptAsCreate}>
              📜 Script {labelPrefix} as CREATE
            </div>
          )}
          {onExecTemplate && (
            <div className="context-menu-item" onClick={onExecTemplate}>
              ⚡ {contextMenu.objectType === 'procedure' ? 'EXEC Template' : 'Execute / Call Template'}
            </div>
          )}
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={onCopyTableName}>
            📝 Copy {labelPrefix} Name
          </div>
        </>
      ) : (
        <>
          <div className="context-menu-item" onClick={onSelectTop100}>
            📋 Select Top 100 Rows
            <span className="shortcut">Ctrl+Shift+T</span>
          </div>
          <div className="context-menu-item" onClick={onEditTop100}>
            ✏️ Edit Top 100 Rows
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={onCopyTableName}>
            📝 Copy Table Name
          </div>
        </>
      )}
    </div>
  );
};

export default ContextMenu;
