"use client";

import { useEffect } from "react";

export default function SwaggerDocs() {
  useEffect(() => {
    const cssId = "aira-swagger-ui-css";
    const scriptId = "aira-swagger-ui-script";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css";
      document.head.appendChild(link);
    }

    const render = () => {
      if (!window.SwaggerUIBundle) return;
      window.SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#aira-swagger-ui",
        deepLinking: true,
        displayRequestDuration: true,
        persistAuthorization: false,
      });
    };

    const existing = document.getElementById(scriptId);
    if (existing) {
      if (window.SwaggerUIBundle) render();
      else existing.addEventListener("load", render, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js";
    script.onload = render;
    script.onerror = () => {
      const target = document.getElementById("aira-swagger-ui");
      if (target) target.textContent = "Swagger UI gagal dimuat. Periksa koneksi internet atau buka /api/openapi untuk melihat spesifikasi JSON.";
    };
    document.body.appendChild(script);
  }, []);

  return <div id="aira-swagger-ui" className="min-h-[70vh] rounded-xl bg-white p-3" />;
}
