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
  kcal: number;
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

export interface CustomFood {
  id?: number;
  nombre: string;
  calorias_kcal: number;
  porcion: string;
  alias: string[];
}

export class BloodCareDB extends Dexie {
  glucose!: Table<GlucoseOffline>;
  meals!: Table<MealOffline>;
  settings!: Table<UserSettings>;
  customFoods!: Table<CustomFood>;

  constructor() {
    super('BloodCareLocalDB');
    this.version(3).stores({
      glucose: '++id, user_id, timestamp, synced',
      meals: '++id, user_id, timestamp, synced',
      settings: '++id',
      customFoods: '++id, nombre, *alias'
    });
  }
}

export const db = new BloodCareDB();
