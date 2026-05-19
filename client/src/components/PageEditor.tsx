import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useCallback, useLayoutEffect } from 'react';
import { fetchPage, updatePage, createBlock } from '../api';
import { BlockEditor } from './BlockEditor';
import { useState } from 'react';

export function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const titleRef = useRef<HTMLDivElement>(null);
  const lastServerTitle = useRef<string | undefined>(undefined);

  const { data: page, isLoading } = useQuery({
    queryKey: ['page', id],
    queryFn: () => fetchPage(id!),
    enabled: !!id,
  });

  // Reset the server-value tracker whenever we navigate to a different page
  // so the new page's title is always written on first render.
  useLayoutEffect(() => {
    lastServerTitle.current = undefined;
  }, [id]);

  const updatePageMutation = useMutation({
    mutationFn: ({ field, value, structural }: { field: string; value: string | null; structural?: boolean }) =>
      updatePage(id!, { [field]: value }),
    onSuccess: (_, vars) => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      // Always refresh the sidebar (title/icon shown there).
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      // Only re-fetch page data for non-title changes (icon, parentId) that
      // don't involve a contentEditable — re-rendering the title div resets
      // the cursor, so we skip the invalidation when the user is typing.
      if (vars.structural) queryClient.invalidateQueries({ queryKey: ['page', id] });
    },
  });

  const createBlockMutation = useMutation({
    mutationFn: (data: Parameters<typeof createBlock>[1]) => createBlock(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page', id] });
    },
  });

  const debouncedSave = useCallback((field: string, value: string | null) => {
    setSaveStatus('saving');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updatePageMutation.mutate({ field, value });
    }, 400);
  }, [updatePageMutation]);

  const handleAddFirstBlock = useCallback(() => {
    if (page && (!page.blocks || page.blocks.length === 0)) {
      createBlockMutation.mutate({
        type: 'paragraph',
        content: '',
        checked: false,
        position: 0,
        parentBlockId: null,
      });
    }
  }, [page, createBlockMutation]);

  // Only write to the title DOM when the server sends a new value.
  // title saves skip invalidation, so page.title stays stale while typing —
  // checking focus alone is not enough and would wipe content on blur.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el || !page) return;
    if (page.title !== lastServerTitle.current) {
      lastServerTitle.current = page.title;
      if (document.activeElement !== el) {
        el.textContent = page.title;
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading...
      </div>
    );
  }

  if (!page) return null;

  const blocks = (page.blocks || []).sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-3xl mx-auto px-16 py-12 relative">
      {/* Save status */}
      {saveStatus !== 'idle' && (
        <div className="fixed top-4 right-4 text-xs text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow border border-gray-200 dark:border-gray-700">
          {saveStatus === 'saving' ? 'Saving...' : '✓ Saved'}
        </div>
      )}

      {/* Title */}
      <div
        ref={titleRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => debouncedSave('title', (e.target as HTMLDivElement).textContent || '')}
        data-placeholder="Untitled"
        className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
      />

      {/* Blocks */}
      {blocks.length === 0 ? (
        <div
          onClick={handleAddFirstBlock}
          className="text-gray-400 cursor-text text-base"
        >
          Type &apos;/&apos; for commands
        </div>
      ) : (
        <BlockEditor
          pageId={id!}
          blocks={blocks}
          onBlocksChange={() => queryClient.invalidateQueries({ queryKey: ['page', id] })}
          onSaveStatus={(status) => setSaveStatus(status)}
        />
      )}
    </div>
  );
}
