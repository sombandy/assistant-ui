"use client";

import { Thread } from "@langchain/langgraph-sdk";
import { createContext, useContext, ReactNode, useCallback, useState, Dispatch, SetStateAction } from "react";
import { getThreads } from "@/lib/chatApi";

interface ThreadContextType {
  fetchThreads: () => Promise<Thread[]>;
  threads: Thread[];
  setThreads: Dispatch<SetStateAction<Thread[]>>;
  threadsLoading: boolean;
  setThreadsLoading: Dispatch<SetStateAction<boolean>>;
  activeThreadId: string | null;
  setActiveThreadId: Dispatch<SetStateAction<string | null>>;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

export function ThreadProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Enhanced fetchThreads that also updates the active thread if needed
  const fetchThreads = useCallback(async (): Promise<Thread[]> => {
    try {
      const fetchedThreads = await getThreads();
      
      // Sort threads by most recent first (assuming thread_id contains timestamp info)
      const sortedThreads = [...fetchedThreads].sort((a, b) => {
        return b.thread_id.localeCompare(a.thread_id);
      });
      
      setThreads(sortedThreads);
      
      // If we have threads but no active thread, set the most recent one as active
      if (sortedThreads.length > 0 && !activeThreadId) {
        setActiveThreadId(sortedThreads[0].thread_id);
      }
      
      return sortedThreads;
    } catch (error) {
      console.error("Error fetching threads:", error);
      return [];
    }
  }, [activeThreadId]);

  const value = {
    fetchThreads,
    threads,
    setThreads,
    threadsLoading,
    setThreadsLoading,
    activeThreadId,
    setActiveThreadId,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThreads must be used within a ThreadProvider");
  }
  return context;
}
