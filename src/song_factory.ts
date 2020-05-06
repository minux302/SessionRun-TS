// prettier-ignore
const chordIdDict: { [index: string]: number } = {
  c:    0,
  db:   1,
  d:    2,
  eb:   3,
  e:    4,
  f:    5,
  gb:   6,
  g:    7,
  ab:   8,
  a:    9,
  bb:  10,
  b:   11,
  cm:  12,
  dbm: 13,
  dm:  14,
  ebm: 15,
  em:  16,
  fm:  17,
  gbm: 18,
  gm:  19,
  abm: 20,
  am:  21,
  bbm: 22,
  bm:  23,
};

function chord2ID(chord: string): number {
  return chordIdDict[chord];
}

export function songFactory(songName: string): [number, number[]] {
  if (songName !== 'autumn_leaves') {
    // Todo check
    throw new Error(`There is not song named ${songName}`);
  }

  // const repeat_num: number = 3;
  // prettier-ignore
  const chordList: string[] = ['cm', 'f', 'bb', 'eb',
                 'am', 'd', 'gm', 'gm',
                 'cm', 'f', 'bb', 'eb',
                 'am', 'd', 'gm', 'gm',
                 'am', 'd', 'gm', 'gm',
                 'cm', 'f', 'bb', 'eb',
                 'am', 'd', 'gm', 'fm',
                 'am', 'd', 'gm', 'gm' ];
  const tempo: number = 120;
  return [tempo, chordList.map(chord2ID)];
}
