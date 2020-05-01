//import * as tf from '@tensorflow/tfjs-core';
import * as PianoGenieModel from './model';
import { PianoGenieUI } from './ui';
import { ALL_CONFIGS, DEFAULT_CFG_NAME, PianoGenieConfig } from './configs';
//import { LSTMState, LSTMStateUtil } from './lstm_state';
//import * as Sample from './sample';
const Tone = require('tone')
// import * as Tone from 'tone';
// tslint:disable-next-line:no-require-imports
const PianoSampler = require('tone-piano').Piano;

const SALAMANDER_URL = 'https://storage.googleapis.com/download.magenta.tensorflow.org/demos/SalamanderPiano/';

class PianoGenie {
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

const ui = new PianoGenieUI();
const div = document.getElementById('piano-genie-ui');
if (!div) {  
    throw new Error('piano-genie-ui is null.');  
}
div.appendChild(ui.div);

const defaultCfg = ALL_CONFIGS[DEFAULT_CFG_NAME];
ui.genieCanvas.resize(defaultCfg.modelCfg.getNumButtons());
ui.setUserParameters(defaultCfg.defaultUserParameters);

const sampler = new PianoSampler({ velocities: 4 }).toMaster();

Promise.all([
  sampler.load(SALAMANDER_URL)])
  .then(() => {
    new PianoGenie(sampler, ui);
    ui.setReady();
  });
