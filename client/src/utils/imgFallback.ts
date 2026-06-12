import { SyntheticEvent } from 'react';

export const FALLBACK_IMAGE = '/fallback.png';

/** Swap a broken image for the local fallback. Guards against an infinite
 *  error loop if fallback.png itself ever fails. */
export const onImgError = (e: SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  if (img.src.endsWith('fallback.png')) return;
  img.src = FALLBACK_IMAGE;
};
