export function optimisticReactionState(currentType, nextType, count = 0, counts = {}) {
  const nextCounts = { ...counts };

  if (currentType) {
    nextCounts[currentType] = Math.max(0, (nextCounts[currentType] || 0) - 1);
  }
  if (nextType) {
    nextCounts[nextType] = (nextCounts[nextType] || 0) + 1;
  }

  Object.keys(nextCounts).forEach((type) => {
    if (!nextCounts[type]) delete nextCounts[type];
  });

  return {
    reactionType: nextType || null,
    reactionCount: Math.max(0, count + (currentType ? -1 : 0) + (nextType ? 1 : 0)),
    reactionCounts: nextCounts,
  };
}
