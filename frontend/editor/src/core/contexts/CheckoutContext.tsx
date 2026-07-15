import React, { createContext, useContext, ReactNode, useMemo } from "react";

interface CheckoutContextValue {
  openCheckout: () => void;
  closeCheckout: () => void;
  isOpen: boolean;
}

const CheckoutContext = createContext<CheckoutContextValue | undefined>(
  undefined,
);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const value = useMemo<CheckoutContextValue>(
    () => ({
      openCheckout: () => {},
      closeCheckout: () => {},
      isOpen: false,
    }),
    [],
  );

  return (
    <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
  );
}

export function useCheckout(): CheckoutContextValue {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within CheckoutProvider");
  }
  return context;
}
