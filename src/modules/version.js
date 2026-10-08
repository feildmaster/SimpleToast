import version from 'package-version';

/** @param {string | number | undefined} string */
function parse(string) {
  const [one = 0, two = 0, three = 0] = String(string).split('.').map((part) => Number(part) || 0);
  return [one, two, three];
}

const [major, minor, patch] = parse(version);

export const versionString = `${major}.${minor}.${patch}`;
export const versionNumber = major * 1000000000 + minor * 1000 + patch;

/**
 * @param {string} string
 * @param {string | undefined} other
 */
export function isNewer(string, other) {
  const [a, b] = [parse(string), parse(other)];
  const index = a.findIndex((part, i) => part !== b[i]);
  return index >= 0 && a[index] > b[index];
}
