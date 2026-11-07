/**
 * Helpers for showing lengths that are stored in whole centimetres in inches instead.
 *
 * Measurements (waist, hips, bust/chest) are saved to the listing as integer centimetres, and
 * search filters read those values. Inches are a display-only alternative: a value typed in
 * inches is converted to whole centimetres before it reaches the form state, so what is saved
 * never changes shape.
 *
 * Rules:
 * - inches -> cm: multiply by 2.54 and round to the nearest whole centimetre (halves round up).
 * - cm -> inches (for display): divide by 2.54 and round to the nearest half inch. Any half-inch
 *   value typed in survives the round trip (cm rounding moves it by at most 0.2 in).
 * - The cm minimum and maximum still apply after conversion; minInchesForCm / maxInchesForCm
 *   give the half-inch values that pass them, for error messages.
 */

export const UNIT_CM = 'cm';
export const UNIT_IN = 'in';

// 1 inch = 2.54 cm exactly. Working in hundredths keeps half-inch values exact in floating point
// (e.g. 25 in * 254 / 100 is exactly 63.5, which then rounds up to 64 as expected).
const HUNDREDTHS_OF_CM_PER_INCH = 254;

const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

/**
 * Convert inches to whole centimetres (nearest, halves up).
 *
 * @param {number} inches
 * @returns {number|null} integer cm, or null if the input is not a number
 */
export const inchesToCm = inches =>
  isFiniteNumber(inches) ? Math.round((inches * HUNDREDTHS_OF_CM_PER_INCH) / 100) : null;

/**
 * Convert centimetres to inches, rounded to the nearest half inch.
 *
 * @param {number} cm
 * @returns {number|null} inches in steps of 0.5, or null if the input is not a number
 */
export const cmToInches = cm =>
  isFiniteNumber(cm) ? Math.round(((cm * 100) / HUNDREDTHS_OF_CM_PER_INCH) * 2) / 2 : null;

/**
 * Parse what was typed into an inches input and convert it to whole centimetres.
 *
 * @param {string|number} value raw input value
 * @returns {number|null} integer cm, or null when empty or not a number
 */
export const parseInchesToCm = value => {
  if (value == null || `${value}`.trim() === '') {
    return null;
  }
  const inches = Number.parseFloat(value);
  return Number.isNaN(inches) ? null : inchesToCm(inches);
};

/**
 * Show a stored centimetre value as an inches input value.
 *
 * @param {number|null} cm
 * @returns {string} e.g. '32.5', or '' when there is no value
 */
export const formatCmAsInches = cm => {
  const inches = cmToInches(cm);
  return inches == null ? '' : `${inches}`;
};

/**
 * The smallest half-inch value that still passes a minimum given in centimetres.
 *
 * @param {number} minCm
 * @returns {number|undefined}
 */
export const minInchesForCm = minCm => {
  if (!isFiniteNumber(minCm)) {
    return undefined;
  }
  let inches = Math.floor(((minCm * 100) / HUNDREDTHS_OF_CM_PER_INCH) * 2) / 2;
  while (inchesToCm(inches) < minCm) {
    inches += 0.5;
  }
  return inches;
};

/**
 * The largest half-inch value that still passes a maximum given in centimetres.
 *
 * @param {number} maxCm
 * @returns {number|undefined}
 */
export const maxInchesForCm = maxCm => {
  if (!isFiniteNumber(maxCm)) {
    return undefined;
  }
  let inches = Math.ceil(((maxCm * 100) / HUNDREDTHS_OF_CM_PER_INCH) * 2) / 2;
  while (inchesToCm(inches) > maxCm) {
    inches -= 0.5;
  }
  return inches;
};

/**
 * Swap a trailing "(cm)" unit in a field label for another unit, e.g. "Waist (cm)" ->
 * "Waist (in)". Labels without a trailing "(cm)" are returned unchanged.
 *
 * @param {string} label
 * @param {string} unitAbbreviation e.g. 'in'
 * @returns {string}
 */
export const swapLabelUnit = (label, unitAbbreviation) =>
  typeof label === 'string' && unitAbbreviation
    ? label.replace(/\(\s*cm\s*\)\s*$/i, `(${unitAbbreviation})`)
    : label;

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replace a whole word in a sentence, e.g. "centimetres" -> "inches" in a field's help text.
 * Text that does not contain the word is returned unchanged.
 *
 * @param {string} text
 * @param {string} fromWord
 * @param {string} toWord
 * @returns {string}
 */
export const swapUnitWord = (text, fromWord, toWord) =>
  typeof text === 'string' && fromWord && toWord
    ? text.replace(new RegExp(`\\b${escapeRegExp(fromWord)}\\b`, 'gi'), toWord)
    : text;
