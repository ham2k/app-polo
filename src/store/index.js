import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import AsyncStorage from '@react-native-async-storage/async-storage'
import createMigrate from 'redux-persist/es/createMigrate'

import { migrations, LATEST_VERSION } from './migrations'
import settingsReducer from './settings'
import operationsReducer from './operations'
import qsosReducer from './qsos'
import timeReducer from './time'
import { reducer as apiQRZReducer, middleware as apiQRZMiddleware } from './apiQRZ'
import { reducer as apiPOTAReducer, middleware as apiPOTAMiddleware } from './apiPOTA'
import dataFilesReducer from './dataFiles'

// Redux Toolkit uses Immer, which freezes state by default.
// This is great, except that our log processing needs to mutate state when merging QSOs,
// so for performance reasons, we disable freezing.
// See addQSOsFromFile.js for more details.
import { setAutoFreeze } from 'immer'
setAutoFreeze(false)

const rootReducer = combineReducers({
  settings: settingsReducer,
  operations: operationsReducer,
  qsos: qsosReducer,
  time: timeReducer,
  dataFiles: dataFilesReducer,
  apiQRZ: apiQRZReducer,
  apiPOTA: apiPOTAReducer
})

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  version: LATEST_VERSION,
  whitelist: ['settings', 'operations'], // Don't include `qsos` nor `time`
  migrate: createMigrate(migrations, { debug: true })
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

const reduxDevtoolsActionSanitizer = (action) => {
  if (action.type === 'log/setCurrentLogInfo' && action?.payload?.yearQSOs) {
    return {
      ...action,
      payload: {
        ...action.payload,
        yearQSOs: `<<${action.payload.yearQSOs?.length || 'no'} qsos>>`,
        filteredQSOs: `<<${action.payload.filteredQSOs?.length || 'no'} qsos>>`
      }
    }
  } else {
    return action
  }
}

const reduxDevtoolsStateSanitizer = (state) => {
  return {
    ...state,
    log: {
      ...state.log,
      yearQSOs: `<<${state?.log?.yearQSOs?.length || 'no'} qsos>>`,
      filteredQSOs: `<<${state?.log?.filteredQSOs?.length || 'no'} qsos>>`
    }
  }
}

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => {
    const middlewares = getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false // https://github.com/reduxjs/redux-toolkit/issues/415
    })

    middlewares.push(apiQRZMiddleware)
    middlewares.push(apiPOTAMiddleware)

    if (__DEV__) {
      const createDebugger = require('redux-flipper').default
      middlewares.push(createDebugger())
    }
    return middlewares
  },
  devTools: {
    actionSanitizer: reduxDevtoolsActionSanitizer,
    stateSanitizer: reduxDevtoolsStateSanitizer
  }
})

export const testStore = configureStore({
  reducer: rootReducer
})

export const persistor = persistStore(store)
