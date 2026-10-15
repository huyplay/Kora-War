import { DefenseState, type DefenseSnapshot, type DefenseCue } from './defense-state';
import { icon } from './icons';
import './styles/defense-feedback.css';

export class DefenseFeedback {
  private state = new DefenseState();
  private root = document.createElement('aside');
  private message: HTMLElement;
  private edges: HTMLElement;
  constructor(private sound: (cue: DefenseCue) => void) {
    this.root.className = 'defense-feedback';
    this.root.hidden = true;
    this.root.innerHTML = `<div class="defense-edges" aria-hidden="true" hidden></div><div class="defense-message" hidden>${icon('shield')}<span id="defense-message" role="status" aria-live="polite" aria-atomic="true"></span></div>`;
    this.message = this.root.querySelector('.defense-message')!;
    this.edges = this.root.querySelector('.defense-edges')!;
    document.querySelector('#app main')!.append(this.root);
  }
  update(snapshot: DefenseSnapshot, seconds: number, running: boolean) {
    const frame = this.state.update(snapshot, seconds, running);
    this.root.hidden = !frame.message && !frame.red;
    this.message.hidden = !frame.message;
    this.message.dataset.kind = frame.kind;
    const text = this.message.querySelector('span')!;
    if (text.textContent !== frame.message) text.textContent = frame.message;
    this.edges.hidden = !frame.red;
    document.body.classList.toggle('defense-warning-active', !!frame.message);
    document.querySelector('.base-health.ally')?.classList.toggle('core-under-attack', frame.red);
    if (frame.cue) this.sound(frame.cue);
  }
  reset() {
    this.state.reset();
    this.root.hidden = true;
    this.edges.hidden = this.message.hidden = true;
    this.message.querySelector('span')!.textContent = '';
    document.body.classList.remove('defense-warning-active');
    document.querySelector('.base-health.ally')?.classList.remove('core-under-attack');
  }
  dispose() {
    this.reset();
    this.root.remove();
  }
}
