import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api/index.js'

// Public store data loaded once per visit: settings, catalogue, categories.
const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState({ settings: null, products: [], categories: [], loading: true, error: null })

  const reload = useCallback(async () => {
    try {
      const [settings, products, categories] = await Promise.all([api.getSettings(), api.listProducts(), api.listCategories()])
      if (!settings) throw new Error('The shop is not set up yet — run the migrations and seed (see README).')
      setState({ settings, products, categories, loading: false, error: null })
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }))
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const featured = state.products.find((p) => p.is_featured) || state.products[0] || null

  return (
    <StoreContext.Provider value={{ ...state, featured, reload, setSettings: (settings) => setState((s) => ({ ...s, settings })) }}>
      {children}
    </StoreContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
