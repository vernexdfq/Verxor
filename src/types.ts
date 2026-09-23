export type Page = 'home' | 'history' | 'fund' | 'services' | 'profile';

export type NavItem = {
  id: Page;
  label: string;
  icon: string;
};
