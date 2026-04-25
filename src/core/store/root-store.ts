import { ParkStore } from './park-store';
import { SessionStore } from './session-store';

export class RootStore {
  session = new SessionStore();
  park = new ParkStore();
}

export const rootStore = new RootStore();
