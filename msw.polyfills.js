import { Event, EventTarget } from 'event-target-shim'
import 'web-streams-polyfill/polyfill'
import 'fast-text-encoding'
import 'react-native-url-polyfill/auto'

global.Event = Event
global.EventTarget = EventTarget

if (typeof MessageEvent === 'undefined') {
  global.MessageEvent = class MessageEvent extends Event {
    constructor (type, options = {}) {
      super(type, options)
      this.data = options.data || null
      this.origin = options.origin || ''
      this.lastEventId = options.lastEventId || ''
      this.source = options.source || null
      this.ports = options.ports || []
    }
  }
}
