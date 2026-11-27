import { createContext, useContext, type ReactNode } from 'react';

const DialogToolsContext = createContext<ReactNode>(null);

/** Tools every pop-up window carries in its header, next to «Close» (the app puts the «Report a problem» button here: a pop-up covers the top bar, so the button must be inside it). */
export const DialogToolsProvider = DialogToolsContext.Provider;

export const useDialogTools = (): ReactNode => useContext(DialogToolsContext);
