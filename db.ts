
import Dexie, { type Table } from 'dexie';
import { SavedGame, User } from '../types';

export class ForgeDB extends Dexie {
  games!: Table<SavedGame>;
  users!: Table<User>;

  constructor() {
    super('ForgeDatabase');
    (this as any).version(3).stores({
      games: 'id, timestamp, title',
      users: 'id, username, googleId'
    });
  }
}

export const db = new ForgeDB();
