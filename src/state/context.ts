import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { AppState } from '../data/types'
import type { AppAction } from './reducer'
import type { StorageStatus } from './persistence'

export type AppStore = {
  state: AppState
  dispatch: Dispatch<AppAction>
  storage: StorageStatus
}

export const StoreContext = createContext<AppStore | null>(null)

export function useApp(): AppStore {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error('useApp must be used inside AppProvider')
  }
  return store
}
