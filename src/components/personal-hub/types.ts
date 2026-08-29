export const PERSONAL_HUB_TABS = [
  'profile',
  'friends',
  'social',
  'progress',
  'appearance',
  'notifications',
  'settings',
] as const;

export type PersonalHubTab = (typeof PERSONAL_HUB_TABS)[number];

export const isPersonalHubTab = (value: unknown): value is PersonalHubTab =>
  typeof value === 'string' && PERSONAL_HUB_TABS.includes(value as PersonalHubTab);
