"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360, padding: "0 24px" }}>
          <p style={{ fontSize: 14, color: "#a1a1aa", marginBottom: 8 }}>연결 실패</p>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            서버에 연결할 수 없어요
          </h1>
          <p style={{ fontSize: 14, color: "#a1a1aa", margin: "0 0 24px", lineHeight: 1.6 }}>
            인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid #3f3f46",
              background: "transparent",
              color: "#fafafa",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
