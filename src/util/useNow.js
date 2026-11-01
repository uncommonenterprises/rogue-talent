import { useEffect, useState } from 'react';

/**
 * The current time, but only once the page has mounted in the browser (null during the server
 * render and hydration). Use it for "47 hours left" style counts, so the server's HTML and the
 * browser's first render always match. Updates every minute by default.
 *
 * @param {number} [intervalMs]
 * @returns {number|null} milliseconds since epoch, or null before mount
 */
export const useNow = (intervalMs = 60 * 1000) => {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

export default useNow;
