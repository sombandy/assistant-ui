import { FC, useEffect, useState } from "react";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import { ArchiveIcon, PlusIcon, Loader2 } from "lucide-react";
import { useThreads } from "@/providers/ThreadProvider";
import { useAssistantRuntime } from "@assistant-ui/react";
import { format, parseISO, isValid } from "date-fns";

import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

// Helper function to extract and format the creation time from thread data
const getThreadCreationTime = (thread: any): string => {
  try {
    // First check if the thread has creation_time in its metadata
    if (thread.metadata && thread.metadata.creation_time) {
      const creationTime = thread.metadata.creation_time;
      if (typeof creationTime === 'string') {
        // Try to parse as ISO string
        const date = parseISO(creationTime);
        if (isValid(date)) {
          return format(date, 'MMM d, yyyy h:mm a');
        }
      } else if (typeof creationTime === 'number') {
        // Handle numeric timestamp (seconds or milliseconds)
        const date = new Date(creationTime > 1000000000000 ? creationTime : creationTime * 1000);
        if (isValid(date)) {
          return format(date, 'MMM d, yyyy h:mm a');
        }
      }
    }
    
    // If no metadata or invalid metadata, try to extract from thread ID
    const threadId = thread.thread_id;
    
    // Try to extract a timestamp if the thread ID contains one
    const timestampMatch = threadId.match(/\d{10,}/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[0]);
      // Check if it's a valid timestamp (in milliseconds or seconds)
      let date;
      if (timestamp > 1000000000000) {
        // Milliseconds timestamp
        date = new Date(timestamp);
      } else {
        // Seconds timestamp
        date = new Date(timestamp * 1000);
      }
      
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy h:mm a');
      }
    }
    
    // If we can't extract a timestamp, try to parse the thread ID as an ISO date
    if (threadId.includes('T') && threadId.includes('-')) {
      const date = parseISO(threadId);
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy h:mm a');
      }
    }
    
    // Last resort: check if there's a timestamp in the messages
    if (thread.values && thread.values.messages && thread.values.messages.length > 0) {
      const firstMessage = thread.values.messages[0];
      if (firstMessage.created_at) {
        const date = typeof firstMessage.created_at === 'string' 
          ? parseISO(firstMessage.created_at)
          : new Date(firstMessage.created_at > 1000000000000 ? firstMessage.created_at : firstMessage.created_at * 1000);
        
        if (isValid(date)) {
          return format(date, 'MMM d, yyyy h:mm a');
        }
      }
    }
    
    // Fallback to showing today's date and time
    return format(new Date(), 'MMM d, yyyy h:mm a');
  } catch (error) {
    console.error("Error parsing thread creation time:", error);
    return format(new Date(), 'MMM d, yyyy h:mm a');
  }
};

export const ThreadList: FC = () => {
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

  return (
    <ThreadListPrimitive.Root className="flex flex-col items-stretch gap-1.5 h-full overflow-y-auto relative">
      <ThreadListNew />
      <ThreadListItems threads={threads} />
      
      {/* Loading overlay */}
      {threadsLoading && (
        <div className="absolute inset-0 bg-background/50 flex justify-center items-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  const runtime = useAssistantRuntime();
  const { fetchThreads, setActiveThreadId } = useThreads();
  
  const handleNewThread = async () => {
    try {
      // Switch to a new thread using the runtime
      await runtime.switchToNewThread();
      
      // Refresh the thread list to show the new thread
      const updatedThreads = await fetchThreads();
      
      // Set the newly created thread as active (it should be the first one after sorting)
      if (updatedThreads.length > 0) {
        setActiveThreadId(updatedThreads[0].thread_id);
      }
    } catch (error) {
      console.error("Error creating new thread:", error);
    }
  };
  
  return (
    <Button 
      className="data-[active]:bg-muted hover:bg-muted flex items-center justify-start gap-1 rounded-lg px-2.5 py-2 text-start" 
      variant="ghost"
      onClick={handleNewThread}
    >
      <PlusIcon />
      New Thread
    </Button>
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
    // Update the active thread ID in the provider
    setActiveThreadId(threadId);
    
    try {
      // Switch to the selected thread
      await runtime.switchToThread(threadId);
      
      // Refresh the thread list to update any changes
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
  // Get the title from the first message if available
  let title = "New Chat";
  
  // Extract the first message text content for the thread title
  if (
    typeof thread.values === "object" &&
    thread.values &&
    "messages" in thread.values &&
    Array.isArray(thread.values.messages) &&
    thread.values.messages?.length > 0
  ) {
    const messages = thread.values.messages;
    
    // Find the first human message (usually the query)
    const humanMessage = messages.find((msg: any) => msg.type === "human");
    const firstMessage = humanMessage || messages[0];
    
    // Handle different message content formats
    if (firstMessage) {
      if (firstMessage.content && Array.isArray(firstMessage.content)) {
        // Handle array content format (e.g., [{type: 'text', text: '...'}])
        const textContent = firstMessage.content.find((c: any) => c.type === "text");
        if (textContent && textContent.text) {
          title = textContent.text;
        }
      } else if (typeof firstMessage.content === "string") {
        // Handle string content format
        title = firstMessage.content;
      } else if (firstMessage.text) {
        // Handle direct text property
        title = firstMessage.text;
      }
      
      // Truncate long titles
      if (title.length > 40) {
        title = title.substring(0, 40) + "...";
      }
    }
  }

  return (
    <div 
      className={`flex items-center gap-2 rounded-lg transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 ${active ? "bg-muted" : ""}`}
      onClick={onClick}
    >
      <button className="flex-grow px-3 py-2 text-start text-sm w-full">
        <p className="truncate text-ellipsis">{title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {getThreadCreationTime(thread)}
        </p>
      </button>
    </div>
  );
};


