/* Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

export class PianoCanvas {
  private canvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D | null;
  private midiNoteToBoundingBox: Map<number, number[]>;
  private midiNoteWhiteKeys: Set<number>;

  constructor(div: HTMLElement, height = 110, width = 450) {
    const pianoDiv = document.createElement('div');
    this.canvas = document.createElement('canvas');
    pianoDiv.appendChild(this.canvas);
    div.appendChild(pianoDiv);

    this.canvasCtx = this.canvas.getContext('2d');

    this.midiNoteToBoundingBox = new Map<number, number[]>();
    this.midiNoteWhiteKeys = new Set<number>();

    this.resize(height, width);
    this.redraw();
  }

  resize(height: number, width: number): void {
    this.canvas.height = height;
    this.canvas.width = width;

    const NUMWHITEKEYS = 52;

    const whiteKeyWidth = width / NUMWHITEKEYS;
    const whiteKeyHeight = height;
    const blackKeyWidth = whiteKeyWidth * 0.7;
    const blackKeyHeight = height * 0.6;

    let whiteKey = 0;

    // Calculate bounding boxes
    for (let i = 0; i < 88; ++i) {
      const offset = i % 12;
      const midiNote = i + 21;

      if (
        offset === 1 ||
        offset === 4 ||
        offset === 6 ||
        offset === 9 ||
        offset === 11
      ) {
        const center = (whiteKey / NUMWHITEKEYS) * width;
        const x = center - blackKeyWidth / 2;
        this.midiNoteToBoundingBox.set(midiNote, [
          x,
          0,
          blackKeyWidth,
          blackKeyHeight,
        ]);
      } else {
        this.midiNoteWhiteKeys.add(midiNote);
        const x = (whiteKey / NUMWHITEKEYS) * width;
        this.midiNoteToBoundingBox.set(midiNote, [
          x,
          0,
          whiteKeyWidth,
          whiteKeyHeight,
        ]);
        whiteKey += 1;
      }
    }
  }

  redraw(noteToHueLightnessMap?: Map<number, [number, number]>): void {
    const ctx = this.canvasCtx;
    if (ctx === null) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'black';

    const drawMidiNote = (midiNote: number): void => {
      let fillStyle = this.midiNoteWhiteKeys.has(midiNote) ? 'white' : 'black';
      if (noteToHueLightnessMap && noteToHueLightnessMap.has(midiNote)) {
        // const [hue, lightness] = noteToHueLightnessMap.get(midiNote)
        const hueLightness = noteToHueLightnessMap.get(midiNote);
        if (hueLightness !== undefined) {
          const hue = hueLightness[0];
          const lightness = hueLightness[1];
          fillStyle = `hsl(${hue}, 80%, ${lightness}%)`;
        }
      }
      ctx.fillStyle = fillStyle;

      const bb = this.midiNoteToBoundingBox.get(midiNote);
      if (!bb) {
        throw new Error('hoge');
      }
      ctx.fillRect(bb[0], bb[1], bb[2], bb[3]);
      ctx.strokeRect(bb[0], bb[1], bb[2], bb[3]);
    };

    // Draw white keys
    for (let midiNote = 21; midiNote <= 108; ++midiNote) {
      if (!this.midiNoteWhiteKeys.has(midiNote)) {
        continue;
      }
      drawMidiNote(midiNote);
    }

    // Draw black keys
    for (let midiNote = 21; midiNote <= 108; ++midiNote) {
      if (this.midiNoteWhiteKeys.has(midiNote)) {
        continue;
      }
      drawMidiNote(midiNote);
    }
  }
}
