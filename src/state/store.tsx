import { useEffect, useReducer, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { AppState } from '../data/types'
import { createInitialState } from '../data/demoFixtures'
import { appReducer } from './reducer'
import { StoreContext } from './context'
import {
  getStorageStatus,
  loadState,
  saveState,
  subscribeStorageStatus,
} from './persistence'

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState<AppState>(
    () => loadState() ?? createInitialState(),
  )
  const [state, dispatch] = useReducer(appReducer, initialState)
  const storage = useSyncExternalStore(
    subscribeStorageStatus,
    getStorageStatus,
    getStorageStatus,
  )

  useEffect(() => {
    saveState(state)
  }, [state])

  return (
    <StoreContext.Provider value={{ state, dispatch, storage }}>
      {children}
    </StoreContext.Provider>
  )
}
