import type { Mode } from './state';

export interface ControlHandlers {
  onPlayPause: () => void;
  onReset: () => void;
  onMuteChange: (muted: boolean) => void;
}

const MUTE_KEY = 'helios.muted';

export function bindControls({ onPlayPause, onReset, onMuteChange }: ControlHandlers) {
  const play = document.getElementById('play') as HTMLButtonElement;
  const reset = document.getElementById('reset') as HTMLButtonElement;
  const mute = document.getElementById('mute') as HTMLInputElement;
  const hint = document.getElementById('hint') as HTMLElement;

  play.addEventListener('click', onPlayPause);
  reset.addEventListener('click', onReset);
  bindInfoDialog();

  mute.checked = loadMuted();
  onMuteChange(mute.checked);
  mute.addEventListener('change', () => {
    saveMuted(mute.checked);
    onMuteChange(mute.checked);
  });

  return function update(mode: Mode, bodyCount: number): void {
    play.textContent = mode === 'running' ? 'Pause' : 'Play';
    play.disabled = bodyCount === 0;
    reset.disabled = bodyCount === 0;
    hint.hidden = bodyCount > 0;
  };
}

function bindInfoDialog(): void {
  const info = document.getElementById('info') as HTMLButtonElement;
  const dialog = document.getElementById('info-dialog') as HTMLDialogElement;
  info.addEventListener('click', () => dialog.showModal());
  // Esc and the close button are handled by <dialog>; also close on a backdrop click.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Storage unavailable (private mode etc.); the setting just won't persist.
  }
}
