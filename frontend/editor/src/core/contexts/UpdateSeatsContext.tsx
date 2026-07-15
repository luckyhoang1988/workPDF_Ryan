import React, { createContext, useContext, ReactNode, useMemo } from "react";

interface UpdateSeatsContextValue {
  openUpdateSeats: () => void;
  closeUpdateSeats: () => void;
  isOpen: boolean;
}

const UpdateSeatsContext = createContext<UpdateSeatsContextValue | undefined>(
  undefined,
);

export function UpdateSeatsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<UpdateSeatsContextValue>(
    () => ({
      openUpdateSeats: () => {},
      closeUpdateSeats: () => {},
      isOpen: false,
    }),
    [],
  );

  return (
    <UpdateSeatsContext.Provider value={value}>
      {children}
    </UpdateSeatsContext.Provider>
  );
}

export function useUpdateSeats(): UpdateSeatsContextValue {
  const context = useContext(UpdateSeatsContext);
  if (!context) {
    throw new Error("useUpdateSeats must be used within UpdateSeatsProvider");
  }
  return context;
}
