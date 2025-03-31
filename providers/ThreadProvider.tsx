"use client";

import { Thread } from "@langchain/langgraph-sdk";
import { createContext, useContext, ReactNode, useCallback, useState, Dispatch, SetStateAction } from "react";
import { getThreads, getThreadCreationDate } from "@/lib/chatApi";

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

  // No need for local state since caching is handled in the API layer

  const fetchThreads = useCallback(async (): Promise<Thread[]> => {
    try {
      const fetchedThreads = await getThreads();
      
      // Get creation times for all threads using the shared function
      const threadCreationPromises = fetchedThreads.map(async (thread) => {
        const creationTime = await getThreadCreationDate(thread.thread_id);
        return { thread, creationTime };
      });
      
      const threadsWithTimes = await Promise.all(threadCreationPromises);
      
      // Sort threads by creation time (newest first)
      const sortedThreads = threadsWithTimes
        .sort((a, b) => b.creationTime.getTime() - a.creationTime.getTime())
        .map(item => item.thread);
      
      setThreads(sortedThreads);
      
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
