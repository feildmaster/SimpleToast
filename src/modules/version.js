import version from 'package-version';

function parse(string) {
  const [one, two, three] = String(string).split('.').map(Number);
  return [one, two, three];
}

const [major, minor, patch] = parse(version);

export const versionString = `${major}.${minor}.${patch}`;
export const versionNumber = major * 1000000000 + minor * 1000 + patch;

export function isNewer(string, other) {
  const [a, b] = [parse(string), parse(other)];
  const index = a.findIndex((part, i) => part !== b[i]);
  return index >= 0 && a[index] > b[index];
}
