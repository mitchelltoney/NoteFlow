import { useState, useRef, useCallback, useLayoutEffect, KeyboardEvent } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DraggableAttributes,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { CSS } from '@dnd-kit/utilities';
import type { Block, BlockType } from '@noteflow/shared';
import { createBlock, updateBlock, deleteBlock, reorderBlocks } from '../api';
import { useMutation } from '@tanstack/react-query';

interface BlockEditorProps {
  pageId: string;
  blocks: Block[];
  onBlocksChange: () => void;
  onSaveStatus: (status: 'idle' | 'saving' | 'saved') => void;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: string; description: string }[] = [
  { type: 'paragraph', label: 'Text', icon: 'T', description: 'Plain text paragraph' },
  { type: 'heading1', label: 'Heading 1', icon: 'H1', description: 'Large heading' },
  { type: 'heading2', label: 'Heading 2', icon: 'H2', description: 'Medium heading' },
  { type: 'heading3', label: 'Heading 3', icon: 'H3', description: 'Small heading' },
  { type: 'bulleted_list', label: 'Bulleted List', icon: '•', description: 'Unordered list' },
  { type: 'numbered_list', label: 'Numbered List', icon: '1.', description: 'Ordered list' },
  { type: 'todo', label: 'To-do', icon: '☐', description: 'Checkbox item' },
  { type: 'toggle', label: 'Toggle', icon: '▶', description: 'Collapsible section' },
  { type: 'code', label: 'Code', icon: '<>', description: 'Code block with syntax' },
  { type: 'quote', label: 'Quote', icon: '"', description: 'Block quotation' },
  { type: 'divider', label: 'Divider', icon: '—', description: 'Horizontal rule' },
];

// ContentEditable wrapper that never lets React overwrite the DOM while the
// element is focused. On re-renders it only syncs content when the user is
// not actively typing, so the cursor position is never clobbered by a save.
function ContentEditable({
  value,
  className,
  placeholder,
  onInput,
  onKeyDown,
  setRef,
}: {
  value: string;
  className?: string;
  placeholder?: string;
  onInput: (e: React.FormEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  setRef?: (el: HTMLDivElement | null) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  // Tracks the last value the server gave us. We only write to the DOM when
  // this changes — NOT on every render — so blurring while the prop is stale
  // (content saves skip invalidation) never overwrites what the user typed.
  const lastServerValue = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (value !== lastServerValue.current) {
      lastServerValue.current = value;
      // Only update DOM if user isn't actively typing in this element.
      if (document.activeElement !== el) {
        el.textContent = value;
      }
    }
  });

  return (
    <div
      ref={(el) => {
        (elRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        setRef?.(el);
      }}
      contentEditable
      suppressContentEditableWarning
      onInput={onInput}
      onKeyDown={onKeyDown}
      data-placeholder={placeholder ?? "Type '/' for commands"}
      className={className}
    />
  );
}

export function BlockEditor({ pageId, blocks, onBlocksChange, onSaveStatus }: BlockEditorProps) {
  const [slashMenu, setSlashMenu] = useState<{ blockId: string; query: string; index: number } | null>(null);
  const [slashMenuSelected, setSlashMenuSelected] = useState(0);
  const [expandedToggles, setExpandedToggles] = useState<Set<string>>(new Set());
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Only top-level blocks (no parentBlockId) for main list
  const topBlocks = blocks.filter(b => !b.parentBlockId).sort((a, b) => a.position - b.position);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const createBlockMutation = useMutation({
    mutationFn: ({ position, type, parentBlockId }: { position: number; type?: BlockType; parentBlockId?: string | null }) =>
      createBlock(pageId, { type: type || 'paragraph', content: '', checked: false, position, parentBlockId: parentBlockId || null }),
    onSuccess: () => onBlocksChange(),
  });

  // Content saves: fire-and-forget, no query invalidation — the DOM is already
  // correct and re-rendering contentEditable elements resets the cursor.
  const saveContentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateBlock>[1] }) => updateBlock(id, data),
    onSuccess: () => {
      onSaveStatus('saved');
      setTimeout(() => onSaveStatus('idle'), 2000);
    },
  });

  // Structural saves (type change, checked, position, language): need re-render.
  const updateBlockMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateBlock>[1] }) => updateBlock(id, data),
    onSuccess: () => {
      onSaveStatus('saved');
      setTimeout(() => onSaveStatus('idle'), 2000);
      onBlocksChange();
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: deleteBlock,
    onSuccess: () => onBlocksChange(),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderBlocks,
    onSuccess: () => onBlocksChange(),
  });

  const debounceSave = useCallback((blockId: string, data: Parameters<typeof updateBlock>[1]) => {
    onSaveStatus('saving');
    const existing = saveTimers.current.get(blockId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      saveContentMutation.mutate({ id: blockId, data });
      saveTimers.current.delete(blockId);
    }, 400);
    saveTimers.current.set(blockId, timer);
  }, [saveContentMutation, onSaveStatus]);

  const focusBlock = useCallback((blockId: string) => {
    setTimeout(() => {
      const el = blockRefs.current.get(blockId);
      if (el) {
        el.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        if (el.childNodes.length > 0) {
          range.setStartAfter(el.lastChild!);
        } else {
          range.setStart(el, 0);
        }
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 30);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = topBlocks.findIndex(b => b.id === active.id);
    const newIndex = topBlocks.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(topBlocks, oldIndex, newIndex);
    await reorderMutation.mutateAsync(
      reordered.map((b, i) => ({ id: b.id, position: i }))
    );
  }, [topBlocks, reorderMutation]);

  const filteredSlashTypes = slashMenu
    ? BLOCK_TYPES.filter(t =>
        slashMenu.query === '' ||
        t.label.toLowerCase().includes(slashMenu.query.toLowerCase())
      )
    : [];

  return (
    <div className="relative">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={topBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {topBlocks.map((block, index) => (
            <SortableBlock
              key={block.id}
              block={block}
              index={index}
              topBlocks={topBlocks}
              allBlocks={blocks}
              pageId={pageId}
              blockRefs={blockRefs}
              expandedToggles={expandedToggles}
              setExpandedToggles={setExpandedToggles}
              slashMenu={slashMenu}
              setSlashMenu={setSlashMenu}
              slashMenuSelected={slashMenuSelected}
              setSlashMenuSelected={setSlashMenuSelected}
              filteredSlashTypes={filteredSlashTypes}
              debounceSave={debounceSave}
              createBlockMutation={createBlockMutation}
              updateBlockMutation={updateBlockMutation}
              deleteBlockMutation={deleteBlockMutation}
              focusBlock={focusBlock}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Slash command menu */}
      {slashMenu && filteredSlashTypes.length > 0 && (
        <SlashMenu
          types={filteredSlashTypes}
          selected={slashMenuSelected}
          onSelect={(type) => {
            const block = blocks.find(b => b.id === slashMenu.blockId);
            if (block) {
              updateBlockMutation.mutate({ id: block.id, data: { type, content: '' } });
              // Clear the slash from contenteditable
              const el = blockRefs.current.get(block.id);
              if (el) el.textContent = '';
            }
            setSlashMenu(null);
          }}
          blockId={slashMenu.blockId}
          blockRefs={blockRefs}
        />
      )}
    </div>
  );
}

// Slash menu popup
function SlashMenu({ types, selected, onSelect, blockId, blockRefs }: {
  types: typeof BLOCK_TYPES;
  selected: number;
  onSelect: (type: BlockType) => void;
  blockId: string;
  blockRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position based on the block element
  const el = blockRefs.current.get(blockId);
  if (el && position.top === 0) {
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    });
  }

  return (
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-64 max-h-72 overflow-y-auto"
    >
      <div className="p-1">
        {types.map((t, i) => (
          <button
            key={t.type}
            onClick={() => onSelect(t.type)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left ${
              i === selected
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
              {t.icon}
            </span>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.label}</div>
              <div className="text-xs text-gray-500">{t.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Individual sortable block wrapper
function SortableBlock(props: {
  block: Block;
  index: number;
  topBlocks: Block[];
  allBlocks: Block[];
  pageId: string;
  blockRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  expandedToggles: Set<string>;
  setExpandedToggles: (fn: (prev: Set<string>) => Set<string>) => void;
  slashMenu: { blockId: string; query: string; index: number } | null;
  setSlashMenu: (v: { blockId: string; query: string; index: number } | null) => void;
  slashMenuSelected: number;
  setSlashMenuSelected: (v: number) => void;
  filteredSlashTypes: typeof BLOCK_TYPES;
  debounceSave: (id: string, data: Parameters<typeof updateBlock>[1]) => void;
  createBlockMutation: ReturnType<typeof useMutation<Block, Error, { position: number; type?: BlockType; parentBlockId?: string | null }>>;
  updateBlockMutation: ReturnType<typeof useMutation<Block, Error, { id: string; data: Parameters<typeof updateBlock>[1] }>>;
  deleteBlockMutation: ReturnType<typeof useMutation<void, Error, string>>;
  focusBlock: (id: string) => void;
}) {
  const {
    block, index, topBlocks, allBlocks,
    blockRefs, expandedToggles, setExpandedToggles,
    slashMenu, setSlashMenu, slashMenuSelected, setSlashMenuSelected,
    filteredSlashTypes, debounceSave, createBlockMutation,
    updateBlockMutation, deleteBlockMutation, focusBlock
  } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const childBlocks = allBlocks.filter(b => b.parentBlockId === block.id).sort((a, b) => a.position - b.position);
  const isExpanded = expandedToggles.has(block.id);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    const el = e.target as HTMLElement;
    const content = el.textContent || '';

    // Slash menu navigation
    if (slashMenu?.blockId === block.id) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashMenuSelected(Math.min(slashMenuSelected + 1, filteredSlashTypes.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashMenuSelected(Math.max(slashMenuSelected - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = filteredSlashTypes[slashMenuSelected];
        if (chosen) {
          updateBlockMutation.mutate({ id: block.id, data: { type: chosen.type, content: '' } });
          el.textContent = '';
          setSlashMenu(null);
        }
        return;
      }
      if (e.key === 'Escape') {
        setSlashMenu(null);
        return;
      }
    }

    // Enter: create new block below
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newPosition = block.position + 1;
      // Shift later blocks
      topBlocks.slice(index + 1).forEach(b => {
        updateBlockMutation.mutate({ id: b.id, data: { position: b.position + 1 } });
      });
      createBlockMutation.mutate(
        { position: newPosition, type: 'paragraph', parentBlockId: null },
        {
          onSuccess: (newBlock) => {
            focusBlock(newBlock.id);
          }
        }
      );
      return;
    }

    // Backspace on empty block: delete and focus previous
    if (e.key === 'Backspace' && content === '') {
      e.preventDefault();
      if (index > 0) {
        const prevBlock = topBlocks[index - 1];
        focusBlock(prevBlock.id);
      }
      deleteBlockMutation.mutate(block.id);
      return;
    }

    // Cmd+Enter on todo: toggle checked
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && block.type === 'todo') {
      e.preventDefault();
      updateBlockMutation.mutate({ id: block.id, data: { checked: !block.checked } });
      return;
    }
  }, [slashMenu, block, index, topBlocks, slashMenuSelected, filteredSlashTypes, setSlashMenu, setSlashMenuSelected, updateBlockMutation, createBlockMutation, deleteBlockMutation, focusBlock]);

  const handleInput = useCallback((e: React.FormEvent<HTMLElement>) => {
    const content = (e.target as HTMLElement).textContent || '';

    // Detect slash command
    if (content === '/') {
      setSlashMenu({ blockId: block.id, query: '', index });
      setSlashMenuSelected(0);
    } else if (content.startsWith('/') && slashMenu?.blockId === block.id) {
      setSlashMenu({ blockId: block.id, query: content.slice(1), index });
      setSlashMenuSelected(0);
    } else if (slashMenu?.blockId === block.id) {
      setSlashMenu(null);
    }

    debounceSave(block.id, { content });
  }, [block.id, index, slashMenu, setSlashMenu, setSlashMenuSelected, debounceSave]);

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <BlockRenderer
        block={block}
        blockRefs={blockRefs}
        dragListeners={listeners}
        dragAttributes={attributes}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onToggle={() => setExpandedToggles(prev => {
          const next = new Set(prev);
          if (next.has(block.id)) next.delete(block.id);
          else next.add(block.id);
          return next;
        })}
        isExpanded={isExpanded}
        onCheckedChange={(checked) => updateBlockMutation.mutate({ id: block.id, data: { checked } })}
        onAddBelow={() => {
          const newPosition = block.position + 1;
          topBlocks.slice(index + 1).forEach(b => {
            updateBlockMutation.mutate({ id: b.id, data: { position: b.position + 1 } });
          });
          createBlockMutation.mutate(
            { position: newPosition, type: 'paragraph', parentBlockId: null },
            { onSuccess: (nb) => focusBlock(nb.id) }
          );
        }}
        onLanguageChange={(lang) => updateBlockMutation.mutate({ id: block.id, data: { language: lang } })}
      />

      {/* Nested toggle children */}
      {block.type === 'toggle' && isExpanded && childBlocks.length > 0 && (
        <div className="ml-6 border-l-2 border-gray-100 dark:border-gray-700 pl-4">
          {childBlocks.map(child => (
            <NestedBlock
              key={child.id}
              block={child}
              blockRefs={blockRefs}
              debounceSave={debounceSave}
              updateBlockMutation={updateBlockMutation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NestedBlock({ block, blockRefs, debounceSave, updateBlockMutation }: {
  block: Block;
  blockRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  debounceSave: (id: string, data: Parameters<typeof updateBlock>[1]) => void;
  updateBlockMutation: ReturnType<typeof useMutation<Block, Error, { id: string; data: Parameters<typeof updateBlock>[1] }>>;
}) {
  return (
    <div className="group relative">
      <BlockRenderer
        block={block}
        blockRefs={blockRefs}
        onKeyDown={() => {}}
        onInput={(e) => debounceSave(block.id, { content: (e.target as HTMLElement).textContent || '' })}
        onToggle={() => {}}
        isExpanded={false}
        onCheckedChange={(checked) => updateBlockMutation.mutate({ id: block.id, data: { checked } })}
        onAddBelow={() => {}}
        onLanguageChange={(lang) => updateBlockMutation.mutate({ id: block.id, data: { language: lang } })}
      />
    </div>
  );
}

function BlockRenderer({
  block,
  blockRefs,
  dragListeners,
  dragAttributes,
  onKeyDown,
  onInput,
  onToggle,
  isExpanded,
  onCheckedChange,
  onAddBelow,
  onLanguageChange,
}: {
  block: Block;
  blockRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: DraggableAttributes;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  onInput: (e: React.FormEvent<HTMLElement>) => void;
  onToggle: () => void;
  isExpanded: boolean;
  onCheckedChange: (checked: boolean) => void;
  onAddBelow: () => void;
  onLanguageChange: (lang: string) => void;
}) {
  const setRef = (el: HTMLDivElement | null) => {
    if (el) blockRefs.current.set(block.id, el);
    else blockRefs.current.delete(block.id);
  };

  const sharedEditableProps = {
    value: block.content,
    onInput,
    onKeyDown: onKeyDown as (e: React.KeyboardEvent<HTMLDivElement>) => void,
    setRef,
  };

  if (block.type === 'divider') {
    return (
      <div className="py-2 group flex items-center gap-2">
        {dragListeners && (
          <DragHandle listeners={dragListeners} attributes={dragAttributes} />
        )}
        <hr className="flex-1 border-gray-200 dark:border-gray-700" />
      </div>
    );
  }

  if (block.type === 'todo') {
    return (
      <div className="flex items-start gap-2 py-0.5 group">
        {dragListeners && <DragHandle listeners={dragListeners} attributes={dragAttributes} />}
        <AddBlockButton onAdd={onAddBelow} />
        <input
          type="checkbox"
          checked={block.checked}
          onChange={e => onCheckedChange(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0"
        />
        <ContentEditable
          {...sharedEditableProps}
          className={`flex-1 text-base focus:outline-none min-h-[1.5rem] ${block.checked ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
        />
      </div>
    );
  }

  if (block.type === 'toggle') {
    return (
      <div className="py-0.5">
        <div className="flex items-start gap-2 group">
          {dragListeners && <DragHandle listeners={dragListeners} attributes={dragAttributes} />}
          <AddBlockButton onAdd={onAddBelow} />
          <button
            onClick={onToggle}
            className={`mt-1 text-gray-400 hover:text-gray-600 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 2l6 4-6 4V2z" />
            </svg>
          </button>
          <ContentEditable
            {...sharedEditableProps}
            className="flex-1 text-base font-medium text-gray-900 dark:text-gray-100 focus:outline-none min-h-[1.5rem]"
          />
        </div>
      </div>
    );
  }

  if (block.type === 'code') {
    return (
      <div className="my-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <select
            value={block.language || 'plaintext'}
            onChange={e => onLanguageChange(e.target.value)}
            className="text-xs text-gray-500 bg-transparent border-none outline-none cursor-pointer"
          >
            {['plaintext', 'javascript', 'typescript', 'python', 'html', 'css', 'json', 'bash', 'sql', 'rust', 'go'].map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          {dragListeners && <DragHandle listeners={dragListeners} attributes={dragAttributes} />}
        </div>
        <ContentEditable
          {...sharedEditableProps}
          className="font-mono text-sm p-4 bg-gray-900 dark:bg-gray-950 text-gray-100 focus:outline-none whitespace-pre overflow-x-auto min-h-[3rem]"
        />
      </div>
    );
  }

  const blockClass: Record<string, string> = {
    paragraph: 'text-base text-gray-900 dark:text-gray-100',
    heading1: 'text-3xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-1',
    heading2: 'text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-5 mb-1',
    heading3: 'text-xl font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-1',
    bulleted_list: 'text-base text-gray-900 dark:text-gray-100',
    numbered_list: 'text-base text-gray-900 dark:text-gray-100',
    quote: 'text-base text-gray-600 dark:text-gray-400 italic border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1',
  };

  return (
    <div className={`flex items-start gap-2 py-0.5 group ${block.type.startsWith('heading') ? 'mt-2' : ''}`}>
      {dragListeners && <DragHandle listeners={dragListeners} attributes={dragAttributes} />}
      {!block.type.startsWith('heading') && <AddBlockButton onAdd={onAddBelow} />}
      {block.type === 'bulleted_list' && (
        <span className="mt-1 text-gray-400 flex-shrink-0 select-none">•</span>
      )}
      {block.type === 'numbered_list' && (
        <span className="mt-0.5 text-sm text-gray-400 flex-shrink-0 select-none min-w-[1.5rem]">1.</span>
      )}
      <ContentEditable
        {...sharedEditableProps}
        className={`flex-1 focus:outline-none min-h-[1.5rem] ${blockClass[block.type] || 'text-base text-gray-900 dark:text-gray-100'}`}
      />
    </div>
  );
}

function DragHandle({ listeners, attributes }: { listeners?: SyntheticListenerMap; attributes?: DraggableAttributes }) {
  return (
    <button
      {...listeners}
      {...attributes}
      className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0 mt-1 touch-none"
      title="Drag to reorder"
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="4" cy="4" r="1.5" />
        <circle cx="8" cy="4" r="1.5" />
        <circle cx="4" cy="8" r="1.5" />
        <circle cx="8" cy="8" r="1.5" />
        <circle cx="4" cy="12" r="1.5" />
        <circle cx="8" cy="12" r="1.5" />
      </svg>
    </button>
  );
}

function AddBlockButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center"
      title="Add block below"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M6 2v8M2 6h8" />
      </svg>
    </button>
  );
}
