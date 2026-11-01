import { useEffect, useState } from 'react';

/**
 * False during the server render and the browser's first (hydrating) render, true after.
 *
 * The server renders every page logged out: its store has neither the auth info nor the current
 * user. The browser loads both before hydrating (src/index.js). Anything that depends on who is
 * logged in should wait for this flag, so the first browser render matches the server HTML and
 * React doesn't throw away the page with a hydration error.
 *
 * @returns {boolean}
 */
export const useMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
};

export default useMounted;
