import * as tf from '@tensorflow/tfjs';
import { ModelConfig, SystemConfig } from './configs';
import { PianoGenieUI } from './ui';
import { songFactory } from './song_factory';
const Tone = require('tone')
const PianoSampler = require('tone-piano').Piano;

const SALAMANDER_URL = 'https://storage.googleapis.com/download.magenta.tensorflow.org/demos/SalamanderPiano/';


function convertKeySeq(key: number) {
  const scale = 7
  return 2 * (key / scale) - 1
}


function createFullChordSeq(chordIdList: number[], numNoteInBar: number): number[] {
  let fullChordIdList: number[] = [];
  for (let chordId of chordIdList) {
    for (let i = 0; i < numNoteInBar; i++) {
      fullChordIdList.push(chordId);
    }
  }
  return fullChordIdList;
}


function songStart(songName: string): number{
  const audioElem = new Audio(`{$songName}.mp3`);  
  audioElem.volume = 0.5;
  audioElem.play();
  return Math.floor(Date.now() / 1000);
}



class SessionRun {
  // model configs
  private model: tf.GraphModel;
  private seqLen: number;
  private numButton: number;
  private numClass: number;

  // inner status
  private currKeySeq: number[];
  private currChordSeq: number[];
  private lookAheadPreds: number[];
  private buttonToNoteMap: Map<number, number>;
  private fullChordIdList: number[];
  private secondsPerChord: number;
  private startTime: number;

  private sampler: any;
  private ui: PianoGenieUI;

  constructor(model: tf.GraphModel,
              mcfg: ModelConfig,
              scfg: SystemConfig,
              sampler: any,
              ui: PianoGenieUI) {
    this.model = model;
    this.seqLen = mcfg.seqLen;
    this.numButton = mcfg.numButton;
    this.numClass = mcfg.numClass;

    let ChordIdList: number[];
    let tempo: number;
    [tempo, ChordIdList] = songFactory(scfg.songName)
    this.secondsPerChord   = (60*4) / tempo;
    this.fullChordIdList = createFullChordSeq(ChordIdList, mcfg.numNoteInBar)

    this.currKeySeq = [];
    this.currChordSeq = [];
    this.lookAheadPreds = [];
    this.initInnerStatus();

    this.sampler = sampler;
    this.ui = ui;
    this.buttonToNoteMap = new Map<number, number>();
    this.setKeyUpDown();

    this.startTime = songStart(scfg.songName) + this.secondsPerChord; // since first bar is blank, tmp
  };

  private setKeyUpDown (): void {
    document.onkeydown = (evt: KeyboardEvent) => {
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }
        const key = evt.keyCode;
        let button = key - 49;
        if (button >= 0 && button < this.numButton) {
            if (!this.buttonToNoteMap.has(button)) {
                this.pressButton(button);
            }
        }
    };
    document.onkeyup = (evt: KeyboardEvent) => {
        const key = evt.keyCode;
        let button = key - 49;
        if (button >= 0 && button < this.numButton) {
            if (this.buttonToNoteMap.has(button)) {
                this.releaseButton(button);
            }
        }
    };
  }

  private initInnerStatus(): void {
    for (let i = 0; i < this.seqLen; i++) {
      this.currKeySeq.push(Math.floor(Math.random() * Math.floor(this.numButton)));
    }
    for (let i = 0; i < this.seqLen; i++) {
      this.currChordSeq.push(Math.floor(Math.random() * Math.floor(this.numClass)));
    }
    for (let i = 0; i < this.seqLen; ++i) {
        this.lookAheadPreds.push(-1);
    }
  }

  private async predict(keySeq: number[], chordSeq: number []) {
    let encSeqT: tf.Tensor;
    let chordSeqT: tf.Tensor;
    const encSeq = keySeq.map(convertKeySeq);

    encSeqT = tf.cast(encSeq, 'float32').expandDims();
    encSeqT = tf.reshape(encSeqT, [1, this.seqLen, 1]);
    chordSeqT = tf.cast(chordSeq, 'int32').expandDims();

    const inputs: {[name: string]: tf.Tensor} = {};
    inputs['input/enc_pl'] = encSeqT;
    inputs['input/chord_pl'] = chordSeqT;

    const output = (await this.model.executeAsync(inputs) as tf.Tensor);
    const predNoteSeqT = tf.argMax(tf.squeeze(output, [0]), 1);
    const predNote = predNoteSeqT.dataSync()[this.seqLen - 1];

    encSeqT.dispose();
    chordSeqT.dispose();
    output.dispose();
    predNoteSeqT.dispose();
    return predNote;
  }

  private pressButton(button: number) {
    // let lastTime = Date.now();
    // const fromStartTimeSec = (Date.now() - this.startTime) / 1000;
    // fromLastPredTimeSec = (Date.now() - lastTime)  / 1000;
    // lastTime            = Date.now();
    // const currentChord = songChordList[divInt(fromStartTimeSec, secondsPerChord)];
    // const restNoteNum  = divInt(fromLastPredTimeSec, secondsPerChord); 
    // for (let _ = 0; _ < restNoteNum; _++) {
    //   noteSeries.push(restNoteClass);
    //   chordIdSeries.push(chord2idDict[currentChord]);
    // }
    // chordIdSeries.push(chord2idDict[currentChord]);

    this.currKeySeq.shift();
    this.currKeySeq.push(button);
    const chordSeq: number[] = [14, 14, 14, 14, 14, 14, 14, 14,
                                7,  7,  7,  7,  7,  7,  7,  7]
    this.predict(this.currKeySeq, chordSeq)
      .then((predNote) => {
        // Sound
        this.sampler.keyDown(predNote, undefined, 0.2);
        this.buttonToNoteMap.set(button, predNote);
        // Draw
        this.lookAheadPreds[button] = predNote;
        this.ui.genieCanvas.redraw(this.buttonToNoteMap);
        this.redrawPiano();
      }
    );
  }

  private releaseButton(button: number) {
    const note = this.buttonToNoteMap.get(button);
    this.sampler.keyUp(note);
    this.buttonToNoteMap.delete(button);

    this.lookAheadPreds[button] = -1;
    this.ui.genieCanvas.redraw(this.buttonToNoteMap);
    this.redrawPiano();
  }

  private redrawPiano() {
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
  sampler.load(SALAMANDER_URL)])
  .then(([model, _]) => {
    new SessionRun(model, mcfg, scfg, sampler, ui);
    ui.setReady();
  }
);
