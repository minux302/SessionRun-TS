export const zeros1d = (n: number): number[] =>
  n <= 0 ? [] : new Array(n).fill(0);

export const seq = (n: number): number[] => zeros1d(n).map((_, i) => i);

export const argSortDescending = (array: number[]): number[] => {
  return array
    .map((x, i) => [x, i])
    .sort((a, b) => b[0] - a[0]) // sort in descending order
    .map(([_, i]) => i);
};
