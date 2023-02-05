/**
 * @param alpha 0-100
 * @returns 00 - FF
 */
export const alphaToHex = (alpha: number): string => {
  return Math.round(255 * (alpha / 100))
    .toString(16)
    .padStart(2, "0");
};
