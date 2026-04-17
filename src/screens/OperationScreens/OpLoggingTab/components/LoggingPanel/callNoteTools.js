/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import emojiRegex from 'emoji-regex'

const EMOJI_REGEX = emojiRegex()

export const MAX_DISPLAY_EMOJIS = 4

/**
 * Combines notes from multiple callsign notes files into a single display string.
 * Collects unique leading emojis from all notes and uses the text from the highest-priority note.
 *
 * The `notes` array is expected to be sorted by source priority (highest priority first),
 * which is the order returned by `findAllCallNotes`. Earlier notes in the array take precedence.
 *
 * @param {Array} notes - Array of note objects with { source, call, note } properties
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

  // Collect unique emojis from all notes (highest priority first)
  const emojis = []
  for (const note of matchingNotes) {
    if (note.note) {
      const matches = note.note.match(EMOJI_REGEX)
      if (matches && matches[0] && !emojis.includes(matches[0])) {
        emojis.push(matches[0])
      }
    }
  }

  // Use the text from the highest-priority note (first in array), strip its leading emoji
  const topNote = matchingNotes[0]
  let noteText = topNote.note || ''
  const topNoteEmojiMatch = noteText.match(EMOJI_REGEX)
  if (topNoteEmojiMatch && noteText.startsWith(topNoteEmojiMatch[0])) {
    noteText = noteText.slice(topNoteEmojiMatch[0].length).trimStart()
  }

  // Display emojis reversed so the highest-priority emoji appears last, next to the note text.
  // Keep only the most important emojis (first in array) when capping.
  const cappedEmojis = emojis.slice(0, MAX_DISPLAY_EMOJIS)
  const overflowIndicator = emojis.length > MAX_DISPLAY_EMOJIS ? `+${emojis.length - MAX_DISPLAY_EMOJIS}` : ''
  const emojiStr = [...cappedEmojis].reverse().join('')
  const combinedNote = emojiStr ? `${emojiStr}${overflowIndicator} ${noteText}` : noteText

  return {
    note: combinedNote,
    emoji: cappedEmojis[0] || '⭐️'
  }
}
