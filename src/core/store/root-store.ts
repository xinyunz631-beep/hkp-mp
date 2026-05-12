import { AppStore } from './app-store';
import { MemberStore } from './member-store';
import { ParkStore } from './park-store';

export class RootStore {
  app = new AppStore();
  member = new MemberStore();
  park = new ParkStore();
}

export const rootStore = new RootStore();
