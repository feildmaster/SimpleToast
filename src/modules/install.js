import { initRoot } from './root.js';
import Toast from './toast.js';
import { isNewer, versionString } from './version.js';

export function install(root, setup) {
  if (window !== window.top) return;
  const bound = window.SimpleToast;
  initRoot();
  if (setup) setup();
  if (root !== window) root.SimpleToast = Toast;
  console.log(`SimpleToast(v${versionString}): Loaded`);
  if (!bound?.versionString || isNewer(versionString, bound.versionString)) {
    window.SimpleToast = Toast;
    console.log(`SimpleToast(v${versionString}): Publicized`);
  }
}
