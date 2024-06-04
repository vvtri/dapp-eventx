import { configureStore } from '@reduxjs/toolkit'
import globalReducer from './global.slice'

export const store = configureStore({
  reducer: {
    globalStates: globalReducer,
  },
})
