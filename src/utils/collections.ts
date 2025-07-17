import { COLLECTIONS, type Collection } from "@/constants";
export type { Collection };

// Helper function để lấy collection từ folder
export function getCollectionFromFolder(
  folder: string
): Collection | undefined {
  return COLLECTIONS.find(collection => collection.folder === folder);
}

// Helper function để lấy tất cả collections
export function getAllCollections(): Collection[] {
  return COLLECTIONS;
}
