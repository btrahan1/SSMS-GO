import React from 'react';
import CodeMirror, { keymap } from '@uiw/react-codemirror';
import { sql, MSSQL } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import type { QueryTab } from '../types';

interface QueryEditorProps {
  tabs: QueryTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddTab: () => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  query: string;
  setQuery: (val: string) => void;
  handleExecuteQuery: () => void;
  theme?: string;
}

export const QueryEditor: React.FC<QueryEditorProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onCloseTab,
  query,
  setQuery,
  handleExecuteQuery,
  theme = 'light',
}) => {
  return (
    <div className="query-area">
      <div className="query-tabs" style={{ display: 'flex', alignItems: 'center' }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`query-tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <span>{tab.title}</span>
            {tabs.length > 1 && (
              <span
                className="close-tab-btn"
                onClick={(e) => onCloseTab(tab.id, e)}
                style={{ fontSize: '11px', opacity: 0.6, cursor: 'pointer', padding: '0 2px' }}
                title="Close tab"
              >
                ✕
              </span>
            )}
          </div>
        ))}
        <button
          onClick={onAddTab}
          title="New Query Tab"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '14px',
            lineHeight: 1,
          }}
        >
          ➕
        </button>
      </div>

      <div style={{ flex: 1, minHeight: '160px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <CodeMirror
          value={query}
          height="100%"
          minHeight="160px"
          extensions={[
            sql({ dialect: MSSQL }),
            keymap.of([
              {
                key: 'Mod-Enter',
                run: () => {
                  handleExecuteQuery();
                  return true;
                },
              },
            ]),
          ]}
          theme={theme === 'dark' ? oneDark : 'light'}
          onChange={(val) => setQuery(val)}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
          style={{ flex: 1, fontSize: '13px', fontFamily: 'Consolas, Monaco, monospace' }}
        />
      </div>
    </div>
  );
};

export default QueryEditor;
