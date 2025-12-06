#!/usr/bin/env node

/*
 * Script to generate translation files for qro (uppercase), qrp (lowercase), and cw (morse code)
 * from the English source files.
 *
 * Preserves interpolation variables like {{count}}, {{time}}, etc.
 */

const fs = require('fs');
const path = require('path');

// Morse code mapping using · (middle dot) and — (regular em dash)
const DOT = '·';
const DASH = '—';

const morseCode = {
  'A': DOT + DASH, 'B': DASH + DOT + DOT + DOT, 'C': DASH + DOT + DASH + DOT, 'D': DASH + DOT + DOT, 'E': DOT,
  'F': DOT + DOT + DASH + DOT, 'G': DASH + DASH + DOT, 'H': DOT + DOT + DOT + DOT, 'I': DOT + DOT, 'J': DOT + DASH + DASH + DASH,
  'K': DASH + DOT + DASH, 'L': DOT + DASH + DOT + DOT, 'M': DASH + DASH, 'N': DASH + DOT, 'O': DASH + DASH + DASH,
  'P': DOT + DASH + DASH + DOT, 'Q': DASH + DASH + DOT + DASH, 'R': DOT + DASH + DOT, 'S': DOT + DOT + DOT, 'T': DASH,
  'U': DOT + DOT + DASH, 'V': DOT + DOT + DOT + DASH, 'W': DOT + DASH + DASH, 'X': DASH + DOT + DOT + DASH, 'Y': DASH + DOT + DASH + DASH,
  'Z': DASH + DASH + DOT + DOT,
  '0': DASH + DASH + DASH + DASH + DASH, '1': DOT + DASH + DASH + DASH + DASH, '2': DOT + DOT + DASH + DASH + DASH, '3': DOT + DOT + DOT + DASH + DASH,
  '4': DOT + DOT + DOT + DOT + DASH, '5': DOT + DOT + DOT + DOT + DOT, '6': DASH + DOT + DOT + DOT + DOT, '7': DASH + DASH + DOT + DOT + DOT,
  '8': DASH + DASH + DASH + DOT + DOT, '9': DASH + DASH + DASH + DASH + DOT,
  '.': DOT + DASH + DOT + DASH + DOT + DASH, ',': DASH + DASH + DOT + DOT + DASH + DASH, '?': DOT + DOT + DASH + DASH + DOT + DOT, '!': DASH + DOT + DASH + DOT + DASH + DASH,
  '/': DASH + DOT + DOT + DASH + DOT, '+': DOT + DASH + DOT + DASH + DOT, '=': DASH + DOT + DOT + DOT + DASH, '-': DASH + DOT + DOT + DOT + DOT + DASH,
  '(': DASH + DOT + DASH + DASH + DOT, ')': DASH + DOT + DASH + DASH + DOT + DASH, '&': DOT + DASH + DOT + DOT + DOT, ':': DASH + DASH + DASH + DOT + DOT + DOT,
  ';': DASH + DOT + DASH + DOT + DASH + DOT, '"': DOT + DASH + DOT + DOT + DASH + DOT, "'": DOT + DASH + DASH + DASH + DASH + DOT, '_': DOT + DOT + DASH + DASH + DOT + DASH,
  '$': DOT + DOT + DOT + DASH + DOT + DOT + DASH + DASH, '@': DOT + DASH + DASH + DOT + DASH + DOT
};

/**
 * Preserves template variables while transforming text
 */
function preserveTemplateVars(text, transformFn) {
  // Extract template variables like {{count}}, {{time}}, etc.
  const templateVarRegex = /\{\{[^}]+\}\}/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  // Split text into template variables and regular text
  while ((match = templateVarRegex.exec(text)) !== null) {
    // Add text before the template variable
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    // Add the template variable as-is
    parts.push({ type: 'template', content: match[0] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last template variable
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  // If no template variables found, process entire text
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }

  // Transform each text part, keeping template variables unchanged
  const transformed = parts.map(part => {
    if (part.type === 'template') {
      return part.content;
    } else {
      const transformedText = transformFn(part.content);
      return transformedText;
    }
  });

  return transformed.join('');
}

/**
 * Convert text to uppercase, preserving template variables
 */
function toUppercase(text) {
  return preserveTemplateVars(text, (str) => str.toUpperCase());
}

/**
 * Convert text to lowercase, preserving template variables
 */
function toLowercase(text) {
  return preserveTemplateVars(text, (str) => str.toLowerCase());
}

/**
 * Convert text to Morse code, preserving template variables
 */
function toMorseCode(text) {
  // Extract template variables like {{count}}, {{time}}, etc.
  const templateVarRegex = /\{\{[^}]+\}\}/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  // Split text into template variables and regular text
  while ((match = templateVarRegex.exec(text)) !== null) {
    // Add text before the template variable
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    // Add the template variable as-is
    parts.push({ type: 'template', content: match[0] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last template variable
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  // If no template variables found, process entire text
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }

  // Convert each text part to Morse code, keeping template variables unchanged
  const converted = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part.type === 'template') {
      // Template variable - add with spacing
      converted.push(part.content);
    } else {
      // Convert text to Morse code
      let result = '';
      const str = part.content;
      for (let j = 0; j < str.length; j++) {
        const char = str[j].toUpperCase();

        if (char === ' ') {
          // Space between words - use / in Morse code
          if (result && result[result.length - 1] !== ' ') {
            result += ' / ';
          }
        } else if (morseCode[char]) {
          // Add space before new Morse code sequence
          if (result && result[result.length - 1] !== ' ' && result[result.length - 1] !== '/') {
            result += ' ';
          }
          result += morseCode[char];
        } else {
          // Unknown character - keep as is (for things like emojis, non-Latin scripts, etc.)
          if (result && result[result.length - 1] !== ' ' && result[result.length - 1] !== '/') {
            result += ' ';
          }
          result += char;
        }
      }
      converted.push(result.trim());
    }
  }

  // Join parts with proper spacing
  let final = '';
  for (let i = 0; i < converted.length; i++) {
    const part = converted[i];
    if (!part) continue;

    const isTemplateVar = part.startsWith('{{') && part.endsWith('}}');
    const hasContentBefore = final.length > 0;
    const hasContentAfter = i < converted.length - 1 && converted[i + 1];

    // Add space before template variable if there's content before
    // Always add space, even if last char is "/" (which represents word boundary)
    if (isTemplateVar && hasContentBefore) {
      final += ' ';
    }
    // Add space before regular part if needed (but not if last char is already "/")
    else if (!isTemplateVar && hasContentBefore) {
      const lastChar = final[final.length - 1];
      if (lastChar !== ' ' && lastChar !== '/') {
        final += ' ';
      }
    }

    final += part;

    // Add space after template variable if there's content after
    if (isTemplateVar && hasContentAfter) {
      final += ' ';
    }
  }

  return final.trim();
}

/**
 * Transform all string values in an object recursively
 */
function transformValues(obj, transformFn) {
  if (typeof obj === 'string') {
    return transformFn(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => transformValues(item, transformFn));
  } else if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = transformValues(obj[key], transformFn);
    }
    return result;
  }
  return obj;
}

/**
 * Process a single file
 */
function processFile(sourcePath, targetPath, transformFn, language) {
  if (!fs.existsSync(sourcePath)) {
    console.warn(`Warning: Source file not found: ${sourcePath}`);
    return;
  }

  const content = fs.readFileSync(sourcePath, 'utf8');
  const json = JSON.parse(content);
  const transformed = transformValues(json, transformFn);

  // Ensure target directory exists
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetPath, JSON.stringify(transformed, null, 2) + '\n', 'utf8');
  console.log(`✓ Generated ${language}/${path.basename(targetPath)}`);
}

/**
 * Main function
 */
function main() {
  const baseDir = path.join(__dirname, 'resources');
  const enDir = path.join(baseDir, 'en');
  const files = ['general.json', 'polo.json', 'extensions.json'];

  console.log('Generating translation files...\n');

  // Process each file
  files.forEach(file => {
    const sourcePath = path.join(enDir, file);

    // QRO - Uppercase
    const qroPath = path.join(baseDir, 'qro', file);
    processFile(sourcePath, qroPath, toUppercase, 'qro');

    // QRP - Lowercase
    const qrpPath = path.join(baseDir, 'qrp', file);
    processFile(sourcePath, qrpPath, toLowercase, 'qrp');

    // CW - Morse code
    const cwPath = path.join(baseDir, 'cw', file);
    processFile(sourcePath, cwPath, toMorseCode, 'cw');
  });

  console.log('\nDone!');
}

if (require.main === module) {
  main();
}

module.exports = { toUppercase, toLowercase, toMorseCode, transformValues };

