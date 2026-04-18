import NetInfo from "@react-native-community/netinfo";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { syncQueuedDistributions } from "@/features/staff/distribution";
import { initializeOfflineStorage, getQueuedDistributions } from "@/lib/storage/offline";
import { QueueSyncStatus } from "@/types/domain";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

interface OperationsContextValue {
  isOnline: boolean;
  syncStatus: QueueSyncStatus;
  pendingQueueCount: number;
  refreshPendingQueue: () => Promise<void>;
  syncPendingQueue: () => Promise<void>;
}

const OperationsContext = createContext<OperationsContextValue | null>(null);

export function OperationsProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, loading, role } = useAuth();
  const { showToast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<QueueSyncStatus>("idle");
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  const refreshPendingQueue = async () => {
    const queuedRecords = await getQueuedDistributions();
    setPendingQueueCount(queuedRecords.length);
  };

  const syncPendingQueue = async () => {
    if (!isAuthenticated || role !== "staff") {
      return;
    }

    setSyncStatus("syncing");

    try {
      const result = await syncQueuedDistributions();
      await refreshPendingQueue();
      setSyncStatus(result.failedCount > 0 ? "failed" : "idle");

      if (result.syncedCount > 0) {
        showToast(`${result.syncedCount} queued distribution${result.syncedCount === 1 ? "" : "s"} synced.`, "success");
      }

      if (result.failedCount > 0) {
        showToast(`${result.failedCount} queued distribution${result.failedCount === 1 ? "" : "s"} still need attention.`, "error");
      }
    } catch {
      setSyncStatus("failed");
      await refreshPendingQueue();
    }
  };

  useEffect(() => {
    void initializeOfflineStorage().then(refreshPendingQueue).catch(() => undefined);
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(reachable);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated || role !== "staff" || !isOnline) {
      return;
    }

    void syncPendingQueue();
  }, [isAuthenticated, isOnline, loading, role]);

  const value = useMemo<OperationsContextValue>(
    () => ({
      isOnline,
      syncStatus,
      pendingQueueCount,
      refreshPendingQueue,
      syncPendingQueue
    }),
    [isOnline, pendingQueueCount, syncStatus]
  );

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);

  if (!context) {
    throw new Error("useOperations must be used within OperationsProvider");
  }

  return context;
}
