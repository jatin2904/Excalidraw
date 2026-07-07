import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useBoardStore = create(subscribeWithSelector((set, get) => ({
  // Camera
  camera: { x: 0, y: 0, zoom: 1 },
  setCamera: (camera) => set({ camera }),

  // Board info
  boardName: 'Untitled Board',

  // Remote cursors
  remoteCursors: {},

  // Tool
  tool: 'selection',
  setTool: (tool) => set({ tool, selectedIds: [] }),

  // Elements
  elements: [],
  addElement: (element) =>
    set((state) => ({ elements: [...state.elements, element] })),
  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),
  updateElements: (updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        updates[el.id] ? { ...el, ...updates[el.id] } : el
      ),
    })),
  deleteElements: (ids) =>
    set((state) => ({
      elements: state.elements.filter((el) => !ids.includes(el.id)),
      selectedIds: [],
    })),
  setElements: (elements) => set({ elements }),

  // Selection
  selectedIds: [],
  setSelectedIds: (ids) => set({ selectedIds: ids }),

  // Duplicate selected elements
  duplicateElements: (ids) => {
    const state = get();
    const toDuplicate = state.elements.filter((el) => ids.includes(el.id));
    const offset = 20;
    const newElements = toDuplicate.map((el) => ({
      ...el,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      x: el.x + offset,
      y: el.y + offset,
    }));
    set({
      elements: [...state.elements, ...newElements],
      selectedIds: newElements.map((el) => el.id),
    });
  },

  // Style update for selected elements
  updateElementStyle: (ids, styleProps) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        ids.includes(el.id) ? { ...el, ...styleProps } : el
      ),
    })),

  // History
  history: [[]],
  historyIndex: 0,

  pushHistory: () => {
    const { elements, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(elements)));
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({
      elements: JSON.parse(JSON.stringify(history[newIndex])),
      historyIndex: newIndex,
      selectedIds: [],
    });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({
      elements: JSON.parse(JSON.stringify(history[newIndex])),
      historyIndex: newIndex,
      selectedIds: [],
    });
  },
})));

export default useBoardStore;
