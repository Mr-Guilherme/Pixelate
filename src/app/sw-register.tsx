"use client";

import { useEffect } from "react";

export function SwRegister(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isProduction = process.env.NODE_ENV === "production";

    if (!isProduction) {
      const unregister = async () => {
        try {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((item) => item.unregister()));

          if ("caches" in window) {
            const keys = await window.caches.keys();
            await Promise.all(keys.map((key) => window.caches.delete(key)));
          }
        } catch {
          return;
        }
      };

      void unregister();
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });
      } catch {
        return;
      }
    };

    void register();
  }, []);

  return null;
}
