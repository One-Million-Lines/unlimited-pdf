import { describe, it, expect } from 'vitest';
import { parsePageRanges, parsePageSet, RangeParseError } from '@/core/util/range';

describe('parsePageRanges', () => {
  it('parses single pages and ranges', () => {
    expect(parsePageRanges('1-3, 5, 8', 10)).toEqual([1, 2, 3, 5, 8]);
  });

  it('resolves the "end" keyword', () => {
    expect(parsePageRanges('8-end', 10)).toEqual([8, 9, 10]);
    expect(parsePageRanges('first-3', 10)).toEqual([1, 2, 3]);
  });

  it('preserves order and duplicates as written', () => {
    expect(parsePageRanges('3,3,1', 5)).toEqual([3, 3, 1]);
  });

  it('expands reversed ranges descending', () => {
    expect(parsePageRanges('5-2', 10)).toEqual([5, 4, 3, 2]);
  });

  it('ignores extra whitespace and mixed separators', () => {
    expect(parsePageRanges('  1  2\t3 ', 5)).toEqual([1, 2, 3]);
  });

  it('rejects out-of-range pages', () => {
    expect(() => parsePageRanges('11', 10)).toThrow(RangeParseError);
    expect(() => parsePageRanges('0', 10)).toThrow(RangeParseError);
  });

  it('rejects malformed tokens', () => {
    expect(() => parsePageRanges('1-2-3', 10)).toThrow(RangeParseError);
    expect(() => parsePageRanges('abc', 10)).toThrow(RangeParseError);
    expect(() => parsePageRanges('', 10)).toThrow(RangeParseError);
  });

  it('parsePageSet dedupes and sorts', () => {
    expect(parsePageSet('5, 1-3, 2', 10)).toEqual([1, 2, 3, 5]);
  });
});
