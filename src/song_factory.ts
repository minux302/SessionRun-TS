const chordIdDict: { [index: string]: number } = {
  c: 0,
  db: 1,
  d: 2,
  eb: 3,
  e: 4,
  f: 5,
  gb: 6,
  g: 7,
  ab: 8,
  a: 9,
  bb: 10,
  b: 11,
  cm: 12,
  dbm: 13,
  dm: 14,
  ebm: 15,
  em: 16,
  fm: 17,
  gbm: 18,
  gm: 19,
  abm: 20,
  am: 21,
  bbm: 22,
  bm: 23,
};

function chord2ID(chord: string): number {
  return chordIdDict[chord];
}

export function songFactory(songName: string): [number, number[]] {
  let chordList: string[];
  let tempo: number;
  // let repeat_num: number;
  if (songName === 'autumn_leaves') {
    chordList = [
      'cm',
      'f',
      'bb',
      'eb',
      'am',
      'd',
      'gm',
      'gm',
      'cm',
      'f',
      'bb',
      'eb',
      'am',
      'd',
      'gm',
      'gm',
      'am',
      'd',
      'gm',
      'gm',
      'cm',
      'f',
      'bb',
      'eb',
      'am',
      'd',
      'gm',
      'fm',
      'am',
      'd',
      'gm',
      'gm',
    ];
    tempo = 120;
    // repeat_num = 3
  } else {
    // Todo check
    throw new Error(`There is not song named ${songName}`);
  }
  return [tempo, chordList.map(chord2ID)];
}
