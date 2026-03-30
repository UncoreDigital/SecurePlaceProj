"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface LocationContextValue {
  selectedLocationId: string;
  selectedLocationName: string;
  setSelectedLocation: (id: string, name: string) => void;
}

const LocationContext = createContext<LocationContextValue>({
  selectedLocationId: "",
  selectedLocationName: "",
  setSelectedLocation: () => {},
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedLocationId, setId] = useState("");
  const [selectedLocationName, setName] = useState("");

  const setSelectedLocation = (id: string, name: string) => {
    setId(id);
    setName(name);
  };

  return (
    <LocationContext.Provider value={{ selectedLocationId, selectedLocationName, setSelectedLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
