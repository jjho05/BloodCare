import Dexie, { type Table } from 'dexie';

export interface GlucoseOffline {
  id?: number;
  user_id: number;
  value: number;
  timestamp: string;
  note: string;
  synced: number; // 0: no, 1: si
}

export interface MealOffline {
  id?: number;
  user_id: number;
  food_name: string;
  carbs_g: number;
  timestamp: string;
  synced: number;
}

export interface UserSettings {
  id?: number;
  name: string;
  target_min: number;
  target_max: number;
  avatar_url?: string;
}

export class BloodCareDB extends Dexie {
  glucose!: Table<GlucoseOffline>;
  meals!: Table<MealOffline>;
  settings!: Table<UserSettings>;

  constructor() {
    super('BloodCareLocalDB');
    this.version(2).stores({
      glucose: '++id, user_id, timestamp, synced',
      meals: '++id, user_id, timestamp, synced',
      settings: '++id'
    });
  }
}

export const db = new BloodCareDB();
