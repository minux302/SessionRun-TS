import { ButtonCanvas } from './button_canvas';
import { PianoCanvas } from './piano_canvas';

const SLIDER_MAX_VALUE = 10000;

export class PianoGenieUI {
  readonly div: HTMLDivElement;
  private loadingDiv: HTMLDivElement;
  private contentDiv: HTMLDivElement;
  readonly genieCanvas: ButtonCanvas;
  readonly pianoCanvas: PianoCanvas;

  constructor() {
    this.div = document.createElement('div');

    // Create loading div
    this.loadingDiv = document.createElement('div');
    this.loadingDiv.appendChild(document.createTextNode('Loading...'));

    // Create content div
    this.contentDiv = document.createElement('div');

    // Create button/piano interfaces
    this.genieCanvas = new ButtonCanvas(this.contentDiv);
    this.pianoCanvas = new PianoCanvas(this.contentDiv);

    // Add loading/content divs to master
    this.contentDiv.style.display = 'none';
    this.div.appendChild(this.loadingDiv);
    this.div.appendChild(this.contentDiv);
  }

  setLoading() {
    this.loadingDiv.style.display = 'block';
    this.contentDiv.style.display = 'none';
  }

  setReady() {
    this.loadingDiv.style.display = 'none';
    this.contentDiv.style.display = 'block';
  }
}
