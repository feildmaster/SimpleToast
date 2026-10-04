export const version = { major: 3, minor: 0, patch: 0 };
export const versionString = `${version.major}.${version.minor}${version.patch ? `.${version.patch}` : ''}`;
export const versionNumber = version.major * 1000000000 + version.minor * 1000 + version.patch;

function parseVersion(string) {
  const parts = String(string).split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

export function isNewer(string, other) {
  const a = parseVersion(string);
  const b = parseVersion(other);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
