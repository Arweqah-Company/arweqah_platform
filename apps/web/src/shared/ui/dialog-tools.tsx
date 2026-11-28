import { createContext, useContext, type ReactNode } from 'react';

const DialogToolsContext = createContext<ReactNode>(null);

/** Tools every pop-up window carries in the corner of the screen, where the page has them (the app puts the «Report a problem» button here: a pop-up covers the page, so the button must be inside it). The box takes no clicks, so a tool needs `pointer-events-auto`. */
export const DialogToolsProvider = DialogToolsContext.Provider;

export const useDialogTools = (): ReactNode => useContext(DialogToolsContext);
