import { createContext, useContext } from 'react';
import type { NavItem } from './feature';

/** Navigation items the signed-in user may see; provided by the app layout. */
export const NavContext = createContext<NavItem[]>([]);
export const useNavItems = (): NavItem[] => useContext(NavContext);
