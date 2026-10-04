import css from './index.css';
import { install } from './modules/install.js';
import { injectStylesheet } from './modules/stylesheet.js';
import { installTimers } from './modules/timers.js';

install(root, () => {
  injectStylesheet(css);
  installTimers();
});
