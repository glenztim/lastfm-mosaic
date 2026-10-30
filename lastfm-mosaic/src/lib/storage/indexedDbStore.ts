import type { Scrobble } from "../types";
import type { CacheMeta, ScrobbleStore } from "./types";

const DB_NAME = "lastfm-mosaic";
// v2 added the metadata store. Entries written by v1 have no metadata and are treated as absent.
const DB_VERSION = 2;
const SCROBBLES = "scrobbles";
const META = "meta";

const key = (user: string) => user.trim().toLowerCase();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      for (const name of [SCROBBLES, META]) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Runs `work` in one transaction over both stores and resolves when the transaction completes. */
async function transact(
  mode: IDBTransactionMode,
  work: (scrobbles: IDBObjectStore, meta: IDBObjectStore) => void,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([SCROBBLES, META], mode);
      work(tx.objectStore(SCROBBLES), tx.objectStore(META));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const indexedDbStore: ScrobbleStore = {
  async save(user, scrobbles, meta) {
    await transact("readwrite", (s, m) => {
      s.put(scrobbles, key(user));
      m.put(meta, key(user));
    });
  },
  async load(user) {
    let scrobbles: Scrobble[] | undefined;
    let meta: CacheMeta | undefined;
    await transact("readonly", (s, m) => {
      s.get(key(user)).onsuccess = (e) => (scrobbles = (e.target as IDBRequest).result);
      m.get(key(user)).onsuccess = (e) => (meta = (e.target as IDBRequest).result);
    });
    return scrobbles && meta ? { scrobbles, meta } : undefined;
  },
  async clear() {
    await transact("readwrite", (s, m) => {
      s.clear();
      m.clear();
    });
  },
};
