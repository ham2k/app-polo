/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import emojiRegex from 'emoji-regex'

const EMOJI_REGEX = emojiRegex()

export const MAX_DISPLAY_EMOJIS = 4

/**
 * Combines notes from multiple callsign notes files into a single display string.
 * Collects unique leading emojis from all notes and uses the text from the last note.
 * @param {Array} notes - Array of note objects with { call, note } properties
 * @param {Object} theirInfo - Call info with { baseCall, call } properties
 * @returns {{ note: string, emoji: string } | null} Combined note and first emoji, or null if no matches
 */
export function combineCallNotes(notes, theirInfo) {
  const matchingNotes = (notes || []).filter(
    note => note?.call === undefined || note?.call === theirInfo.baseCall || note?.call === theirInfo?.call
  )

  if (matchingNotes.length === 0) {
    return null
  }

  // Collect unique emojis from all notes (in file-added order)
  const emojis = []
  for (const note of matchingNotes) {
    if (note.note) {
      const matches = note.note.match(EMOJI_REGEX)
      if (matches && matches[0] && !emojis.includes(matches[0])) {
        emojis.push(matches[0])
      }
    }
  }

  // Get the last note's text, strip its leading emoji
  const lastNote = matchingNotes[matchingNotes.length - 1]
  let noteText = lastNote.note || ''
  const lastNoteEmojiMatch = noteText.match(EMOJI_REGEX)
  if (lastNoteEmojiMatch && noteText.startsWith(lastNoteEmojiMatch[0])) {
    noteText = noteText.slice(lastNoteEmojiMatch[0].length).trimStart()
  }

  // Combine emojis (capped) with the stripped note text
  const displayEmojis = emojis.slice(0, MAX_DISPLAY_EMOJIS)
  const emojiStr = displayEmojis.join('')
  const overflowIndicator = emojis.length > MAX_DISPLAY_EMOJIS ? `+${emojis.length - MAX_DISPLAY_EMOJIS}` : ''
  const combinedNote = emojiStr ? `${emojiStr}${overflowIndicator} ${noteText}` : noteText

  return {
    note: combinedNote,
    emoji: emojis.length > 0 ? emojis[0] : '⭐️'
  }
}
