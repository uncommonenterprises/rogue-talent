import {
  cmToInches,
  formatCmAsInches,
  inchesToCm,
  maxInchesForCm,
  minInchesForCm,
  parseInchesToCm,
  swapLabelUnit,
  swapUnitWord,
} from './lengthUnits';

describe('lengthUnits', () => {
  describe('inchesToCm', () => {
    it('converts to whole centimetres, rounding to the nearest', () => {
      expect(inchesToCm(30)).toEqual(76); // 76.2
      expect(inchesToCm(32.5)).toEqual(83); // 82.55
      expect(inchesToCm(36)).toEqual(91); // 91.44
      expect(inchesToCm(1)).toEqual(3); // 2.54
    });

    it('rounds an exact half centimetre up', () => {
      // 25 in = 63.5 cm exactly
      expect(inchesToCm(25)).toEqual(64);
    });

    it('accepts decimals other than halves', () => {
      expect(inchesToCm(32.3)).toEqual(82); // 82.042
    });

    it('returns null for non-numbers', () => {
      expect(inchesToCm(null)).toBeNull();
      expect(inchesToCm(undefined)).toBeNull();
      expect(inchesToCm(NaN)).toBeNull();
      expect(inchesToCm('30')).toBeNull();
    });
  });

  describe('cmToInches', () => {
    it('converts to the nearest half inch', () => {
      expect(cmToInches(76)).toEqual(30); // 29.92
      expect(cmToInches(70)).toEqual(27.5); // 27.56
      expect(cmToInches(83)).toEqual(32.5); // 32.68
      expect(cmToInches(90)).toEqual(35.5); // 35.43
      expect(cmToInches(100)).toEqual(39.5); // 39.37
    });

    it('returns null for non-numbers', () => {
      expect(cmToInches(null)).toBeNull();
      expect(cmToInches(undefined)).toBeNull();
    });
  });

  describe('round trip', () => {
    it('keeps every half-inch value from 10 to 90 inches when saved as cm and shown again', () => {
      for (let inches = 10; inches <= 90; inches += 0.5) {
        expect(cmToInches(inchesToCm(inches))).toEqual(inches);
      }
    });

    it('always saves an integer number of centimetres', () => {
      for (let inches = 10; inches <= 90; inches += 0.1) {
        expect(Number.isInteger(inchesToCm(inches))).toBe(true);
      }
    });

    it('moves a stored cm value by at most 1 cm if its inches display is saved unchanged', () => {
      for (let cm = 40; cm <= 200; cm++) {
        expect(Math.abs(inchesToCm(cmToInches(cm)) - cm)).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('parseInchesToCm', () => {
    it('parses typed values', () => {
      expect(parseInchesToCm('32.5')).toEqual(83);
      expect(parseInchesToCm('30')).toEqual(76);
      expect(parseInchesToCm(' 30 ')).toEqual(76);
      expect(parseInchesToCm(30)).toEqual(76);
    });

    it('treats empty or non-numeric input as no value', () => {
      expect(parseInchesToCm('')).toBeNull();
      expect(parseInchesToCm('  ')).toBeNull();
      expect(parseInchesToCm(null)).toBeNull();
      expect(parseInchesToCm(undefined)).toBeNull();
      expect(parseInchesToCm('abc')).toBeNull();
    });
  });

  describe('formatCmAsInches', () => {
    it('shows cm as an inches string', () => {
      expect(formatCmAsInches(83)).toEqual('32.5');
      expect(formatCmAsInches(76)).toEqual('30');
    });

    it('shows nothing when there is no value', () => {
      expect(formatCmAsInches(null)).toEqual('');
      expect(formatCmAsInches(undefined)).toEqual('');
    });
  });

  describe('min and max in inches', () => {
    it('gives the smallest half inch that passes the cm minimum', () => {
      // 40 cm minimum: 15.5 in -> 39 cm fails, 16 in -> 41 cm passes
      expect(minInchesForCm(40)).toEqual(16);
      expect(inchesToCm(15.5)).toBeLessThan(40);
      expect(inchesToCm(16)).toBeGreaterThanOrEqual(40);
      // 50 cm minimum: 19.5 in -> 50 cm passes, 19 in -> 48 cm fails
      expect(minInchesForCm(50)).toEqual(19.5);
      expect(inchesToCm(19)).toBeLessThan(50);
      // Height: 100 cm minimum -> 39.5 in (100 cm)
      expect(minInchesForCm(100)).toEqual(39.5);
    });

    it('gives the largest half inch that passes the cm maximum', () => {
      // 200 cm maximum: 78.5 in -> 199 cm passes, 79 in -> 201 cm fails
      expect(maxInchesForCm(200)).toEqual(78.5);
      expect(inchesToCm(78.5)).toBeLessThanOrEqual(200);
      expect(inchesToCm(79)).toBeGreaterThan(200);
    });

    it('agrees with the cm limits for every half inch near the boundaries', () => {
      [40, 50, 100, 200, 250].forEach(limit => {
        const min = minInchesForCm(limit);
        const max = maxInchesForCm(limit);
        expect(inchesToCm(min)).toBeGreaterThanOrEqual(limit);
        expect(inchesToCm(min - 0.5)).toBeLessThan(limit);
        expect(inchesToCm(max)).toBeLessThanOrEqual(limit);
        expect(inchesToCm(max + 0.5)).toBeGreaterThan(limit);
      });
    });

    it('returns undefined when there is no limit', () => {
      expect(minInchesForCm(undefined)).toBeUndefined();
      expect(maxInchesForCm(null)).toBeUndefined();
    });
  });

  describe('swapLabelUnit', () => {
    it('swaps a trailing (cm) for the given unit', () => {
      expect(swapLabelUnit('Waist (cm)', 'in')).toEqual('Waist (in)');
      expect(swapLabelUnit('Bust/Chest (cm)', 'in')).toEqual('Bust/Chest (in)');
      expect(swapLabelUnit('Hips (CM) ', 'in')).toEqual('Hips (in)');
    });

    it('leaves other labels alone', () => {
      expect(swapLabelUnit('Shoe size (UK)', 'in')).toEqual('Shoe size (UK)');
      expect(swapLabelUnit('Waist', 'in')).toEqual('Waist');
      expect(swapLabelUnit(undefined, 'in')).toBeUndefined();
    });
  });

  describe('swapUnitWord', () => {
    it('swaps the unit word in help text', () => {
      expect(
        swapUnitWord('The fullest part of your hips in centimetres.', 'centimetres', 'inches')
      ).toEqual('The fullest part of your hips in inches.');
    });

    it('leaves text without the word alone', () => {
      expect(swapUnitWord('Your UK shoe size.', 'centimetres', 'inches')).toEqual(
        'Your UK shoe size.'
      );
      expect(swapUnitWord(undefined, 'centimetres', 'inches')).toBeUndefined();
    });
  });
});
