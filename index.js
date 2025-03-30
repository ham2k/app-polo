/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native'
import App from './src/App'
import { name as appName } from './app.json'

LogBox.ignoreLogs([/Open debugger to view warnings/])

AppRegistry.registerComponent(appName, () => App)
