import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

const brandMark = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public", "brand", "rwa-xray-mark.png"),
).toString("base64")}`;

export const socialImageSize = {
  width: 1200,
  height: 630,
};

export function createSocialImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        padding: "64px 72px",
        color: "#eaf8f6",
        background: "#02090b",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 620,
          height: 620,
          right: -190,
          top: -250,
          borderRadius: 620,
          background:
            "radial-gradient(circle, rgba(64,232,225,0.22) 0%, rgba(2,9,11,0) 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 28,
          display: "flex",
          border: "1px solid #174f51",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          {/* ImageResponse requires a native image element for embedded data. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandMark}
            alt=""
            width={50}
            height={50}
            style={{ objectFit: "contain" }}
          />
          <span>RWA</span>
          <span style={{ color: "#50eee7" }}>X-RAY</span>
        </div>
        <div
          style={{
            display: "flex",
            padding: "10px 16px",
            border: "1px solid #276467",
            color: "#8dd4d1",
            fontSize: 15,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Powered by CoinMarketCap
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
        <div
          style={{
            display: "flex",
            color: "#62e9e2",
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Market-capacity intelligence for tokenized assets
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 72,
            lineHeight: 1.04,
            fontWeight: 650,
            letterSpacing: "-0.045em",
          }}
        >
          Can I actually exit this position?
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            color: "#98b7b7",
            fontSize: 25,
            lineHeight: 1.4,
          }}
        >
          Transparent scenarios · Concentration analysis · Traceable evidence
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#6d9798",
          fontSize: 16,
          letterSpacing: "0.08em",
        }}
      >
        <span>rwa-xray.vercel.app</span>
        <span>Real observations · No account required</span>
      </div>
    </div>,
    socialImageSize,
  );
}
