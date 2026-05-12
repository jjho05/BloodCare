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

export class BloodCareDB extends Dexie {
  glucose!: Table<GlucoseOffline>;
  meals!: Table<MealOffline>;

  constructor() {
    super('BloodCareLocalDB');
    this.version(1).stores({
      glucose: '++id, user_id, timestamp, synced',
      meals: '++id, user_id, timestamp, synced'
    });
  }
}

export const db = new BloodCareDB();
