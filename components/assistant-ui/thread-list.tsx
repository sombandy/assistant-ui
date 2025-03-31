import { FC, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useThreads } from "@/providers/ThreadProvider";
import { useAssistantRuntime } from "@assistant-ui/react";
import { format } from "date-fns";

import { getThreadCreationDate } from "@/lib/chatApi";

// Cache for formatted thread creation times to avoid reformatting
const formattedTimeCache = new Map<string, string>();

/**
 * Gets the formatted creation time of a thread
 * @param thread The thread object
 * @returns A formatted string representing the thread creation time
 */
const getFormattedThreadCreationTime = async (thread: any): Promise<string> => {
  try {
    const threadId = thread.thread_id;
    
    // Check if we already have the formatted time in cache
    if (formattedTimeCache.has(threadId)) {
      return formattedTimeCache.get(threadId)!;
    }
    
    // Get the creation date using the shared function
    const creationDate = await getThreadCreationDate(threadId);
    
    // Format the date
    const formattedDate = format(creationDate, 'MMM d, yyyy h:mm a');
    
    // Cache the formatted result
    formattedTimeCache.set(threadId, formattedDate);
    return formattedDate;
  } catch (error) {
    console.error("Error formatting thread creation time:", error);
    return format(new Date(), 'MMM d, yyyy h:mm a');
  }
};

interface ThreadListProps {
  toggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const ThreadList: FC<ThreadListProps> = ({ toggleSidebar, sidebarOpen }) => {
  const { fetchThreads, threads, threadsLoading, setThreadsLoading } = useThreads();
  const runtime = useAssistantRuntime();
  
  // Fetch threads on component mount and set up periodic refresh
  useEffect(() => {
    // Initial fetch
    setThreadsLoading(true);
    fetchThreads()
      .catch(console.error)
      .finally(() => setThreadsLoading(false));
    
    // Set up periodic refresh (every 5 seconds)
    const refreshInterval = setInterval(() => {
      fetchThreads().catch(console.error);
    }, 5000);
    
    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [fetchThreads, setThreadsLoading]);
  
  // Refresh threads when runtime thread changes
  useEffect(() => {
    if (runtime.thread) {
      fetchThreads().catch(console.error);
    }
  }, [runtime.thread, fetchThreads]);
  
  // We've moved the new thread functionality to the MyAssistant component

  return (
    <div className="flex flex-col h-full">
      <div className="h-[60px] border-b border-gray-200 flex items-center justify-center">
        <h2 className="font-medium text-sm">Thread History</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <ThreadListItems threads={threads} />
        
        {threadsLoading && (
          <div className="absolute inset-0 bg-background/50 flex justify-center items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
};

const ThreadListItems: FC<{ threads: any[] }> = ({ threads }) => {
  const runtime = useAssistantRuntime();
  const { fetchThreads, activeThreadId, setActiveThreadId } = useThreads();
  
  if (threads.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        No threads found
      </div>
    );
  }
  
  const handleThreadClick = async (threadId: string) => {
    setActiveThreadId(threadId);
    
    try {
      await runtime.threads.switchToThread(threadId);
      
      fetchThreads().catch(console.error);
    } catch (error) {
      console.error("Error switching to thread:", error);
    }
  };
  
  return (
    <div className="flex flex-col gap-1">
      {threads.map((thread) => (
        <ThreadListItem 
          key={thread.thread_id} 
          thread={thread} 
          onClick={() => handleThreadClick(thread.thread_id)}
          active={activeThreadId === thread.thread_id}
        />
      ))}
    </div>
  );
};

const ThreadListItem: FC<{ thread: any; onClick: () => void; active: boolean }> = ({ thread, onClick, active }) => {
  const [creationTime, setCreationTime] = useState<string>("");
  
  let title = "New Chat";
  
  if (
    typeof thread.values === "object" &&
    thread.values &&
    "messages" in thread.values &&
    Array.isArray(thread.values.messages) &&
    thread.values.messages?.length > 0
  ) {
    const messages = thread.values.messages;
    const firstMessage = messages[0];
    
    if (firstMessage) {
      if (typeof firstMessage.content === "string") {
        title = firstMessage.content;
      } else if (firstMessage.text) {
        title = firstMessage.text;
      }
      
      if (title.length > 40) {
        title = title.substring(0, 40) + "...";
      }
    }
  }

  useEffect(() => {
    let isMounted = true;
    
    const fetchCreationTime = async () => {
      try {
        const time = await getFormattedThreadCreationTime(thread);
        if (isMounted) {
          setCreationTime(time);
        }
      } catch (error) {
        console.error("Error fetching thread creation time:", error);
      }
    };
    
    fetchCreationTime();
    
    return () => {
      isMounted = false;
    };
  }, [thread]);

  return (
    <div 
      className={`flex items-center gap-2 rounded-lg transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 ${active ? "bg-muted" : ""}`}
      onClick={onClick}
    >
      <button className="flex-grow px-3 py-2 text-start text-sm w-full">
        <p className="truncate text-ellipsis">{title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {creationTime || "Loading..."}
        </p>
      </button>
    </div>
  );
};


