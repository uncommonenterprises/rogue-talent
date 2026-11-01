import { useEffect, useState } from 'react';

// The discovery and booking journey switches between its phone layout (sheets, bottom bar) and
// its desktop layout (sidebar, popovers, sticky panel) at 900px (docs/design/booking-journey).
export const PHONE_LAYOUT_MAX_WIDTH = 899;

/**
 * True below 900px, false from 900px, null until mounted (the server cannot know the width).
 * Use it only for things that cannot be done with CSS alone (e.g. popover vs sheet behaviour).
 *
 * @returns {boolean|null}
 */
export const useIsPhoneLayout = () => {
  const [isPhone, setIsPhone] = useState(null);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }
    const mql = window.matchMedia(`(max-width: ${PHONE_LAYOUT_MAX_WIDTH}px)`);
    const update = () => setIsPhone(mql.matches);
    update();
    if (mql.addEventListener) {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    }
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, []);
  return isPhone;
};
