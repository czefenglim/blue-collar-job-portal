const fs = require('fs');
const path = require('path');

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

function skipWhitespace(text, i) {
  while (i < text.length && isWhitespace(text[i])) i++;
  return i;
}

function readString(text, i) {
  // Assumes starting at a double quote
  let start = i;
  i++; // skip opening quote
  let escaped = false;
  while (i < text.length) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      i++;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      i++;
      continue;
    }
    if (ch === '"') {
      // closing quote
      i++;
      return { value: text.slice(start, i), next: i }; // include quotes
    }
    i++;
  }
  throw new Error('Unterminated string in JSON');
}

function readBalanced(text, i, openCh, closeCh) {
  // Assumes starting at openCh
  let start = i;
  let depth = 0;
  let inString = false;
  let escaped = false;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      i++;
      continue;
    } else {
      if (ch === '"') {
        inString = true;
        i++;
        continue;
      }
      if (ch === openCh) depth++;
      if (ch === closeCh) {
        depth--;
        if (depth === 0) {
          i++;
          return { value: text.slice(start, i), next: i };
        }
      }
      i++;
    }
  }
  throw new Error('Unterminated structure in JSON');
}

function readValue(text, i) {
  i = skipWhitespace(text, i);
  const ch = text[i];
  if (ch === '"') {
    return readString(text, i);
  }
  if (ch === '{') {
    return readBalanced(text, i, '{', '}');
  }
  if (ch === '[') {
    return readBalanced(text, i, '[', ']');
  }
  // primitives: number, boolean, null
  const start = i;
  while (i < text.length) {
    const c = text[i];
    if (c === ',' || c === '}' || isWhitespace(c)) break;
    i++;
  }
  const raw = text.slice(start, i);
  return { value: raw, next: i };
}

function deepMerge(target, source) {
  if (target && source && typeof target === 'object' && typeof source === 'object' && !Array.isArray(target) && !Array.isArray(source)) {
    for (const key of Object.keys(source)) {
      if (key in target) {
        target[key] = deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
  // Prefer source when types differ or arrays/primitives
  return source;
}

function parseAndMergeRoot(text) {
  let i = skipWhitespace(text, 0);
  if (text[i] !== '{') {
    throw new Error('JSON must start with "{"');
  }
  i++; // skip opening brace
  const result = {};
  let mergedCount = 0;
  while (i < text.length) {
    i = skipWhitespace(text, i);
    if (i >= text.length) break;
    if (text[i] === '}') {
      i++;
      break;
    }
    if (text[i] !== '"') {
      // skip unexpected characters (robustness)
      i++;
      continue;
    }
    const keyStr = readString(text, i);
    const key = JSON.parse(keyStr.value);
    i = skipWhitespace(text, keyStr.next);
    if (text[i] !== ':') {
      throw new Error('Expected ":" after key at position ' + i);
    }
    i++;
    const val = readValue(text, i);
    i = skipWhitespace(text, val.next);
    // Attempt to parse value JSON
    let parsed;
    try {
      parsed = JSON.parse(val.value);
    } catch (e) {
      // If value cannot be parsed, skip it
      console.warn('Skipping unparsable value for key:', key, e.message);
      parsed = undefined;
    }
    if (parsed !== undefined) {
      if (result.hasOwnProperty(key)) {
        result[key] = deepMerge(result[key], parsed);
        mergedCount++;
      } else {
        result[key] = parsed;
      }
    }
    // Skip optional comma
    if (text[i] === ',') {
      i++;
    }
  }
  return { result, mergedCount };
}

function mergeFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { result, mergedCount } = parseAndMergeRoot(raw);
  const pretty = JSON.stringify(result, null, 2) + '\n';
  fs.writeFileSync(filePath, pretty, 'utf8');
  console.log(`[merge-locales] ${path.basename(filePath)} merged; duplicate merges: ${mergedCount}`);
}

const root = path.resolve(__dirname, '..', 'locales');
const files = ['en.json', 'ms.json', 'ta.json'];
files.forEach((f) => mergeFile(path.join(root, f)));
