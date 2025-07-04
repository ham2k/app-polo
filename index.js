/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native'
import App from './src/App'
import { name as appName } from './app.json'

LogBox.ignoreLogs([/Open debugger to view warnings/])

/* Uncomment these lines to enable development mode mocking of third-party APIs */
/*   see src/mocks/handlers.js for list of mocked servers                       */

// const enableMocking = () => {
//   if (!__DEV__) return

//   const polyfillContext = require.context('./', false, /msw\.polyfills\.js/)
//   polyfillContext('./msw.polyfills.js')

//   const serverContext = require.context('./src/mocks', false, /server\.js/)
//   const { server } = serverContext('./server.js')
//   server.listen()
// }
// enableMocking()

/* End of uncommenting */

AppRegistry.registerComponent(appName, () => App)
