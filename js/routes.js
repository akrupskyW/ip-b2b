/**
 * Single source of truth for workspace + sidebar navigation and hash routes.
 * Top nav shows `workspaceRoutes` only; sidebar adds saved views + account links.
 */
export const defaultRouteId = 'dashboard';

/** Primary modules (top bar + sidebar “Workspaces”) */
export const workspaceRoutes = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'wiseowl', label: 'WISEowl', icon: 'chat' },
  { id: 'products', label: 'Products', icon: 'inventory_2', count: '1,248' },
  { id: 'ingredients', label: 'Ingredients', icon: 'science', count: '9,420' },
  { id: 'processing', label: 'Processing', icon: 'precision_manufacturing' },
  { id: 'verification', label: 'Verification', icon: 'verified', count: '38' },
  { id: 'compliance', label: 'Compliance', icon: 'policy' },
  { id: 'insights', label: 'Insights', icon: 'insights' },
  { id: 'reports', label: 'Reports', icon: 'summarize' },
];

export const savedViewItems = [
  { label: 'Q2 Risk Audit', view: 'Q2 Risk Audit' },
  { label: 'Supplier Gap Review', view: 'Supplier Gap Review' },
  { label: 'Beverage Portfolio', view: 'Beverage Portfolio' },
];

/** Hash routes `#/settings` — sidebar only (not duplicated in top pills) */
export const accountRoutes = [
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'team', label: 'Team', icon: 'groups' },
];
