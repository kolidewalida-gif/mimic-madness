export interface RhythmoTimelineWord {
  start: number;
  end: number;
}

export const sanitizeRhythmoLeadSeconds = (leadSeconds: number): number =>
  Number.isFinite(leadSeconds) ? Math.max(0, leadSeconds) : 0;

/**
 * Time used by every visual decision in the strip. A positive lead makes a
 * word reach the playhead before its audio timestamp, giving the player time
 * to pronounce it without desynchronizing from `video.currentTime`.
 */
export const getRhythmoTimelineTime = (
  currentTime: number,
  leadSeconds = 0,
): number => {
  const safeCurrentTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
  return safeCurrentTime + sanitizeRhythmoLeadSeconds(leadSeconds);
};

export const getRhythmoStripOffset = (
  playhead: number,
  timelineTime: number,
  pxPerSecond: number,
): number => {
  const safePlayhead = Number.isFinite(playhead) ? playhead : 0;
  const safeTime = Number.isFinite(timelineTime) ? Math.max(0, timelineTime) : 0;
  const safeSpeed = Number.isFinite(pxPerSecond) ? Math.max(0, pxPerSecond) : 0;
  return safePlayhead - safeTime * safeSpeed;
};

/** Find the word under the playhead, including after a backwards seek. */
export const findActiveRhythmoWord = (
  words: readonly RhythmoTimelineWord[],
  time: number,
  previousIndex = -1,
): number => {
  const from = Number.isInteger(previousIndex) && previousIndex >= 0
    ? Math.min(previousIndex, words.length)
    : 0;

  for (let index = from; index < words.length; index += 1) {
    const word = words[index];
    if (time < word.start) break;
    if (time <= word.end) return index;
  }

  for (let index = 0; index < from; index += 1) {
    const word = words[index];
    if (time >= word.start && time <= word.end) return index;
  }

  return -1;
};
