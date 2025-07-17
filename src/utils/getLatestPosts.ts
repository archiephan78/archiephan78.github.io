import type { CollectionEntry } from "astro:content";

export default (a: CollectionEntry<"blog">, b: CollectionEntry<"blog">) => {
  // First, check if either post is pinned
  const isPinnedA = a.data.isPinned === true;
  const isPinnedB = b.data.isPinned === true;

  // If one is pinned and the other isn't, prioritize the pinned one
  if (isPinnedA && !isPinnedB) {
    return -1;
  }
  if (!isPinnedA && isPinnedB) {
    return 1;
  }

  // If both are pinned or both are not pinned, sort by date
  const pubDateA = new Date(a.data.pubDatetime);
  const pubDateB = new Date(b.data.pubDatetime);
  if (pubDateA < pubDateB) {
    return 1;
  }
  if (pubDateA > pubDateB) {
    return -1;
  }
  return 0;
};
