// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

package com.ham2k.nativetextinput

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.H2kNativeTextInputManagerDelegate
import com.facebook.react.viewmanagers.H2kNativeTextInputManagerInterface

@ReactModule(name = H2kNativeTextInputManager.NAME)
class H2kNativeTextInputManager :
  SimpleViewManager<H2kNativeEditText>(),
  H2kNativeTextInputManagerInterface<H2kNativeEditText> {

  private val delegate = H2kNativeTextInputManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<H2kNativeEditText> = delegate

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): H2kNativeEditText =
    H2kNativeEditText(context)

  override fun addEventEmitters(context: ThemedReactContext, view: H2kNativeEditText) {
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
    val surfaceId = UIManagerHelper.getSurfaceId(context)

    view.onChangeWithCursor = { text, count ->
      dispatcher?.dispatchEvent(ChangeWithCursorEvent(surfaceId, view.id, text, count))
    }
    view.onSpace = { count ->
      dispatcher?.dispatchEvent(KeyPressEvent(surfaceId, view.id, "topSpacePressed", count))
    }
    view.onTab = { count ->
      dispatcher?.dispatchEvent(KeyPressEvent(surfaceId, view.id, "topTabPressed", count))
    }
    view.onSubmit = { count ->
      dispatcher?.dispatchEvent(KeyPressEvent(surfaceId, view.id, "topSubmitPressed", count))
    }
    view.onFocusChange = { focused ->
      dispatcher?.dispatchEvent(FocusChangeEvent(surfaceId, view.id, focused))
    }
    view.onPress = { count ->
      dispatcher?.dispatchEvent(KeyPressEvent(surfaceId, view.id, "topPress", count))
    }
  }

  // Apply staged `text` + `mostRecentEventCount` together, after all prop setters ran.
  override fun onAfterUpdateTransaction(view: H2kNativeEditText) {
    super.onAfterUpdateTransaction(view)
    view.commitPendingProps()
  }

  // ----- Props (from the generated interface) -----

  override fun setText(view: H2kNativeEditText, value: String?) = view.stageText(value)

  override fun setMostRecentEventCount(view: H2kNativeEditText, value: Int) = view.stageEventCount(value)

  override fun setPlaceholder(view: H2kNativeEditText, value: String?) {
    view.hint = value
  }

  override fun setEditable(view: H2kNativeEditText, value: Boolean) {
    view.isEnabled = value
  }

  override fun setUppercase(view: H2kNativeEditText, value: Boolean) = view.setUppercase(value)

  override fun setKeyboardProfile(view: H2kNativeEditText, value: String?) = view.setKeyboardProfile(value)

  override fun setSmartKeyboard(view: H2kNativeEditText, value: Boolean) = view.setSmartKeyboard(value)

  override fun setSpaceKeyMode(view: H2kNativeEditText, value: String?) = view.setSpaceNavigates(value != "insert")

  override fun setKeyboardAppearance(view: H2kNativeEditText, value: String?) {
    // Android has no per-field keyboard appearance; no-op (kept for API parity with iOS).
  }

  override fun setColor(view: H2kNativeEditText, value: Int?) {
    value?.let { view.setTextColor(it) }
  }

  override fun setPlaceholderTextColor(view: H2kNativeEditText, value: Int?) {
    value?.let { view.setHintTextColor(it) }
  }

  override fun setFontSize(view: H2kNativeEditText, value: Double) {
    if (value > 0) view.textSize = value.toFloat()
  }

  override fun setFontFamily(view: H2kNativeEditText, value: String?) = view.setFontFamilyName(value)

  override fun setFontWeight(view: H2kNativeEditText, value: String?) = view.setFontWeight(value)

  // ----- Commands (from the generated interface) -----

  override fun insertAtCursor(view: H2kNativeEditText, value: String?) {
    view.insertAtCursor(value ?: "")
  }

  override fun focus(view: H2kNativeEditText) {
    view.focusAndShowKeyboard()
  }

  override fun blur(view: H2kNativeEditText) {
    view.blurAndHideKeyboard()
  }

  // The delegate routes string-named commands to the typed overrides above.
  override fun receiveCommand(view: H2kNativeEditText, commandId: String, args: ReadableArray?) {
    delegate.receiveCommand(view, commandId, args)
  }

  override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any> {
    return mutableMapOf(
      "topChangeWithCursor" to bubble("onChangeWithCursor"),
      "topSpacePressed" to bubble("onSpacePressed"),
      "topTabPressed" to bubble("onTabPressed"),
      "topSubmitPressed" to bubble("onSubmitPressed"),
      "topPress" to bubble("onPress")
    )
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return mutableMapOf(
      "topFocusChange" to mapOf("registrationName" to "onFocusChange")
    )
  }

  private fun bubble(registrationName: String): Map<String, Any> =
    mapOf(
      "phasedRegistrationNames" to mapOf(
        "bubbled" to registrationName,
        "captured" to "${registrationName}Capture"
      )
    )

  companion object {
    const val NAME = "H2kNativeTextInput"
  }
}
