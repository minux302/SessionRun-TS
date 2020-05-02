import * as tf from '@tensorflow/tfjs';
import * as tfn from '@tensorflow/tfjs-node';
// import {loadGraphModel} from '@tensorflow/tfjs-converter';
import { PianoGenieUI } from './ui';
const Tone = require('tone')
const PianoSampler = require('tone-piano').Piano;

const SALAMANDER_URL = 'https://storage.googleapis.com/download.magenta.tensorflow.org/demos/SalamanderPiano/';

class SessionRun {
    private sampler: any;
    private ui: PianoGenieUI;
    private buttonToNoteMap: Map<number, number>;
    private lookAheadPreds!: number[];

    constructor(sampler: any, ui: PianoGenieUI) {
        this.sampler = sampler;
        this.ui = ui;
        this.buttonToNoteMap = new Map<number, number>();

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

    private pressButton(button: number) {
        // const note = button + 21;
        const note = button + 21 + 39;
        this.buttonToNoteMap.set(button, note);
        this.sampler.keyDown(note, undefined, 0.2);

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

window.onload = () => {
  const ui = new PianoGenieUI();
  const div = document.getElementById('piano-genie-ui');
  if (!div) {  
      throw new Error('piano-genie-ui is null.');  
  }
  div.appendChild(ui.div);
  ui.genieCanvas.resize(8);

  const sampler = new PianoSampler({ velocities: 4 }).toMaster();
  let model;
  Promise.all([
    model = tf.loadGraphModel('web_model/model.json'),
    sampler.load(SALAMANDER_URL)])
    .then(() => {
      new SessionRun(sampler, ui);
      ui.setReady();
    }
  );
}