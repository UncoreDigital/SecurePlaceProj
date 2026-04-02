"use client";

import { useState, useEffect } from "react";
import { Bell, Headphones, Menu, X, Mail, Phone, MapPin, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { useLocation } from "@/context/LocationContext";

interface Location { id: string; name: string; }
interface HeaderProps { toggleSidebar: () => void; }

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { user, loading } = useUser();
  const { setSelectedLocation: setGlobalLocation } = useLocation();

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [loadingLocations, setLoadingLocations] = useState(false);

  const isFirmAdmin = user?.role === "firm_admin" && user.isAllLocationAdmin;

  // Fetch locations for this firm
  useEffect(() => {
    if (!user || !isFirmAdmin || !user.firmId) return;
    let cancelled = false;
    setLoadingLocations(true);

    fetch(`/api/locations?firm_id=${user.firmId}`)
      .then(r => r.json())
      .then((data: Location[]) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setLocations(list);
        if (list.length > 0) {
          setSelectedLocation(list[0].id);
          setGlobalLocation(list[0].id, list[0].name);
        }
        setLoadingLocations(false);
      })
      .catch(() => { if (!cancelled) setLoadingLocations(false); });

    return () => { cancelled = true; };
  }, [user, isFirmAdmin]);

  const handleLocationChange = (id: string) => {
    const loc = locations.find(l => l.id === id);
    setSelectedLocation(id);
    setGlobalLocation(id, loc?.name ?? "");
  };

  let displayName = user?.fullName || user?.email?.split("@")[0] || "Admin";
  displayName = displayName?.toLowerCase()?.trim()?.split(" ")
    ?.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").trim();
  const roleLabel = user?.role?.toLowerCase()?.trim()?.split("_")
    ?.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "—";

  return (
    <header className="flex items-center justify-between h-20 px-6 bg-white border-b">
      {/* Left side */}
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden mr-4" aria-label="Toggle sidebar">
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-brand-blue">Dashboard</h1>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-6">

        {/* Location Dropdown — firm admin only */}
        {isFirmAdmin && (
          <div className="relative flex items-center">
            <MapPin className="absolute left-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={selectedLocation}
              onChange={e => handleLocationChange(e.target.value)}
              disabled={loadingLocations}
              aria-label="Select location"
              className="pl-8 pr-7 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent disabled:opacity-50 cursor-pointer"
            >
              {loadingLocations ? (
                <option>Loading...</option>
              ) : locations.length === 0 ? (
                <option value="">No locations</option>
              ) : (
                locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        )}

        <button className="text-slate-500 hover:text-brand-orange transition-colors cursor-pointer" aria-label="Notifications">
          <Bell className="h-6 w-6" />
        </button>
        <button className="text-slate-500 hover:text-brand-orange transition-colors cursor-pointer" aria-label="Support" onClick={() => setShowSupportModal(true)}>
          <Headphones className="h-6 w-6" />
        </button>

        <div className="flex items-center">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt={displayName} />
            <AvatarFallback>
              {displayName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() || "AD"}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 text-left">
            {loading ? (
              <>
                <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-slate-100 rounded mt-1 animate-pulse" />
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-brand-blue">{displayName}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-brand-blue">Contact Us</h2>
              <button onClick={() => setShowSupportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-brand-blue/10 p-3 rounded-full">
                  <Mail className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <a href="mailto:chaplotpratik@gmail.com" className="text-lg font-semibold text-brand-blue hover:text-brand-orange transition-colors">
                    chaplotpratik@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-brand-orange/10 p-3 rounded-full">
                  <Phone className="h-6 w-6 text-brand-orange" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact</p>
                  <a href="tel:+918552859594" className="text-lg font-semibold text-brand-blue hover:text-brand-orange transition-colors">
                    +91 8552859594
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setShowSupportModal(false)} className="bg-brand-blue hover:bg-brand-blue/90">Close</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
