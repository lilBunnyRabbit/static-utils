import { JsonState, useJsonState } from "@/hooks/use-json-state";
import React from "react";

export interface NavbarContextProps {
  showInfo: JsonState<boolean>;
}

export const NavbarContext = React.createContext<NavbarContextProps | null>(null);

export interface NavbarProviderProps {
  children: React.ReactNode;
}

export const NavbarProvider: React.FC<NavbarProviderProps> = ({ children }) => {
  const showInfo = useJsonState(false);

  return <NavbarContext.Provider value={{ showInfo }} children={children} />;
};

export const useNavbar = () => {
  const context = React.useContext(NavbarContext);
  if (!context) {
    throw new Error(`${useNavbar.name} must be used within ${NavbarProvider.name}`);
  }

  return context;
};
