"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Opens exactly one BroadcastChannel of the given name for the component's
 * lifetime and routes every inbound message to `onMessage`. Returns a
 * stable `send` function.
 *
 * SSR-safe: BroadcastChannel doesn't exist on the server, so this is a
 * no-op until mounted in the browser — callers never need to branch on it.
 * Generic over the message union so the data channel and the presence
 * channel each get full type-checking with one shared implementation.
 */
export function useBroadcastChannel<TMessage>(
  channelName: string,
  onMessage: (message: TMessage) => void
): (message: TMessage) => void {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    const listener = (event: MessageEvent<TMessage>) => {
      handlerRef.current(event.data);
    };
    channel.addEventListener("message", listener);

    return () => {
      channel.removeEventListener("message", listener);
      channel.close();
      channelRef.current = null;
    };
  }, [channelName]);

  const send = useCallback((message: TMessage) => {
    channelRef.current?.postMessage(message);
  }, []);

  return send;
}
