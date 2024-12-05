/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import AsyncStorage from '@react-native-async-storage/async-storage'
import createMigrate from 'redux-persist/es/createMigrate'

import { migrations, LATEST_VERSION } from './migrations'
import systemReducer from './system'
import runtimeReducer from './runtime'
import uiReducer from './ui'
import settingsReducer from './settings'
import localReducer from './local'
import operationsReducer from './operations'
import qsosReducer from './qsos'
import stationReducer from './station'
import timeReducer from './time'
import { reducer as apiQRZReducer, middleware as apiQRZMiddleware } from './apis/apiQRZ'
import { reducer as apiHamQTHReducer, middleware as apiHamQTHMiddleware } from './apis/apiHamQTH'
import { reducer as apiPOTAReducer, middleware as apiPOTAMiddleware } from './apis/apiPOTA'
import { reducer as apiSOTAReducer, middleware as apiSOTAMiddleware } from './apis/apiSOTA'
import { reducer as apiGMAReducer, middleware as apiGMAMiddleware } from './apis/apiGMA'
import { reducer as apiWWBOTAReducer, middleware as apiWWBOTAMiddleware } from './apis/apiWWBOTA'
import dataFilesReducer from './dataFiles'

// Redux Toolkit uses Immer, which freezes state by default.
// This is great, except that our log processing needs to mutate state when merging QSOs,
// so for performance reasons, we disable freezing.
// See addQSOsFromFile.js for more details.
import { setAutoFreeze } from 'immer'
setAutoFreeze(false)

const rootReducer = combineReducers({
  settings: settingsReducer,
  local: localReducer,
  system: systemReducer,
  runtime: runtimeReducer,
  ui: uiReducer,
  operations: operationsReducer,
  qsos: qsosReducer,
  station: stationReducer,
  time: timeReducer,
  dataFiles: dataFilesReducer,
  apiQRZ: apiQRZReducer,
  apiHamQTH: apiHamQTHReducer,
  apiPOTA: apiPOTAReducer,
  apiSOTA: apiSOTAReducer,
  apiGMA: apiGMAReducer,
  apiWWBOTA: apiWWBOTAReducer
})

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  version: LATEST_VERSION,
  whitelist: ['settings', 'local', 'system', 'station'], // Don't include `qsos` nor `time`
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
    middlewares.push(apiHamQTHMiddleware)
    middlewares.push(apiPOTAMiddleware)
    middlewares.push(apiSOTAMiddleware)
    middlewares.push(apiGMAMiddleware)
    middlewares.push(apiWWBOTAMiddleware)

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
