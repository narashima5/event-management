import admin from 'firebase-admin';
import { config } from '../config';

// Interface definitions to unify Real Firestore and Local Mock Firestore
export interface QueryDocSnapshot<T = any> {
  id: string;
  exists: boolean;
  data: () => T;
}

export interface QuerySnapshot<T = any> {
  docs: QueryDocSnapshot<T>[];
  empty: boolean;
  size: number;
  forEach: (callback: (doc: QueryDocSnapshot<T>) => void) => void;
}

class LocalQuery<T = any> {
  private collectionName: string;
  private filters: Array<{ field: string; op: string; value: any }> = [];
  private orderField?: string;
  private orderDirection: 'asc' | 'desc' = 'asc';
  private limitCount?: number;
  private store: Map<string, Map<string, any>>;

  constructor(collectionName: string, store: Map<string, Map<string, any>>) {
    this.collectionName = collectionName;
    this.store = store;
  }

  where(field: string, op: string, value: any): LocalQuery<T> {
    const q = new LocalQuery<T>(this.collectionName, this.store);
    q.filters = [...this.filters, { field, op, value }];
    q.orderField = this.orderField;
    q.orderDirection = this.orderDirection;
    q.limitCount = this.limitCount;
    return q;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): LocalQuery<T> {
    const q = new LocalQuery<T>(this.collectionName, this.store);
    q.filters = [...this.filters];
    q.orderField = field;
    q.orderDirection = direction;
    q.limitCount = this.limitCount;
    return q;
  }

  limit(count: number): LocalQuery<T> {
    const q = new LocalQuery<T>(this.collectionName, this.store);
    q.filters = [...this.filters];
    q.orderField = this.orderField;
    q.orderDirection = this.orderDirection;
    q.limitCount = count;
    return q;
  }

  async get(): Promise<QuerySnapshot<T>> {
    const col = this.store.get(this.collectionName) || new Map<string, any>();
    let docs = Array.from(col.entries()).map(([id, data]) => ({
      id,
      ...JSON.parse(JSON.stringify(data)),
    }));

    for (const filter of this.filters) {
      docs = docs.filter((doc) => {
        const val = (doc as any)[filter.field];
        if (filter.op === '==') return val === filter.value;
        if (filter.op === '!=') return val !== filter.value;
        if (filter.op === 'in') return Array.isArray(filter.value) && filter.value.includes(val);
        if (filter.op === '>=') return val >= filter.value;
        if (filter.op === '<=') return val <= filter.value;
        if (filter.op === '>') return val > filter.value;
        if (filter.op === '<') return val < filter.value;
        if (filter.op === 'array-contains') return Array.isArray(val) && val.includes(filter.value);
        return true;
      });
    }

    if (this.orderField) {
      const field = this.orderField;
      const dir = this.orderDirection === 'desc' ? -1 : 1;
      docs.sort((a, b) => {
        const valA = (a as any)[field];
        const valB = (b as any)[field];
        if (valA === valB) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        return valA > valB ? dir : -dir;
      });
    }

    if (this.limitCount && this.limitCount > 0) {
      docs = docs.slice(0, this.limitCount);
    }

    const docSnapshots: QueryDocSnapshot<T>[] = docs.map((item) => {
      return {
        id: item.id,
        exists: true,
        data: () => ({ ...item }) as T,
      };
    });

    return {
      docs: docSnapshots,
      empty: docSnapshots.length === 0,
      size: docSnapshots.length,
      forEach: (cb) => docSnapshots.forEach(cb),
    };
  }
}

class LocalDocRef<T = any> {
  private collectionName: string;
  private docId: string;
  private store: Map<string, Map<string, any>>;

  constructor(collectionName: string, docId: string, store: Map<string, Map<string, any>>) {
    this.collectionName = collectionName;
    this.docId = docId;
    this.store = store;
  }

  get id() {
    return this.docId;
  }

  async get(): Promise<QueryDocSnapshot<T>> {
    const col = this.store.get(this.collectionName);
    const data = col ? col.get(this.docId) : undefined;
    return {
      id: this.docId,
      exists: data !== undefined,
      data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined) as T,
    };
  }

  async set(data: any, options?: { merge?: boolean }): Promise<void> {
    if (!this.store.has(this.collectionName)) {
      this.store.set(this.collectionName, new Map());
    }
    const col = this.store.get(this.collectionName)!;
    if (options?.merge && col.has(this.docId)) {
      const existing = col.get(this.docId);
      col.set(this.docId, { ...existing, ...data });
    } else {
      col.set(this.docId, { ...data });
    }
  }

  async update(data: any): Promise<void> {
    const col = this.store.get(this.collectionName);
    if (!col || !col.has(this.docId)) {
      throw new Error(`NOT_FOUND: Document ${this.docId} not found in ${this.collectionName}`);
    }
    const existing = col.get(this.docId);
    col.set(this.docId, { ...existing, ...data });
  }

  async delete(): Promise<void> {
    const col = this.store.get(this.collectionName);
    if (col) {
      col.delete(this.docId);
    }
  }
}

class LocalCollectionRef<T = any> extends LocalQuery<T> {
  private colName: string;
  private dbStore: Map<string, Map<string, any>>;

  constructor(collectionName: string, store: Map<string, Map<string, any>>) {
    super(collectionName, store);
    this.colName = collectionName;
    this.dbStore = store;
  }

  doc(id?: string): LocalDocRef<T> {
    const docId = id || Math.random().toString(36).substring(2, 11);
    return new LocalDocRef<T>(this.colName, docId, this.dbStore);
  }

  async add(data: any): Promise<LocalDocRef<T>> {
    const docRef = this.doc();
    await docRef.set(data);
    return docRef;
  }
}

class LocalFirestore {
  public store = new Map<string, Map<string, any>>();

  collection<T = any>(name: string): LocalCollectionRef<T> {
    return new LocalCollectionRef<T>(name, this.store);
  }

  async runTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
    const transaction = {
      get: async (ref: any) => ref.get(),
      set: (ref: any, data: any, opts?: any) => ref.set(data, opts),
      update: (ref: any, data: any) => ref.update(data),
      delete: (ref: any) => ref.delete(),
    };
    return await updateFunction(transaction);
  }

  batch() {
    const operations: Array<() => Promise<void>> = [];
    return {
      set: (ref: any, data: any, opts?: any) => {
        operations.push(() => ref.set(data, opts));
      },
      update: (ref: any, data: any) => {
        operations.push(() => ref.update(data));
      },
      delete: (ref: any) => {
        operations.push(() => ref.delete());
      },
      commit: async () => {
        for (const op of operations) {
          await op();
        }
      },
    };
  }

  clear() {
    this.store.clear();
  }
}

// Global local store instance
export const localFirestore = new LocalFirestore();

let firestoreInstance: any = null;
let authInstance: any = null;

export function initFirebase() {
  if (config.useLocalStore) {
    console.log('⚡ Firebase initialized in Local In-Memory Store mode (Zero GCP setup required)');
    return {
      db: localFirestore,
      auth: {
        verifyIdToken: async (token: string) => {
          throw new Error('Using local auth handler');
        },
      },
    };
  }

  try {
    if (!admin.apps.length) {
      if (config.firebase.clientEmail && config.firebase.privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            clientEmail: config.firebase.clientEmail,
            privateKey: config.firebase.privateKey,
          }),
        });
      } else {
        admin.initializeApp({
          projectId: config.firebase.projectId,
        });
      }
    }
    firestoreInstance = admin.firestore();
    authInstance = admin.auth();
    console.log('✅ Connected to live Firebase Admin SDK & Cloud Firestore');
  } catch (err) {
    console.warn('⚠️ Live Firebase Admin initialization failed, falling back to Local Store:', err);
    return {
      db: localFirestore,
      auth: null,
    };
  }

  return {
    db: firestoreInstance,
    auth: authInstance,
  };
}

export function getDb(): any {
  if (config.useLocalStore || !firestoreInstance) {
    return localFirestore;
  }
  return firestoreInstance;
}

export function getAuth(): any {
  if (config.useLocalStore || !authInstance) {
    return null;
  }
  return authInstance;
}
