import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Page } from '@noteflow/shared';
import { createPage, deletePage } from '../api';
import { useAppStore, useSidebarOpen } from '../store';

interface SidebarProps {
  pages: Page[];
}

export function Sidebar({ pages }: SidebarProps) {
  const sidebarOpen = useSidebarOpen();
  const { toggleSidebar, toggleDarkMode, darkMode } = useAppStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createPageMutation = useMutation({
    mutationFn: createPage,
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      navigate(`/page/${page.id}`);
    },
  });

  const topLevelPages = pages.filter(p => !p.parentId).sort((a, b) => a.position - b.position);

  return (
    <>
      {/* Toggle button when sidebar closed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-3 left-3 z-50 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          title="Open sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 4h12v1.5H2zm0 5h12v1.5H2zm0 5h12v1.5H2z" />
          </svg>
        </button>
      )}

      <aside
        className={`${sidebarOpen ? 'w-60' : 'w-0'} transition-all duration-200 overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col`}
      >
        <div className="flex flex-col h-full w-60">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">NoteFlow</span>
            <button
              onClick={toggleSidebar}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
              title="Close sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* New Page button */}
          <div className="px-2 py-2">
            <button
              onClick={() => createPageMutation.mutate({ title: 'Untitled', parentId: null })}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <span className="text-base">+</span>
              <span>New Page</span>
            </button>
          </div>

          {/* Page tree */}
          <div className="flex-1 overflow-y-auto px-1">
            {topLevelPages.map(page => (
              <PageTreeItem
                key={page.id}
                page={page}
                allPages={pages}
                depth={0}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                {darkMode
                  ? <><circle cx="7" cy="7" r="3" /><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M3.05 3.05l1.06 1.06M9.9 9.9l1.05 1.05M10.95 3.05L9.9 4.1M4.1 9.9l-1.05 1.05" /></>
                  : <path d="M11 7.5A4.5 4.5 0 016.5 3a4.5 4.5 0 100 9A4.5 4.5 0 0011 7.5z" />
                }
              </svg>
              <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

interface PageTreeItemProps {
  page: Page;
  allPages: Page[];
  depth: number;
}

function PageTreeItem({ page, allPages, depth }: PageTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const children = allPages.filter(p => p.parentId === page.id).sort((a, b) => a.position - b.position);
  const hasChildren = children.length > 0;
  const isActive = id === page.id;

  const createChildMutation = useMutation({
    mutationFn: createPage,
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      setExpanded(true);
      navigate(`/page/${newPage.id}`);
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      if (isActive) navigate('/');
    },
  });

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer ${
          isActive
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => navigate(`/page/${page.id}`)}
      >
        {/* Chevron */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={`w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-transform ${expanded ? 'rotate-90' : ''} ${hasChildren ? 'visible' : 'invisible'}`}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <path d="M2 1l4 3-4 3V1z" />
          </svg>
        </button>

        {/* Icon */}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-gray-400">
            <path d="M2 1.5h6l3 3v7a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5v-10A.5.5 0 012 1.5z" />
            <path d="M8 1.5v3h3" />
          </svg>

        {/* Title */}
        <span className="flex-1 truncate">{page.title || 'Untitled'}</span>

        {/* Hover actions */}
        {hovered && (
          <div className="flex items-center gap-0.5 ml-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => createChildMutation.mutate({ title: 'Untitled', parentId: page.id })}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"
              title="Add child page"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={() => { if (confirm('Delete this page?')) deletePageMutation.mutate(page.id); }}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"
              title="Delete page"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && children.map(child => (
        <PageTreeItem key={child.id} page={child} allPages={allPages} depth={depth + 1} />
      ))}
    </div>
  );
}
