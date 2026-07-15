/**
 * The local "My Files" cache (IndexedDB, see indexedDBManager.ts) lives in
 * one database per browser profile, not per account — the backend already
 * scopes /api/v1/storage/files per owner, but on a shared machine a second
 * person signing in would otherwise still see the previous user's cached
 * file list. This guard wipes that cache whenever the signed-in user id
 * changes, and forgets it on explicit sign-out.
 */
import { fileStorage } from "@app/services/fileStorage";
import { folderStorage } from "@app/services/folderStorage";

const OWNER_KEY = "ryanpdf_local_files_owner";

async function clearLocalFileCache(): Promise<void> {
  await Promise.all([fileStorage.clearAll(), folderStorage.clearAll()]);
}

/**
 * Call whenever the authenticated user id becomes known (auth init, auth
 * state change). Clears the local file/folder cache if it was last written
 * by a different user id than the one now signed in.
 */
export async function enforceLocalFileOwnership(
  userId: string | null,
): Promise<void> {
  if (typeof window === "undefined" || !userId) return;

  const lastOwner = window.localStorage.getItem(OWNER_KEY);
  if (lastOwner && lastOwner !== userId) {
    console.warn(
      "[FileOwnershipGuard] Signed-in user changed on this device; clearing local file cache.",
    );
    await clearLocalFileCache();
  }
  window.localStorage.setItem(OWNER_KEY, userId);
}

/** Call on explicit sign-out so the next person on this device starts clean. */
export async function clearLocalFileOwnership(): Promise<void> {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(OWNER_KEY);
  }
  await clearLocalFileCache();
}
