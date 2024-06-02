import { createSlice } from '@reduxjs/toolkit'
import { globalStates } from './states/globalStates'
import { globalActions } from './actions/globalActions'

export const globalSlice = createSlice({
  name: 'global',
  initialState: globalStates,
  reducers: globalActions,
})

export default globalSlice.reducer
export const { setEvent, setTicketModal, setTickets } = globalSlice.actions
