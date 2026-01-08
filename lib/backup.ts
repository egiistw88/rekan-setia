import type Dexie from "dexie";
import { formatNowWib } from "@/lib/time";

export type BackupPayload = {
  app: "rekan-setia";
  version: number;
  exportedAtIso: string;
  exportedAtWib: string;
  tables: Record<string, any[]>;
};

export type ImportMode = "replace" | "merge";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const exportBackup = async (db: Dexie): Promise<BackupPayload> => {
  const tables: Record<string, any[]> = {};
  for (const table of db.tables) {
    tables[table.name] = await table.toArray();
  }

  const now = new Date();
  return {
    app: "rekan-setia",
    version: 1,
    exportedAtIso: now.toISOString(),
    exportedAtWib: formatNowWib(),
    tables,
  };
};

export const importBackup = async (
  db: Dexie,
  payload: BackupPayload,
  mode: ImportMode,
): Promise<{ tablesImported: string[] }> => {
  if (!payload || payload.app !== "rekan-setia") {
    throw new Error("Ini bukan backup Rekan Setia.");
  }
  if (typeof payload.version !== "number" || payload.version < 1) {
    throw new Error("Format backup tidak valid.");
  }
  if (!isRecord(payload.tables)) {
    throw new Error("Format backup tidak valid.");
  }

  const dbTableNames = db.tables.map((table) => table.name);
  const tablesToImport = Object.keys(payload.tables).filter((name) =>
    dbTableNames.includes(name),
  );
  if (tablesToImport.length === 0) {
    return { tablesImported: [] };
  }

  const tableRefs = tablesToImport.map((name) => db.table(name));
  await db.transaction("rw", tableRefs, async () => {
    for (const tableName of tablesToImport) {
      const table = db.table(tableName);
      const rows = payload.tables[tableName];
      if (!Array.isArray(rows)) {
        throw new Error("Format backup tidak valid.");
      }
      if (mode === "replace") {
        await table.clear();
      }
      if (rows.length > 0) {
        await table.bulkPut(rows);
      }
    }
  });

  return { tablesImported: tablesToImport };
};
