import { ParkStore } from './park-store';
import { SessionStore } from './session-store';
import { UiStore } from './ui-store';

export class RootStore {
  session = new SessionStore();
  park = new ParkStore();
  ui = new UiStore();
}

export const rootStore = new RootStore();
