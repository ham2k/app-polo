// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

package com.ham2k.nativetextinput

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

// Event names map to the codegen prop names: prop `onChangeWithCursor` is delivered
// from the native event named "topChangeWithCursor", etc. (legacy "top"-prefix
// convention that Fabric still routes for SimpleViewManager dispatches).

class ChangeWithCursorEvent(
  surfaceId: Int,
  viewId: Int,
  private val text: String,
  private val eventCount: Int
) : Event<ChangeWithCursorEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME
  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putString("text", text)
    putInt("eventCount", eventCount)
  }

  companion object {
    const val EVENT_NAME = "topChangeWithCursor"
  }
}

/** Space / Tab / Submit all carry just the event count. */
class KeyPressEvent(
  surfaceId: Int,
  viewId: Int,
  private val name: String,
  private val eventCount: Int
) : Event<KeyPressEvent>(surfaceId, viewId) {
  override fun getEventName() = name
  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putInt("eventCount", eventCount)
  }
}

class FocusChangeEvent(
  surfaceId: Int,
  viewId: Int,
  private val focused: Boolean
) : Event<FocusChangeEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME
  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putBoolean("focused", focused)
  }

  companion object {
    const val EVENT_NAME = "topFocusChange"
  }
}
