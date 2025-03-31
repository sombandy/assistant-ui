"use client";

import { useRef } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";
import { ThreadProvider } from "@/providers/ThreadProvider";

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

  return (
    <ThreadProvider>
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex h-screen w-full">
          <div className="w-64 border-r border-gray-200 h-full">
            <ThreadList />
          </div>
          <div className="flex-1">
            <Thread />
          </div>
        </div>
      </AssistantRuntimeProvider>
    </ThreadProvider>
  );
}
