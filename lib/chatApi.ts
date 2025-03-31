import { Client, Thread, ThreadState } from "@langchain/langgraph-sdk";
import {
  LangChainMessage,
  LangGraphCommand,
} from "@assistant-ui/react-langgraph";

// Interface for thread run data from the API
export interface ThreadRun {
  run_id: string;
  thread_id: string;
  assistant_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  metadata: Record<string, any>;
  kwargs: Record<string, any>;
  multitask_strategy: string;
}

const createClient = () => {
  const apiUrl =
    process.env["NEXT_PUBLIC_LANGGRAPH_API_URL"] ||
    new URL("/api", window.location.href).href;
  return new Client({
    apiUrl,
  });
};

export const createThread = async () => {
  const client = createClient();
  return client.threads.create();
};

export const getThreadState = async (
  threadId: string
): Promise<ThreadState<{ messages: LangChainMessage[] }>> => {
  const client = createClient();
  return client.threads.getState(threadId);
};

export const sendMessage = async (params: {
  threadId: string;
  messages?: LangChainMessage[];
  command?: LangGraphCommand | undefined;
}) => {
  const client = createClient();
  return client.runs.stream(
    params.threadId,
    process.env["NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID"]!,
    {
      input: params.messages?.length
        ? {
            messages: params.messages,
          }
        : null,
      command: params.command,
      streamMode: ["messages", "updates"],
    }
  );
};

export const getThreads = async (): Promise<Thread[]> => {
  const client = createClient();
  const assistantId = process.env["NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID"]!;
  
  try {
    const threads = await client.threads.search({
      metadata: { graph_id: assistantId },
      limit: 100,
    });
    return threads;
  } catch (error) {
    console.error("Error fetching threads:", error);
    return [];
  }
};

/**
 * Fetches the run history for a specific thread
 * @param threadId The ID of the thread to fetch runs for
 * @returns Array of thread runs, sorted by creation date (oldest first)
 */
export const getThreadRuns = async (threadId: string): Promise<ThreadRun[]> => {
  const client = createClient();
  
  try {
    // Using the raw fetch API to get thread runs since it's not directly exposed in the SDK
    // Get the base URL from the client configuration
    const apiUrl = process.env["NEXT_PUBLIC_LANGGRAPH_API_URL"] || 
                  new URL("/api", window.location.href).href;
                  
    const response = await fetch(`${apiUrl}/threads/${threadId}/runs`, {
      headers: {
        'Content-Type': 'application/json'
        // No auth header needed if using the same base URL
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch thread runs: ${response.statusText}`);
    }
    
    const runs = await response.json() as ThreadRun[];
    return runs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } catch (error) {
    console.error(`Error fetching runs for thread ${threadId}:`, error);
    return [];
  }
};

// Cache for thread creation times to avoid excessive API calls
const threadCreationTimeCache = new Map<string, Date>();

/**
 * Gets the creation time of a thread as a Date object
 * @param threadId The ID of the thread to get creation time for
 * @returns A Date object representing the thread creation time
 */
export const getThreadCreationDate = async (threadId: string): Promise<Date> => {
  // Check cache first
  if (threadCreationTimeCache.has(threadId)) {
    return threadCreationTimeCache.get(threadId)!;
  }
  
  try {
    const runs = await getThreadRuns(threadId);
    
    if (runs.length > 0) {
      const earliestRun = runs[0]; // Already sorted by creation_at in the API call
      const creationTime = earliestRun.created_at;
      
      if (creationTime) {
        const date = new Date(creationTime);
        // Cache the result
        threadCreationTimeCache.set(threadId, date);
        return date;
      }
    }
    
    // Fallback to current time
    return new Date();
  } catch (error) {
    console.error(`Error getting creation time for thread ${threadId}:`, error);
    return new Date();
  }
};
