// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

package com.ham2k.nativetextinput

import android.content.Context
import android.text.Editable
import android.text.InputFilter
import android.text.InputType
import android.graphics.Typeface
import android.text.TextWatcher
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.ViewConfiguration
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputConnectionWrapper
import android.view.inputmethod.InputMethodManager
import androidx.appcompat.widget.AppCompatEditText
import com.facebook.react.common.assets.ReactFontManager
import kotlin.math.abs

/**
 * EditText that owns its text buffer and reports changes to JS with the caret
 * position marked in-band by [CURSOR_SENTINEL]. Space/Tab/Submit are surfaced as
 * discrete callbacks rather than being inferred from text diffs.
 */
class H2kNativeEditText(context: Context) : AppCompatEditText(context) {

  companion object {
    // U+0001 (SOH). Must match `CURSOR` in formatters.js.
    val CURSOR_SENTINEL: Char = 1.toChar() // U+0001 (SOH); matches CURSOR in formatters.js
  }

  // Callbacks wired up by the ViewManager.
  var onChangeWithCursor: ((text: String, eventCount: Int) -> Unit)? = null
  var onSpace: ((eventCount: Int) -> Unit)? = null
  var onTab: ((eventCount: Int) -> Unit)? = null
  var onSubmit: ((eventCount: Int) -> Unit)? = null
  var onFocusChange: ((focused: Boolean) -> Unit)? = null
  var onPress: ((eventCount: Int) -> Unit)? = null

  // Native-authoritative event counter. We only accept a `text` prop from JS once
  // JS has acknowledged every change we have emitted (mostRecentEventCount == this).
  var nativeEventCount = 0
    private set

  private var uppercase = false
  private var keyboardProfile = "default"
  private var smartKeyboard = true
  private var spaceNavigates = true

  // Guards the TextWatcher while we apply a value coming from props.
  private var applyingFromProps = false

  // `text` and `mostRecentEventCount` arrive as separate prop setters with no
  // guaranteed order, so we stage them and apply once per update transaction.
  private var pendingText: String? = null
  private var hasPendingText = false
  private var pendingEventCount = 0

  init {
    setSingleLine(true)
    isFocusableInTouchMode = true
    // The field chrome (H2kEnhancedField) draws the label, border and focus
    // underline, so strip the EditText's own background underline and the default
    // padding/font-padding that would otherwise clip the text in the tight height.
    background = null
    includeFontPadding = false
    setPadding(0, 0, 0, 0)
    gravity = Gravity.CENTER_VERTICAL
    applyKeyboardConfig()

    addTextChangedListener(object : TextWatcher {
      override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
      override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
      override fun afterTextChanged(s: Editable?) {
        if (applyingFromProps) return
        emitChange()
      }
    })

    setOnEditorActionListener { _, actionId, event ->
      if (actionId == EditorInfo.IME_ACTION_DONE ||
        actionId == EditorInfo.IME_ACTION_SEND ||
        actionId == EditorInfo.IME_ACTION_GO ||
        (event != null && event.keyCode == KeyEvent.KEYCODE_ENTER)
      ) {
        onSubmit?.invoke(nativeEventCount)
        true
      } else {
        false
      }
    }
  }

  override fun onFocusChanged(focused: Boolean, direction: Int, previouslyFocusedRect: android.graphics.Rect?) {
    super.onFocusChanged(focused, direction, previouslyFocusedRect)
    onFocusChange?.invoke(focused)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    // Keep text selectable when a parent uses removeClippedSubviews (e.g. the QSO
    // list), which otherwise breaks selection on recycled views. Mirrors RN's
    // ReactEditText (facebook/react-native#6805). setTextIsSelectable resets the
    // selection, so restore it.
    val selStart = selectionStart
    val selEnd = selectionEnd
    setTextIsSelectable(true)
    val len = text?.length ?: 0
    if (selStart in 0..len && selEnd in 0..len) setSelection(selStart, selEnd)
  }

  // The logging panel lives inside scroll/gesture containers that will steal the
  // touch stream after ACTION_DOWN — which lets the caret be placed but blocks the
  // tap from popping the IME and breaks caret drag / long-press selection. Disallow
  // parent interception on touch-down (released on a scroll move if we can't
  // scroll, so the parent can still scroll). Mirrors RN's ReactEditText.
  private var detectScrollMovement = false
  private var downTime = 0L
  private var downX = 0f
  private var downY = 0f
  private var wasFocusedOnDown = false
  override fun onTouchEvent(ev: MotionEvent): Boolean {
    when (ev.action) {
      MotionEvent.ACTION_DOWN -> {
        detectScrollMovement = true
        parent?.requestDisallowInterceptTouchEvent(true)
        wasFocusedOnDown = isFocused
        downTime = ev.eventTime
        downX = ev.rawX
        downY = ev.rawY
      }
      MotionEvent.ACTION_MOVE -> if (detectScrollMovement) {
        if (!canScrollVertically(-1) && !canScrollVertically(1) &&
          !canScrollHorizontally(-1) && !canScrollHorizontally(1)
        ) {
          parent?.requestDisallowInterceptTouchEvent(false)
        }
        detectScrollMovement = false
      }
      MotionEvent.ACTION_UP -> {
        // A tap on an ALREADY-focused field is reported to JS as onPress, which the
        // chrome turns into "blur to dismiss the keyboard" for an empty field. The
        // EditText consumes the touch and requestDisallowInterceptTouchEvent (needed
        // for the keyboard/selection fix) keeps RN's interception-based dispatch from
        // delivering a press to the chrome's Pressable, so we surface it ourselves.
        // The first (focusing) tap is handled natively, so only emit on a re-tap.
        val slop = ViewConfiguration.get(context).scaledTouchSlop
        val isTap = (ev.eventTime - downTime) < 300L &&
          abs(ev.rawX - downX) < slop && abs(ev.rawY - downY) < slop
        if (wasFocusedOnDown && isTap) onPress?.invoke(nativeEventCount)
      }
    }
    return super.onTouchEvent(ev)
  }

  // Stock requestFocus() does NOT pop the soft keyboard (only a real tap does), so
  // programmatic focus (the focus command / field-to-field navigation) must show it
  // explicitly. Mirrors RN's ReactEditText.requestFocusProgrammatically.
  fun focusAndShowKeyboard() {
    requestFocus()
    if (isInTouchMode) {
      val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
      imm?.showSoftInput(this, 0)
    }
  }

  fun blurAndHideKeyboard() {
    val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    imm?.hideSoftInputFromWindow(windowToken, 0)
    clearFocus()
  }

  // A single space/tab press can reach us through more than one path
  // (InputConnection commitText/sendKeyEvent and/or onKeyDown), depending on the
  // IME. Dedup by keycode within a short window so one press emits at most once.
  private var lastKeyEmitNanos = 0L
  private var lastKeyCode = -1
  private fun emitKeyOnce(keyCode: Int, action: () -> Unit) {
    val now = System.nanoTime()
    if (keyCode == lastKeyCode && now - lastKeyEmitNanos < 50_000_000L) return
    lastKeyEmitNanos = now
    lastKeyCode = keyCode
    action()
  }

  // Soft keyboards deliver most input through the InputConnection rather than key
  // events, so this is where we reliably catch space and tab.
  override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
    val base = super.onCreateInputConnection(outAttrs) ?: return null
    return object : InputConnectionWrapper(base, true) {
      override fun commitText(text: CharSequence?, newCursorPosition: Int): Boolean {
        when (text?.toString()) {
          " " -> if (spaceNavigates) { emitKeyOnce(KeyEvent.KEYCODE_SPACE) { onSpace?.invoke(nativeEventCount) }; return true } // swallow; JS decides
          "\t" -> { emitKeyOnce(KeyEvent.KEYCODE_TAB) { onTab?.invoke(nativeEventCount) }; return true }
        }
        return super.commitText(text, newCursorPosition)
      }

      override fun sendKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
          when (event.keyCode) {
            KeyEvent.KEYCODE_SPACE -> if (spaceNavigates) { emitKeyOnce(KeyEvent.KEYCODE_SPACE) { onSpace?.invoke(nativeEventCount) }; return true }
            KeyEvent.KEYCODE_TAB -> { emitKeyOnce(KeyEvent.KEYCODE_TAB) { onTab?.invoke(nativeEventCount) }; return true }
          }
        }
        return super.sendKeyEvent(event)
      }
    }
  }

  // Hardware keyboards (BT / external) deliver keys here rather than through the
  // soft-keyboard InputConnection, so Space and Tab must be caught in onKeyDown too.
  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_TAB) {
      emitKeyOnce(KeyEvent.KEYCODE_TAB) { onTab?.invoke(nativeEventCount) }
      return true
    }
    if (keyCode == KeyEvent.KEYCODE_SPACE && spaceNavigates) {
      emitKeyOnce(KeyEvent.KEYCODE_SPACE) { onSpace?.invoke(nativeEventCount) }
      return true
    }
    if (keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER) {
      // Single-line: handle Enter ourselves and consume it. Letting TextView process
      // it makes it try to advance focus to the next focusable, which crashes since
      // focus is JS-driven. (The soft-keyboard action button still routes through the
      // OnEditorActionListener.)
      if (event?.repeatCount == 0) onSubmit?.invoke(nativeEventCount)
      return true
    }
    return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER) return true
    return super.onKeyUp(keyCode, event)
  }

  // Paste as plain text instead of rich text, so styled clipboard content can't
  // bring spans/formatting into the field (mirrors RN's ReactEditText).
  override fun onTextContextMenuItem(id: Int): Boolean {
    val mapped = if (id == android.R.id.paste) android.R.id.pasteAsPlainText else id
    return super.onTextContextMenuItem(mapped)
  }

  // Layout is driven by Fabric, not Android's requestLayout pass, so after a
  // programmatic text change EditText would not scroll the caret into view in a
  // narrow single-line field. Reporting "no layout requested" makes it scroll
  // immediately (mirrors RN's ReactEditText).
  override fun isLayoutRequested(): Boolean = false

  private fun emitChange() {
    nativeEventCount += 1
    onChangeWithCursor?.invoke(textWithCursor(), nativeEventCount)
  }

  /** Current text with the sentinel inserted at the caret (selection start). */
  private fun textWithCursor(): String {
    val current = text?.toString() ?: ""
    val caret = selectionStart.coerceIn(0, current.length)
    return current.substring(0, caret) + CURSOR_SENTINEL + current.substring(caret)
  }

  // ----- Called by the ViewManager from props/commands -----

  fun stageText(value: String?) {
    pendingText = value
    hasPendingText = true
  }

  fun stageEventCount(value: Int) {
    pendingEventCount = value
  }

  /** Apply staged props once per update transaction (see ViewManager). */
  fun commitPendingProps() {
    if (!hasPendingText) return
    hasPendingText = false
    setTextFromProps(pendingText, pendingEventCount)
  }

  /**
   * Apply a controlled value from JS. [value] may contain one sentinel marking
   * the desired caret position. We ignore stale updates (JS not yet caught up).
   */
  private fun setTextFromProps(value: String?, mostRecentEventCount: Int) {
    if (mostRecentEventCount < nativeEventCount) return // stale; a newer change is in flight
    val incoming = value ?: ""
    val caret = incoming.indexOf(CURSOR_SENTINEL)
    val clean = if (caret >= 0) incoming.substring(0, caret) + incoming.substring(caret + 1) else incoming

    // If the text already matches, do NOT call setText: re-setting the Editable
    // resets the IME composing state and drops fast soft-keyboard keystrokes. The
    // caret is already where the user's keystroke left it, so there's nothing to
    // do. setText only runs when a formatter actually changed the text.
    if (clean == text?.toString()) return

    applyingFromProps = true
    // Use null (not "") when clearing so buggy keyboards also drop the composing
    // region, which they otherwise leave behind (matches RN's ReactEditText).
    if (clean.isEmpty()) setText(null) else replaceMinimally(clean)
    val pos = when {
      caret >= 0 -> caret.coerceIn(0, clean.length)
      else -> clean.length
    }
    setSelection(pos)
    applyingFromProps = false
  }

  // Replace only the changed middle of the buffer (common prefix/suffix preserved)
  // instead of setText'ing the whole thing. Editing the existing Editable in place
  // keeps the IME's composing region intact for the untouched parts, so a formatter
  // rewriting one spot doesn't disrupt fast typing elsewhere. Mirrors RN replacing
  // the existing Editable rather than reassigning it.
  private fun replaceMinimally(newText: String) {
    val editable = editableText ?: run { setText(newText); return }
    val old = editable.toString()
    if (old == newText) return
    val max = minOf(old.length, newText.length)
    var prefix = 0
    while (prefix < max && old[prefix] == newText[prefix]) prefix++
    var suffix = 0
    while (suffix < max - prefix &&
      old[old.length - 1 - suffix] == newText[newText.length - 1 - suffix]
    ) suffix++
    editable.replace(prefix, old.length - suffix, newText.substring(prefix, newText.length - suffix))
  }

  fun insertAtCursor(value: String) {
    val start = selectionStart.coerceAtLeast(0)
    val end = selectionEnd.coerceAtLeast(0)
    editableText?.replace(minOf(start, end), maxOf(start, end), value)
  }

  fun setUppercase(value: Boolean) {
    if (uppercase == value) return
    uppercase = value
    applyKeyboardConfig()
  }

  fun setKeyboardProfile(value: String?) {
    keyboardProfile = value ?: "default"
    applyKeyboardConfig()
  }

  fun setSmartKeyboard(value: Boolean) {
    smartKeyboard = value
    applyKeyboardConfig()
  }

  fun setSpaceNavigates(value: Boolean) {
    spaceNavigates = value
  }

  private var fontFamilyName: String? = null
  private var fontTypefaceStyle = Typeface.NORMAL

  fun setFontFamilyName(value: String?) {
    fontFamilyName = value
    applyTypeface()
  }

  fun setFontWeight(value: String?) {
    fontTypefaceStyle = when (value) {
      "bold", "600", "700", "800", "900" -> Typeface.BOLD
      else -> Typeface.NORMAL
    }
    applyTypeface()
  }

  private fun applyTypeface() {
    val family = fontFamilyName
    if (family.isNullOrEmpty()) return
    // Resolves RN-registered (bundled assets/fonts) families like "Roboto Mono".
    typeface = ReactFontManager.getInstance().getTypeface(family, fontTypefaceStyle, context.assets)
  }

  private fun applyKeyboardConfig() {
    var type = when (keyboardProfile) {
      "numbers", "dumb" ->
        if (smartKeyboard) {
          // visible-password gives a QWERTY layout WITH a number row on most IMEs.
          InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
        } else {
          InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
        }
      "email" -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
      "code" -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
      else -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
    }

    if (uppercase) {
      // visible-password cannot show all-caps keycaps; we still enforce caps via filter.
      type = type and InputType.TYPE_TEXT_FLAG_CAP_SENTENCES.inv()
      type = type or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
    }

    inputType = type
    filters = if (uppercase) arrayOf<InputFilter>(InputFilter.AllCaps()) else arrayOf()
    // visible-password / password input types reset the typeface to monospace, so
    // re-apply our configured font after changing inputType (mirrors RN).
    applyTypeface()
  }
}
