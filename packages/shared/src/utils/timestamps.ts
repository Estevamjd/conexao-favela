import type { FirestoreTimestamp } from '../types';

export function timestampFromDate(date: Date): FirestoreTimestamp {
  const milliseconds = date.getTime();

  return {
    nanoseconds: (milliseconds % 1000) * 1_000_000,
    seconds: Math.floor(milliseconds / 1000),
    toDate: () => date,
  };
}

export function reviveTimestamp(timestamp: FirestoreTimestamp): FirestoreTimestamp {
  if (typeof timestamp.toDate === 'function') {
    return timestamp;
  }

  const milliseconds = timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1_000_000);
  const date = new Date(milliseconds);

  return {
    nanoseconds: timestamp.nanoseconds,
    seconds: timestamp.seconds,
    toDate: () => date,
  };
}
