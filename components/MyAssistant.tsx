"use client";

import { useRef, useState } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";
import { ThreadProvider } from "@/providers/ThreadProvider";
import { PanelLeftClose, PanelLeftOpen, FileEdit as FileEditIcon } from "lucide-react";

import { createThread, getThreadState, sendMessage } from "@/lib/chatApi";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";

export function MyAssistant() {
  const threadIdRef = useRef<string | undefined>(undefined);
  const runtime = useLangGraphRuntime({
    threadId: threadIdRef.current,
    stream: async (messages, { command }) => {
      if (!threadIdRef.current) {
        const { thread_id } = await createThread();
        threadIdRef.current = thread_id;
      }
      const threadId = threadIdRef.current;
      return sendMessage({
        threadId,
        messages,
        command,
      });
    },
    onSwitchToNewThread: async () => {
      const { thread_id } = await createThread();
      threadIdRef.current = thread_id;
    },
    onSwitchToThread: async (threadId) => {
      const state = await getThreadState(threadId);
      threadIdRef.current = threadId;
      return { messages: state.values.messages };
    },
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <ThreadProvider>
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex h-screen w-full">
          {/* Thread List Sidebar */}
          <div 
            className={`${sidebarOpen ? 'w-64' : 'w-0'} border-r border-gray-200 h-full transition-all duration-300 overflow-hidden relative`}
          >
            {/* Toggle Sidebar Button - Now inside the sidebar */}
            <button 
              className="absolute top-[18px] left-4 z-10 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose size={24} /> : <PanelLeftOpen size={24} />}
            </button>
            
            <ThreadList toggleSidebar={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
          </div>
          
          {/* Main Chat Area */}
          <div className="flex-1 relative">
            {/* Only show this button when sidebar is collapsed */}
            {!sidebarOpen && (
              <button 
                className="absolute top-4 left-4 z-10 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <PanelLeftOpen size={24} />
              </button>
            )}
            
            {/* New Thread Button - Now in the chat area */}
            <button 
              className="absolute top-4 right-4 z-10 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              onClick={async () => {
                await runtime.switchToNewThread();
              }}
              aria-label="New thread"
            >
              <FileEditIcon size={24} />
            </button>
            
            <Thread />
          </div>
        </div>
      </AssistantRuntimeProvider>
    </ThreadProvider>
  );
}
