import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  settings: {
    getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
    setApiKey: (key: string) => ipcRenderer.invoke('settings:setApiKey', key),
    isOnboarded: () => ipcRenderer.invoke('settings:isOnboarded'),
    setOnboarded: () => ipcRenderer.invoke('settings:setOnboarded'),
    clearApiKey: () => ipcRenderer.invoke('settings:clearApiKey'),
    getZoom: () => ipcRenderer.invoke('settings:getZoom'),
    setZoom: (zoom: number) => ipcRenderer.invoke('settings:setZoom', zoom),
  },
  skills: {
    load: () => ipcRenderer.invoke('skills:load'),
    save: (data: unknown) => ipcRenderer.invoke('skills:save', data),
    getPath: () => ipcRenderer.invoke('skills:getPath'),
  },
  user: {
    list: () => ipcRenderer.invoke('user:list'),
    getActive: () => ipcRenderer.invoke('user:getActive'),
    setActive: (username: string) => ipcRenderer.invoke('user:setActive', username),
    create: (username: string, apiKey: string) => ipcRenderer.invoke('user:create', username, apiKey),
    delete: (username: string) => ipcRenderer.invoke('user:delete', username),
  },
  claude: {
    testKey: (key: string) => ipcRenderer.invoke('claude:testKey', key),
    generateSkill: (payload: unknown) => ipcRenderer.invoke('claude:generateSkill', payload),
    generateTest: (payload: unknown) => ipcRenderer.invoke('claude:generateTest', payload),
    generateRubric: (payload: unknown) => ipcRenderer.invoke('claude:generateRubric', payload),
    detectAssessmentType: (payload: unknown) => ipcRenderer.invoke('claude:detectAssessmentType', payload),
    analyzeProgress: (payload: unknown) => ipcRenderer.invoke('claude:analyzeProgress', payload),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onBoundsChange: (cb: (bounds: { width: number; height: number }) => void) => {
      ipcRenderer.on('window-bounds', (_e, bounds) => cb(bounds))
    },
  },
})
