"use client";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2 } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { useUser } from "@/hooks/useUser";

const statusBtnStyles: Record<string, string> = {
  approved: "bg-emerald-500 text-white hover:bg-emerald-600",
  pending: "bg-yellow-400 text-white hover:bg-yellow-500",
};

const statusLabelStyles: Record<string, string> = {
  approved: "text-emerald-600",
  pending: "text-yellow-500",
};

function CancelModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200/70">
      <div className="bg-white rounded-xl p-10 flex flex-col items-center shadow-lg min-w-[350px]">
        <Trash2 className="w-16 h-16 text-brand-orange mb-4" />
        <div className="text-lg font-medium mb-6 text-center">
          Are you sure cancel this classes
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="min-w-[70px]" onClick={onClose}>
            No
          </Button>
          <Button className="bg-brand-orange min-w-[70px]" onClick={onConfirm}>
            Yes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ScheduledClassesPage() {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const isSuperAdmin = user?.role === "super_admin";

  const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);
  const [loadingClasses, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const handleApprove = async (id: string) => {
    setApprovingId(id);
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("scheduled_classes")
      .update({ status: "approved" })
      .eq("id", id);
    if (error) {
      console.error("Failed to approve class:", error);
    } else {
      setScheduledClasses((prev) =>
        prev.map((cls) =>
          cls.id === id ? { ...cls, status: "approved" } : cls
        )
      );
    }
    setApprovingId(null);
  };

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchScheduledClasses = useCallback(async () => {
    console.log('🔄 Starting fetchScheduledClasses...');
    setLoading(true);

    try {
      const supabase = createBrowserSupabase();
      console.log('📡 Making Supabase query...');
      
      let { data, error }: any = await supabase
        .from("scheduled_classes")
        .select("*, safety_class: safety_class_id(title, thumbnail_url, video_url)")
        .order("start_time", { ascending: false });

      if (error) {
        console.error("❌ Failed to fetch scheduled classes:", error);
        setScheduledClasses([]);
        return;
      }

      console.log('✅ Raw data received:', data?.length, 'classes');

      // Format data for UI
      data = user?.firmId ? data?.filter((cls: any) => cls?.firm_id === user?.firmId) : data;
      const formatted = (data || []).map((cls: any) => ({
        id: cls.id,
        title: cls.safety_class?.title ?? "Untitled",
        date: cls.start_time
          ? new Date(cls.start_time).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          : "",
        time:
          cls.start_time && cls.end_time
            ? `${new Date(cls.start_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })} to ${new Date(cls.end_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}`
            : "",
        status: cls.status ?? "pending",
        type: cls.type ?? "In-Person",
        thumbnailUrl: cls.safety_class?.thumbnail_url ?? "/images/safety-class-demo.png",
      }));
      
      console.log('📊 Formatted data:', formatted.length, 'classes');
      setScheduledClasses(formatted);
      
    } catch (err) {
      console.error("❌ Error in fetchScheduledClasses:", err);
      setScheduledClasses([]);
    } finally {
      setLoading(false);
      console.log('✅ fetchScheduledClasses completed');
    }
  }, []);

  // Main effect - fetch data when user is authenticated
  useEffect(() => {
    if (!loading && user) {
      console.log('👤 User authenticated, fetching scheduled classes...');
      fetchScheduledClasses();
    }
  }, [loading, user, fetchScheduledClasses]);

  // Navigation effect - refetch when returning to this page
  useEffect(() => {
    if (!loading && user && pathname.includes('scheduled-classes')) {
      console.log('🧭 Navigation to scheduled-classes, fetching data...');
      fetchScheduledClasses();
    }
  }, [pathname, loading, user, fetchScheduledClasses]);

  // Visibility change effect - refetch when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading && user && pathname.includes('scheduled-classes')) {
        console.log('👁️ Tab visible, fetching data...');
        fetchScheduledClasses();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loading, user, pathname, fetchScheduledClasses]);

  // Window focus effect - additional safety net
  useEffect(() => {
    const handleFocus = () => {
      if (!loading && user && pathname.includes('scheduled-classes')) {
        console.log('🎯 Window focused, fetching data...');
        fetchScheduledClasses();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loading, user, pathname, fetchScheduledClasses]);

  const handleCancel = (id: string) => setCancelId(id);
  const handleClose = () => setCancelId(null);

  const handleConfirm = async () => {
    if (!cancelId) return;
    setCancellingId(cancelId);
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("scheduled_classes")
      .update({ status: "cancelled" })
      .eq("id", cancelId);
    if (error) {
      console.error("Failed to cancel class:", error);
    } else {
      setScheduledClasses((prev) =>
        prev.map((cls) =>
          cls.id === cancelId ? { ...cls, status: "cancelled" } : cls
        )
      );
    }
    setCancellingId(null);
    setCancelId(null);
  };

  // Show loading state while user authentication is loading or data is being fetched
  if (loading || loadingClasses) {
    return (
      <div>
        <nav className="text-sm text-gray-500 mb-2">Home &gt; Requested Classes</nav>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-brand-blue">Requested Classes</h1>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-4 animate-pulse">
              <div className="w-full h-40 bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-2">Home &gt; Scheduled Classes</nav>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-brand-blue">Scheduled Classes</h1>
        <div className="flex gap-2">
          {/* <Button
            onClick={() => {
              console.log('🔄 Manual refresh clicked');
              fetchScheduledClasses();
            }}
            variant="outline"
            className="bg-blue-50 hover:bg-blue-100"
            disabled={loadingClasses}
          >
            {loadingClasses ? 'Refreshing...' : 'Refresh Data'}
          </Button> */}
          <Button
            onClick={async () => {
              const supabase = createBrowserSupabase();
              const { data, error, count } = await supabase
                .from("scheduled_classes")
                .select("*", { count: 'exact' });
            }}
            variant="outline"
            className="bg-green-50 hover:bg-green-100"
          >
            Test DB
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scheduledClasses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">No scheduled classes found.</p>
          </div>
        ) : (
          scheduledClasses.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl shadow p-4 flex flex-col gap-3"
            >
              <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-2 h-40">
                <Image
                  src={cls.thumbnailUrl}
                  alt={cls.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <span className="absolute top-3 right-3 bg-brand-orange text-white text-xs px-3 py-1 rounded font-medium">
                  {cls.type}
                </span>
              </div>
              <div className="font-semibold text-lg mb-1 line-clamp-2">{cls.title}</div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                <span>{cls.date}</span>
                <span className="mx-2">|</span>
                <span>{cls.time}</span>
              </div>
              {isSuperAdmin && (
                <div className="flex gap-2 mt-2">
                  <Button
                    className={`flex-1 ${statusBtnStyles[cls.status]}`}
                    disabled={cls.status === "approved" || approvingId === cls.id || cls.status === "cancelled"}
                    onClick={cls.status === "pending" ? () => handleApprove(cls.id) : undefined}
                  >
                    {approvingId === cls.id
                      ? "Approving..."
                      : cls.status === "approved"
                        ? "Approved"
                        : cls.status === "pending"
                          ? "Pending"
                          : cls.status === "cancelled"
                            ? "Cancelled"
                            : ""}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700"
                    disabled={cancellingId === cls.id || cls.status === "cancelled"}
                    onClick={() => handleCancel(cls.id)}
                  >
                    {cancellingId === cls.id ? "Cancelling..." : "Cancel"}
                  </Button>
                </div>
              )}
              {!isSuperAdmin && (
                <label
                    className={`flex-1 ${statusLabelStyles[cls.status]}`} style={{fontWeight: '600'}}
                  >
                    {approvingId === cls.id
                      ? "Approving..."
                      : cls.status === "approved"
                        ? "Approved"
                        : cls.status === "pending"
                          ? "Pending"
                          : cls.status === "cancelled"
                            ? "Cancelled"
                            : ""}
                  </label>
              )}
            </div>
          ))
        )}
      </div>
      <CancelModal
        open={!!cancelId}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </div>
  );
}