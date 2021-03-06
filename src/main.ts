import * as tf from '@tensorflow/tfjs';
import { ModelConfig, SystemConfig } from './configs';
import { PianoGenieUI } from './ui';
import { songFactory } from './song_factory';
import { argSortDescending, zeros1d } from './utils';
const Tone = require('tone');
const PianoSampler = require('tone-piano').Piano;

const SALAMANDER_URL =
  'https://storage.googleapis.com/download.magenta.tensorflow.org/demos/SalamanderPiano/';

class SessionRun {
  // model configs
  private model: tf.GraphModel;
  private seqLen: number;
  private numButton: number;
  private numClass: number;

  // inner status
  private currKeySeq: number[];
  private lookAheadPreds: number[];
  private buttonToNoteMap: Map<number, number>;
  private fullChordIdList: number[];
  private msecPerChord: number;
  private startMsec: number;

  private sustainedNotes = new Set<number>();
  private sustainPedalDown: boolean = false;

  private sampler: any;
  private ui: PianoGenieUI;

  constructor(
    model: tf.GraphModel,
    mcfg: ModelConfig,
    scfg: SystemConfig,
    sampler: any,
    ui: PianoGenieUI
  ) {
    this.model = model;
    this.seqLen = mcfg.seqLen;
    this.numButton = mcfg.numButton;
    this.numClass = mcfg.numClass;

    const [tempo, ChordIdList]: [number, number[]] = songFactory(scfg.songName);
    this.msecPerChord = (60 * 4 * 1000) / tempo;
    this.fullChordIdList = this.createFullChordSeq(
      ChordIdList,
      mcfg.numNoteInBar
    );

    this.currKeySeq = [];
    this.lookAheadPreds = [];
    this.initInnerStatus();

    this.sampler = sampler;
    this.ui = ui;
    this.buttonToNoteMap = new Map<number, number>();
    this.setKeyUpDown();

    this.startMsec = this.songStart(scfg.songName) + this.msecPerChord; // since first bar is blank, tmp
  }

  private setKeyUpDown(): void {
    document.onkeydown = (evt: KeyboardEvent): void => {
      if (Tone.context.state !== 'running') {
        Tone.context.resume();
      }
      const key = evt.keyCode;
      const button = key - 49;
      if (button >= 0 && button < this.numButton) {
        if (!this.buttonToNoteMap.has(button)) {
          this.pressButton(button);
        }
      }
    };
    document.onkeyup = (evt: KeyboardEvent): void => {
      const key = evt.keyCode;
      const button = key - 49;
      if (button >= 0 && button < this.numButton) {
        if (this.buttonToNoteMap.has(button)) {
          this.releaseButton(button);
        }
      }
    };
  }

  private initInnerStatus(): void {
    for (let i = 0; i < this.seqLen; i++) {
      this.currKeySeq.push(Math.floor(Math.random() * this.numButton));
    }
    for (let i = 0; i < this.seqLen; ++i) {
      this.lookAheadPreds.push(-1);
    }
  }

  private createFullChordSeq(
    chordIdList: number[],
    numNoteInBar: number
  ): number[] {
    // insert dummy initial chord sequence.
    const fullChordIdList: number[] = zeros1d(this.seqLen).fill(chordIdList[0]);

    for (const chordId of chordIdList) {
      for (let i = 0; i < numNoteInBar; i++) {
        fullChordIdList.push(chordId);
      }
    }
    return fullChordIdList;
  }

  private songStart(songName: string): number {
    const audioElem = new Audio(`songs/${songName}.mp3`);
    audioElem.volume = 0.03;
    // Todo rethink here ()
    // Uncaught (in promise) DOMException: play() failed because the user didn't interact with the document first.
    audioElem.play();
    return Date.now();
  }

  private convertKeySeq(key: number): number {
    // Todo
    // const scale = this.numButton - 1;
    const scale = 8 - 1;
    return 2 * (key / scale) - 1;
  }

  private async predict(keySeq: number[], chordSeq: number[]): Promise<number> {
    const encSeq = keySeq.map(this.convertKeySeq);
    const encSeqT: tf.Tensor = tf
      .cast(encSeq, 'float32')
      .expandDims()
      .reshape([1, this.seqLen, 1]);
    const chordSeqT: tf.Tensor = tf.cast(chordSeq, 'int32').expandDims();

    const inputs: { [name: string]: tf.Tensor } = {};
    inputs['input/enc_pl'] = encSeqT;
    inputs['input/chord_pl'] = chordSeqT;

    // const start = Date.now() / 1000;
    const outputT = (await this.model.executeAsync(inputs)) as tf.Tensor;
    // console.log(Date.now() / 1000 - start);
    const output = Array.prototype.slice.call(
      tf.squeeze(outputT, [0]).arraySync()
    );
    const argSortedOutput = argSortDescending(output[output.length - 1]);
    const predNote: number =
      argSortedOutput[0] === this.numClass - 1
        ? argSortedOutput[1]
        : argSortedOutput[0];

    encSeqT.dispose();
    chordSeqT.dispose();
    outputT.dispose();
    return predNote;
  }

  private pressButton(button: number): void {
    const fromStartMsec = Math.floor(Date.now() - this.startMsec);
    const startChordIdx = Math.floor(fromStartMsec / (this.msecPerChord / 8));

    this.currKeySeq.shift();
    this.currKeySeq.push(button);
    const chordSeq = this.fullChordIdList.slice(
      startChordIdx,
      startChordIdx + this.seqLen
    );
    this.predict(this.currKeySeq, chordSeq).then((predNote) => {
      // Sound
      if (this.sustainPedalDown) {
        if (this.sustainedNotes.has(predNote)) {
          this.sampler.keyUp(predNote);
        }
        this.sustainedNotes.add(predNote);
      }
      this.sampler.keyDown(predNote, undefined, 0.2);
      this.buttonToNoteMap.set(button, predNote);
      // Draw
      this.lookAheadPreds[button] = predNote;
      this.ui.genieCanvas.redraw(this.buttonToNoteMap);
      this.redrawPiano();
    });
  }

  private releaseButton(button: number): void {
    const note = this.buttonToNoteMap.get(button);
    if (!this.sustainPedalDown) {
      this.sampler.keyUp(note);
    }
    this.buttonToNoteMap.delete(button);

    this.lookAheadPreds[button] = -1;
    this.ui.genieCanvas.redraw(this.buttonToNoteMap);
    this.redrawPiano();
  }

  private redrawPiano(): void {
    const noteToHueLightnessMap = new Map<number, [number, number]>();
    for (let i = 0; i < this.numButton; ++i) {
      const hue = this.ui.genieCanvas.getHue(i);
      if (this.lookAheadPreds !== undefined) {
        noteToHueLightnessMap.set(this.lookAheadPreds[i], [hue, 75]);
      }
    }
    this.ui.pianoCanvas.redraw(noteToHueLightnessMap);
  }
}

const ui = new PianoGenieUI();
const mcfg = new ModelConfig();
const scfg = new SystemConfig();

const div = document.getElementById('piano-genie-ui');
if (!div) {
  throw new Error('piano-genie-ui is null.');
}
div.appendChild(ui.div);
ui.genieCanvas.resize(mcfg.numButton);

const sampler = new PianoSampler({ velocities: 4 }).toMaster();
Promise.all([
  tf.loadGraphModel('web_model/model.json'),
  sampler.load(SALAMANDER_URL),
]).then(([model, _]) => {
  new SessionRun(model, mcfg, scfg, sampler, ui);
  ui.setReady();
});
