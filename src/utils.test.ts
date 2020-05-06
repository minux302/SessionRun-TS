import { argSortDescending, seq, zeros1d } from './utils';

test('zeros1d(3)', () => {
  expect(zeros1d(3)).toEqual([0, 0, 0]);
});

test('zeros1d(0)', () => {
  expect(zeros1d(0)).toEqual([]);
});

test('seq(3)', () => {
  expect(seq(3)).toEqual([0, 1, 2]);
});

test('seq(0)', () => {
  expect(seq(0)).toEqual([]);
});

test('argSortDescending([1, 3, 2, 4])', () => {
  expect(argSortDescending([1, 3, 2, 4])).toEqual([3, 1, 2, 0]);
});

test('argSortDescending([4, 2, 1, 3])', () => {
  expect(argSortDescending([4, 2, 1, 3])).toEqual([0, 3, 1, 2]);
});
