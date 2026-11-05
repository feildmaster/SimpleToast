import { initRoot } from './root.js';
import Toast from './toast.js';
import { isNewer, versionString } from './version.js';

/**
 * @param {Toast} [current]
 */
function shouldReplace(current) {
  return !current?.versionString || isNewer(versionString, current.versionString);
}

/**
 * @param {Window} root
 * @param {() => void} [setup]
 */
export function install(root, setup) {
  const bound = window.SimpleToast;
  initRoot();
  if (setup) setup();
  if (shouldReplace(root.SimpleToast)) root.SimpleToast = Toast;
  console.log(`SimpleToast(v${versionString}): Loaded`);
  if (window === window.top && shouldReplace(bound)) {
    window.SimpleToast = Toast;
    console.log(`SimpleToast(v${versionString}): Publicized`);
  }
}
