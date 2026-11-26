import type { TelemetryEvent, TriageBriefRecord } from '../types/aegis';

const DB_NAME = 'aegis_brief_vault_v1';
const DB_VERSION = 1;
const STORE_BRIEFS = 'briefs';
const STORE_TELEMETRY = 'telemetry';

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_BRIEFS)) {
        db.createObjectStore(STORE_BRIEFS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TELEMETRY)) {
        db.createObjectStore(STORE_TELEMETRY, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBriefLocal(record: TriageBriefRecord): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BRIEFS, 'readwrite');
    tx.objectStore(STORE_BRIEFS).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listBriefsLocal(): Promise<TriageBriefRecord[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BRIEFS, 'readonly');
    const req = tx.objectStore(STORE_BRIEFS).getAll();
    req.onsuccess = () => {
      const rows = (req.result as TriageBriefRecord[]) || [];
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBriefLocal(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BRIEFS, 'readwrite');
    tx.objectStore(STORE_BRIEFS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveTelemetryLocal(event: TelemetryEvent): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TELEMETRY, 'readwrite');
    tx.objectStore(STORE_TELEMETRY).put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listTelemetryLocal(): Promise<TelemetryEvent[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TELEMETRY, 'readonly');
    const req = tx.objectStore(STORE_TELEMETRY).getAll();
    req.onsuccess = () => {
      const rows = (req.result as TelemetryEvent[]) || [];
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}
