import { create } from 'zustand'

let toastId = 0

const useUIStore = create((set, get) => ({
  sidebarCollapsed: false,
  toasts: [],
  activeModal: null,
  modalProps: {},

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),

  addToast: ({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, type, title, message, duration }] }))
    setTimeout(() => get().removeToast(id), duration)
    return id
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  toast: {
    success: (title, message) =>
      useUIStore.getState().addToast({ type: 'success', title, message }),
    error: (title, message) =>
      useUIStore.getState().addToast({ type: 'error', title, message }),
    warning: (title, message) =>
      useUIStore.getState().addToast({ type: 'warning', title, message }),
    info: (title, message) =>
      useUIStore.getState().addToast({ type: 'info', title, message }),
  },

  openModal: (name, props = {}) => set({ activeModal: name, modalProps: props }),
  closeModal: () => set({ activeModal: null, modalProps: {} }),
}))

export default useUIStore

export const toast = {
  success: (title, message) => useUIStore.getState().addToast({ type: 'success', title, message }),
  error: (title, message) => useUIStore.getState().addToast({ type: 'error', title, message }),
  warning: (title, message) => useUIStore.getState().addToast({ type: 'warning', title, message }),
  info: (title, message) => useUIStore.getState().addToast({ type: 'info', title, message }),
}
