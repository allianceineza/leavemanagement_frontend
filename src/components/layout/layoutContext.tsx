import { createContext } from "react";

// True when a page is shown inside the sidebar layout, so its old header can hide itself
export const InLayoutContext = createContext(false);