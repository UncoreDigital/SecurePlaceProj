"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  safetyClass: {
    id: string;
    title: string;
    duration: number;
    isRemote: boolean;
  };
  firmId: string;
  locations: any[];
}

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface Location {
  id: string;
  name: string;
  address: string;
}

export default function SchedulingModal({ isOpen, onClose, safetyClass, firmId, locations }: SchedulingModalProps) {
  const { user } = useUser(); // Get current logged-in user
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [locationList, setLocationList] = useState<Location[]>(locations || []);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const fetchedRef = useRef(false);
  console.log("Locations on switch", locationList);
  // Fetch locations when modal opens and firmId is present, only once per open
  if (isOpen && firmId && !fetchedRef.current) {
    fetchedRef.current = true;
    setLoadingLocations(true);
    
    // First, test basic table access
    supabase
      .from("locations")
      .select("count", { count: 'exact', head: true })
      .then(({ count, error: countError }) => {
        console.log('📊 Locations table test:', { count, countError });
      });
    
    // Fetch locations function
    const fetchLocations = async () => {
      try {
        // Test basic connection first
        const connectionTest = await supabase.from("locations").select("count", { count: 'exact', head: true });
        
        // Add timeout to the query
        const queryPromise = supabase
          .from("locations")
          .select("id, name, address")
          .eq("firm_id", firmId)
          .eq("is_active", true);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000);
        });
        
        const result = await Promise.race([queryPromise, timeoutPromise]) as any;
        const { data, error } = result;
        
        
        if (error) {
          // Try fetching all locations as a fallback to test table access
          const { data: allData, error: allError } = await supabase
            .from("locations")
            .select("id, name, address, firm_id, is_active")
            .limit(10);
          
          // setLocationList([]);
        } else {
          if (!data || data.length === 0) {
            
            // Check if there are any locations for this firm at all
            const { data: allFirmData, error: allFirmError } = await supabase
              .from("locations")
              .select("id, name, address, is_active")
              .eq("firm_id", firmId);
          }
          // setLocationList(data || []);
        }
      } catch (catchError: any) {
        // Try a simple test query
        try {
          console.log('🔄 Attempting simple test query...');
          const testResult = await supabase.from("locations").select("*").limit(1);
          console.log('🧪 Simple test query result:', testResult);
        } catch (testError) {
          console.error('❌ Even simple test query failed:', testError);
        }
        
        // setLocationList([]);
      } finally {
        setLoadingLocations(false);
      }
    };
    
    fetchLocations();
  }
  // Reset fetchedRef when modal closes
  if (!isOpen && fetchedRef.current) {
    fetchedRef.current = false;
    // setLocationList([]);
    setSelectedLocation("");
  }

  if (!isOpen) return null;

  const timeSlots: TimeSlot[] = [
    { id: "1", time: "09:00 AM TO 10:00 AM", available: true },
    { id: "2", time: "10:00 AM TO 11:00 AM", available: true },
    { id: "3", time: "11:00 AM TO 12:00 PM", available: true },
    { id: "4", time: "02:00 PM TO 03:00 PM", available: true },
    { id: "5", time: "03:00 PM TO 04:00 PM", available: true },
    { id: "6", time: "04:00 PM TO 05:00 PM", available: true },
    { id: "7", time: "07:00 PM TO 08:00 PM", available: true },
  ];

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const isDateAvailable = (date: Date) => {
    // Only allow future dates (today and onwards)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to beginning of day for comparison
    
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    // Check if date is in the past
    if (dateToCheck < today) {
      return false;
    }
    
    // Business logic restrictions
    const dayOfWeek = dateToCheck.getDay();
    
    // Disable Sundays (Sunday = 0)
    if (dayOfWeek === 0) {
      return false;
    }
    
    // Optional: Add holiday restrictions here
    // Optional: Check for existing scheduled classes conflicts here
    
    return true; // Available for scheduling
  };

  const isSelectedDate = (date: Date) => {
    return selectedDate &&
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatSelectedDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getSelectedTimeSlotText = () => {
    const slot = timeSlots.find(s => s.id === selectedTimeSlot);
    return slot ? slot.time : '';
  };

  const getSelectedLocationName = () => {
    const location = locationList.find(l => l.id === selectedLocation);
    return location ? location.name : '';
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (isDateAvailable(newDate)) {
      setSelectedDate(newDate);
    }
  };

  const parseTimeSlot = (date: Date, slot: string) => {
    // Example slot: "09:00 AM TO 10:00 AM"
    const [start, , end] = slot.split(" ");
    const [startTime, startPeriod] = [start, slot.split(" ")[1]];
    const [endTime, endPeriod] = [slot.split(" ")[3], slot.split(" ")[4]];

    // Helper to parse "09:00 AM" to 24h time
    const to24Hour = (time: string, period: string) => {
      let [hours, minutes] = time.split(":").map(Number);
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      return { hours, minutes };
    };

    const { hours: startHours, minutes: startMinutes } = to24Hour(startTime, startPeriod);
    const { hours: endHours, minutes: endMinutes } = to24Hour(endTime, endPeriod);

    const startDate = new Date(date);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(endHours, endMinutes, 0, 0);

    return { startDate, endDate };
  };

  const handleSchedule = async () => {
    if (selectedLocation && selectedDate && selectedTimeSlot) {
      setLoadingLocations(true); // Show loading state
      
      // Show loading toast
      const loadingToast = toast.loading("Scheduling safety class...");
      
      // Get current user ID for created_by field
      const currentUserId = user?.id;
      
      if (!currentUserId) {
        toast.dismiss(loadingToast);
        toast.error("User not authenticated. Please log in again.");
        setLoadingLocations(false);
        return;
      }

      try {
        // Insert scheduling logic here (e.g., call an API or Supabase)
        const slotText = timeSlots.find(s => s.id === selectedTimeSlot)?.time || "";
        const { startDate, endDate } = parseTimeSlot(selectedDate, slotText);

        const { error } = await supabase
          .from("scheduled_classes")
          .insert([
            {
              safety_class_id: safetyClass.id,
              location_id: selectedLocation,
              scheduled_date: selectedDate.toISOString().split("T")[0],
              start_time: startDate.toISOString(),
              end_time: endDate.toISOString(),
              firm_id: firmId,
              created_by: currentUserId,
              created_at: new Date().toISOString(),
              status: "pending",
            },
          ]);
        
        toast.dismiss(loadingToast);
        
        if (!error) {
          console.log('✅ Class scheduled successfully by user:', currentUserId);
          toast.success("Safety class scheduled successfully!", {
            description: `Scheduled for ${selectedDate.toLocaleDateString()} at ${slotText}`,
            duration: 4000,
          });
          router.push('/safety-classes');
          onClose();
        } else {
          console.error('❌ Failed to schedule class:', error);
          toast.error("Failed to schedule safety class", {
            description: error.message,
            duration: 5000,
          });
        }
      } catch (error: any) {
        toast.dismiss(loadingToast);
        console.error('❌ Unexpected error during scheduling:', error);
        toast.error("An unexpected error occurred", {
          description: "Please try again or contact support if the problem persists.",
          duration: 5000,
        });
      } finally {
        setLoadingLocations(false);
      }
    } else {
      toast.error("Please complete all sel and time slot");
    }
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  // Adjust starting day to Monday (0 = Sunday, 1 = Monday, etc.)
  const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-4xl bg-white max-h-[90vh] overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b" style={{ paddingTop: "0px" }}>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Schedule Safety Class</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{safetyClass.title}</p>
              {selectedDate && selectedTimeSlot && (
                <div className="mt-2 text-xs sm:text-sm text-brand-orange font-medium">
                  <div className="hidden sm:block">
                    {getSelectedLocationName()} • {formatSelectedDate(selectedDate)} • {getSelectedTimeSlotText()}
                  </div>
                  <div className="sm:hidden">
                    {getSelectedLocationName()} • {formatSelectedDateShort(selectedDate)}
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 ml-2 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Left Section - Location and Calendar */}
            <div className="p-4 sm:p-6 border-b lg:border-b-0 lg:border-r">
              {/* Location Selector */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Location
                </label>
                <div className="relative">
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent text-sm"
                  >
                    <option value="">Select a location</option>
                    {loadingLocations ? (
                      <option disabled>Loading...</option>
                    ) : (
                      locationList.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))
                    )}
                    {/* {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))} */}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Calendar */}
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    {formatMonthYear(currentMonth)}
                  </h3>
                  <div className="flex gap-1 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
                        setCurrentMonth(prevMonth);
                      }}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
                        setCurrentMonth(nextMonth);
                      }}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                    >
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1 sm:py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before the first day of the month */}
                  {Array.from({ length: adjustedStartingDay }, (_, i) => (
                    <div key={`empty-${i}`} className="h-8 sm:h-10"></div>
                  ))}

                  {/* Days of the month */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const isAvailable = isDateAvailable(date);
                    const isSelected = isSelectedDate(date);

                    return (
                      <button
                        key={day}
                        onClick={() => handleDateClick(day)}
                        disabled={!isAvailable}
                        className={`
                          h-8 sm:h-10 w-full rounded-md text-xs sm:text-sm font-medium transition-colors calendar-day
                          ${isSelected
                            ? 'bg-brand-orange text-white'
                            : isAvailable
                              ? 'text-brand-orange hover:bg-orange-50'
                              : 'text-gray-400 cursor-not-allowed'
                          }
                        `}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Section - Time Slots */}
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Select Time</h3>

              <div className="space-y-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedTimeSlot(slot.id)}
                    disabled={!slot.available}
                    className={`
                      w-full p-2 sm:p-3 text-left rounded-md border transition-colors time-slot text-sm
                      ${selectedTimeSlot === slot.id
                        ? 'bg-brand-orange text-white border-brand-orange'
                        : slot.available
                          ? 'border-gray-300 hover:border-brand-orange hover:bg-orange-50'
                          : 'border-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>

              {/* Schedule Button */}
              <Button
                onClick={handleSchedule}
                disabled={!selectedLocation || !selectedDate || !selectedTimeSlot}
                className="w-full mt-4 sm:mt-6 bg-brand-orange hover:bg-brand-orange/90 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
