import * as tf from '@tensorflow/tfjs';
import * as tfn from '@tensorflow/tfjs-node';
// import {loadGraphModel} from '@tensorflow/tfjs-converter';
import { PianoGenieUI } from './ui';
const Tone = require('tone')
const PianoSampler = require('tone-piano').Piano;

const SALAMANDER_URL = 'https://storage.googleapis.com/download.magenta.tensorflow.org/demos/SalamanderPiano/';


function convertKeySeq(key: number) {
  const scale = 7
  return 2 * (key / scale) - 1
}


class SessionRun {
  private model: tf.GraphModel;
  private sampler: any;
  private ui: PianoGenieUI;
  private buttonToNoteMap: Map<number, number>;
  private lookAheadPreds!: number[];

  constructor(model: tf.GraphModel, sampler: any, ui: PianoGenieUI) {
    this.model = model;
    this.sampler = sampler;
    this.ui = ui;
    this.buttonToNoteMap = new Map<number, number>();

    // Todo: Refactor
    this.lookAheadPreds = [];
    for (let i = 0; i < 8; ++i) {
        this.lookAheadPreds.push(-1);
    }
    document.onkeydown = (evt: KeyboardEvent) => {
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }
        const key = evt.keyCode;
        let button = key - 49;
        if (button >= 0 && button < 8) {
            if (!this.buttonToNoteMap.has(button)) {
                this.pressButton(button);
            }
        }
    };
    document.onkeyup = (evt: KeyboardEvent) => {
        const key = evt.keyCode;
        let button = key - 49;
        if (button >= 0 && button < 8) {
            if (this.buttonToNoteMap.has(button)) {
                this.releaseButton(button);
            }
        }
    };
  };

  private async predict(keySeq: number[], chordSeq: number []) {
    const encSeq = keySeq.map(convertKeySeq);
    // const output = tf.tidy(() => {
    //   const encSeqT = tf.cast(encSeq, 'float32').expandDims();
    //   const chordSeqT = tf.cast(chordSeq, 'int32').expandDims();
    //   const outputPromise = await this.model.executeAsync([encSeqT,
    //                                                        chordSeqT]);
    //   return await outputPromise.data();
    // });
    let encSeqT = tf.cast(encSeq, 'float32').expandDims();
    let chordSeqT = tf.cast(chordSeq, 'int32').expandDims();
    encSeqT = tf.reshape(encSeqT, [1, 16, 1]);
    // encSeqT = tf.reshape(encSeqT, [1, 16]);
    chordSeqT = tf.reshape(chordSeqT, [1, 16]);

    const inputs: {[name: string]: tf.Tensor} = {};
    inputs['input/enc_pl'] = encSeqT;
    inputs['input/chord_pl'] = chordSeqT;
    // const outputPromise = await this.model.predict([encSeqT,
    //                                                 chordSeqT]);
    // const outputPromise = await this.model.predict(inputs);
    const outputPromise = await this.model.executeAsync(inputs);
    // const outputPromise = await this.model.execute(inputs);
    // const output = await outputPromise.data();
    // const outputArray = Array.prototype.slice.call(output);  // Todo. what is this ?
    // Todo maybe replace tf.argmax
    // console.log(outputArray);
  }

  private pressButton(button: number) {
    // const note = button + 21;
    const note = button + 21 + 39;
    this.buttonToNoteMap.set(button, note);
    this.sampler.keyDown(note, undefined, 0.2);

    const keySeq: number[] = [0, 1, 2, 3, 4, 5, 6, 7,
                              1, 1, 3, 4, 5, 5, 5, 3]
    const chordSeq: number[] = [14, 14, 14, 14, 14, 14, 14, 14,
                                7,  7,  7,  7,  7,  7,  7,  7]
    this.predict(keySeq, chordSeq);

    // Draw
    this.lookAheadPreds[button] = note;
    this.ui.genieCanvas.redraw(this.buttonToNoteMap);
    this.redrawPiano();
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
        const numButtons = 8;

        for (let i = 0; i < numButtons; ++i) {
            const hue = this.ui.genieCanvas.getHue(i);
            if (this.lookAheadPreds !== undefined) {
                noteToHueLightnessMap.set(this.lookAheadPreds[i], [hue, 75]);
            }
        }
        this.ui.pianoCanvas.redraw(noteToHueLightnessMap);
    }
}

const ui = new PianoGenieUI();
const div = document.getElementById('piano-genie-ui');
if (!div) {  
    throw new Error('piano-genie-ui is null.');  
}
div.appendChild(ui.div);
ui.genieCanvas.resize(8);

const sampler = new PianoSampler({ velocities: 4 }).toMaster();
async function load() {
  const model:tf.GraphModel = await tf.loadGraphModel('web_model/model.json');
  await sampler.load(SALAMANDER_URL);
  new SessionRun(model, sampler, ui);
  ui.setReady();
}
load();