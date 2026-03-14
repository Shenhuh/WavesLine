"use client";

import { useEffect, useState } from "react";

export default function ActiveUsersCounter() {
  const [activeCount, setActiveCount] = useState<number>(1);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected"
  >("connected");

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/active-users");

        eventSource.onopen = () => {
          setConnectionStatus("connected");
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
        };

        eventSource.onmessage = (event) => {
          try {
            if (event.data && !event.data.startsWith(":")) {
              const data = JSON.parse(event.data);
              if (typeof data.count === "number") {
                setActiveCount(data.count);
              }
            }
          } catch {}
        };

        eventSource.onerror = () => {
          setConnectionStatus("disconnected");
          eventSource?.close();

          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 3000);
          }
        };
      } catch {}
    };

    connectSSE();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 20,
        border: "1px solid rgba(200,168,48,0.15)",
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background:
            connectionStatus === "connected" ? "#4ade80" : "#f87171",
          animation:
            connectionStatus === "connected" ? "pulse 2s infinite" : "none",
        }}
      />
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#c8a830"
        strokeWidth="2"
      >
        <path
          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
          strokeLinecap="round"
        />
        <circle cx="9" cy="7" r="4" />
        <path
          d="M23 21v-2a4 4 0 0 0-3-3.87"
          strokeLinecap="round"
        />
        <path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          strokeLinecap="round"
        />
      </svg>
      <span style={{ color: "#e8e8ee", fontSize: 11, fontWeight: 600 }}>
        {activeCount}
      </span>
      <span
        style={{
          color:
            connectionStatus === "connected" ? "#9a9cb0" : "#f87171",
          fontSize: 10,
        }}
      >
        {connectionStatus === "connected" ? "online" : "offline"}
      </span>
    </div>
  );
}