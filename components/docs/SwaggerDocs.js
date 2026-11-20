
"use client";

import { useEffect, useState } from "react";

const SWAGGER_CSS_URL =
  "https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css";

const SWAGGER_JS_URL =
  "https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js";

const SWAGGER_CSS_ID = "aira-swagger-ui-css";
const SWAGGER_SCRIPT_ID = "aira-swagger-ui-script";

let swaggerScriptPromise = null;

/**
 * Memuat CSS Swagger UI satu kali.
 */
function loadSwaggerCss() {
  if (document.getElementById(SWAGGER_CSS_ID)) {
    return;
  }

  const link = document.createElement("link");

  link.id = SWAGGER_CSS_ID;
  link.rel = "stylesheet";
  link.href = SWAGGER_CSS_URL;

  document.head.appendChild(link);
}

/**
 * Memuat JavaScript Swagger UI satu kali.
 * Promise disimpan agar beberapa komponen tidak memuat script bersamaan.
 */
function loadSwaggerScript() {
  if (typeof window.SwaggerUIBundle === "function") {
    return Promise.resolve(window.SwaggerUIBundle);
  }

  if (swaggerScriptPromise) {
    return swaggerScriptPromise;
  }

  swaggerScriptPromise = new Promise((resolve, reject) => {
    let script = document.getElementById(SWAGGER_SCRIPT_ID);

    if (script?.dataset.loaded === "true") {
      if (typeof window.SwaggerUIBundle === "function") {
        resolve(window.SwaggerUIBundle);
        return;
      }

      script.remove();
      script = null;
    }

    const handleLoad = () => {
      script.dataset.loaded = "true";

      if (typeof window.SwaggerUIBundle === "function") {
        resolve(window.SwaggerUIBundle);
      } else {
        reject(new Error("Swagger UI berhasil dimuat, tetapi bundle tidak tersedia."));
      }
    };

    const handleError = () => {
      script?.remove();
      reject(new Error("Gagal memuat JavaScript Swagger UI."));
    };

    if (script) {
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      return;
    }

    script = document.createElement("script");

    script.id = SWAGGER_SCRIPT_ID;
    script.src = SWAGGER_JS_URL;
    script.async = true;

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    document.body.appendChild(script);
  }).catch((error) => {
    swaggerScriptPromise = null;
    throw error;
  });

  return swaggerScriptPromise;
}

export default function SwaggerDocs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let swaggerInstance = null;

    async function initializeSwagger() {
      try {
        setLoading(true);
        setError("");

        loadSwaggerCss();

        const SwaggerUIBundle = await loadSwaggerScript();

        if (!isMounted) return;

        swaggerInstance = SwaggerUIBundle({
          url: "/api/openapi",
          dom_id: "#aira-swagger-ui",

          deepLinking: true,
          displayRequestDuration: true,
          filter: true,
          docExpansion: "list",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 2,

          displayOperationId: false,
          showExtensions: false,
          showCommonExtensions: true,

          supportedSubmitMethods: [
            "get",
            "post",
            "put",
            "patch",
            "delete",
          ],

          validatorUrl: null,

          persistAuthorization: false,
          withCredentials: true,

          requestInterceptor: (request) => {
            // Mengirim cookie sesi untuk request ke origin yang sama.
            request.credentials = "same-origin";
            return request;
          },

          onComplete: () => {
            if (isMounted) {
              setLoading(false);
            }
          },

          onFailure: (reason) => {
            if (isMounted) {
              setLoading(false);
              setError(
                reason?.message ||
                  "Spesifikasi OpenAPI gagal dimuat. Silakan coba kembali."
              );
            }
          },

          presets: [
            SwaggerUIBundle.presets.apis,
          ],

          layout: "BaseLayout",
        });

        if (!swaggerInstance) {
          throw new Error("Swagger UI gagal diinisialisasi.");
        }
      } catch (err) {
        console.error("[AIRA Swagger]", err);

        if (isMounted) {
          setLoading(false);
          setError(
            err?.message ||
              "Dokumentasi API tidak dapat dimuat."
          );
        }
      }
    }

    initializeSwagger();

    return () => {
      isMounted = false;

      if (swaggerInstance?.destroy) {
        swaggerInstance.destroy();
      }
    };
  }, [retryKey]);

  function handleRetry() {
    setError("");
    setLoading(true);
    setRetryKey((current) => current + 1);
  }

  return (
    <section className="aira-swagger-section">
      <div className="aira-swagger-toolbar">
        <div>
          <h2 className="text-lg font-bold text-aira-primary">
            API Explorer
          </h2>

          <p className="mt-1 text-sm text-aira-text/70">
            Lihat detail endpoint, struktur request dan response,
            serta coba API secara langsung.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg border border-aira-primary px-4 py-2 text-sm font-semibold text-aira-primary transition hover:bg-aira-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Memuat..." : "Muat ulang"}
        </button>
      </div>

      {loading && (
        <div
          className="aira-swagger-state"
          role="status"
          aria-live="polite"
        >
          <div className="aira-swagger-spinner" />

          <p className="mt-3 text-sm font-medium text-aira-text">
            Sedang memuat dokumentasi API AIRA...
          </p>

          <p className="mt-1 text-xs text-aira-text/60">
            Mohon tunggu beberapa saat.
          </p>
        </div>
      )}

      {error && (
        <div
          className="aira-swagger-error"
          role="alert"
        >
          <h3 className="font-semibold text-red-700">
            Dokumentasi API gagal dimuat
          </h3>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>

          <p className="mt-2 text-xs text-red-600">
            Periksa koneksi internet atau buka spesifikasi
            OpenAPI JSON untuk memastikan endpoint dokumentasi
            tersedia.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Coba lagi
            </button>

            <a
              href="/api/openapi"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Buka OpenAPI JSON
            </a>
          </div>
        </div>
      )}

      <div
        id="aira-swagger-ui"
        className={`aira-swagger-container ${
          loading || error ? "aira-swagger-hidden" : ""
        }`}
      />

      <style jsx global>{`
        .aira-swagger-section {
          width: 100%;
          min-width: 0;
        }

        .aira-swagger-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .aira-swagger-container {
          width: 100%;
          min-width: 0;
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #ffffff;
          padding: 16px;
        }

        .aira-swagger-hidden {
          display: none;
        }

        .aira-swagger-state {
          display: flex;
          min-height: 240px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #ffffff;
          padding: 32px 20px;
          text-align: center;
        }

        .aira-swagger-spinner {
          width: 34px;
          height: 34px;
          border: 3px solid #e5e7eb;
          border-top-color: #287b75;
          border-radius: 50%;
          animation: aira-swagger-spin 0.8s linear infinite;
        }

        .aira-swagger-error {
          margin-bottom: 16px;
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fef2f2;
          padding: 20px;
        }

        @keyframes aira-swagger-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Penyesuaian tampilan Swagger agar menyatu dengan AIRA. */

        .aira-swagger-container .swagger-ui {
          font-family: inherit;
          color: #263238;
        }

        .aira-swagger-container .swagger-ui .topbar {
          display: none;
        }

        .aira-swagger-container .swagger-ui .info {
          margin: 20px 0;
        }

        .aira-swagger-container .swagger-ui .info .title {
          color: #287b75;
          font-size: 25px;
        }

        .aira-swagger-container .swagger-ui .opblock-tag {
          color: #287b75;
          border-bottom-color: #e5e7eb;
          font-size: 17px;
        }

        .aira-swagger-container .swagger-ui .opblock {
          border-radius: 9px;
          box-shadow: none;
          overflow: hidden;
        }

        .aira-swagger-container .swagger-ui .opblock .opblock-summary {
          padding: 10px;
        }

        .aira-swagger-container .swagger-ui .btn {
          border-radius: 7px;
        }

        .aira-swagger-container .swagger-ui select,
        .aira-swagger-container .swagger-ui input,
        .aira-swagger-container .swagger-ui textarea {
          max-width: 100%;
        }

        .aira-swagger-container .swagger-ui .model-box {
          border-radius: 8px;
        }

        .aira-swagger-container .swagger-ui .responses-wrapper {
          overflow-x: auto;
        }

        @media (max-width: 640px) {
          .aira-swagger-container {
            padding: 8px;
          }

          .aira-swagger-container .swagger-ui .info .title {
            font-size: 20px;
          }

          .aira-swagger-container .swagger-ui .opblock-summary {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </section>
  );
}
