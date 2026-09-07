export type Page = 'home' | 'history' | 'fund' | 'numbers' | 'profile';

export type NavItem = {
  id: Page;
  label: string;
  icon: string;
};
