// Slim bridge for ad-hoc demo scripts that fire notifications without going
// through React. Phase 4 can delete this once notification triggers are routed
// through imported actions only.

import EFActions from './core/actions.js'

window.efNotify = EFActions.notify
