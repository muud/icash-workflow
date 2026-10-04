export const metadata = {
  title: "iCash Mtiririko - Modern Wholesale Flow & POS",
  description: "Ultra-modern, glassmorphic wholesale POS and approval engine for high-velocity distributors",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "iCash POS",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#070b14",
};

export default function RootLayout({ children }) {
  return (
    <html lang="so">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --sat: env(safe-area-inset-top, 0px);
              --sab: env(safe-area-inset-bottom, 0px);
              --sal: env(safe-area-inset-left, 0px);
              --sar: env(safe-area-inset-right, 0px);
              --primary: #0d9488;
              --primary-bright: #14b8a6;
              --primary-glow: rgba(20, 184, 166, 0.45);
              --glass-bg: rgba(15, 23, 42, 0.7);
              --glass-border: rgba(255, 255, 255, 0.12);
              --glass-border-bright: rgba(255, 255, 255, 0.22);
            }

            * {
              box-sizing: border-box;
              -webkit-tap-highlight-color: transparent;
            }

            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              min-height: 100dvh;
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
              background-color: #060a12;
              color: #f8fafc;
              -webkit-font-smoothing: antialiased;
              touch-action: manipulation;
              overflow-x: hidden;
            }

            /* Ambient Morphing Aurora Background */
            body::before {
              content: '';
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              z-index: -1;
              pointer-events: none;
              background: 
                radial-gradient(circle 600px at 15% 15%, rgba(13, 148, 136, 0.22) 0%, transparent 70%),
                radial-gradient(circle 500px at 85% 20%, rgba(99, 102, 241, 0.2) 0%, transparent 65%),
                radial-gradient(circle 700px at 50% 90%, rgba(6, 182, 212, 0.16) 0%, transparent 70%),
                radial-gradient(circle 400px at 75% 75%, rgba(16, 185, 129, 0.12) 0%, transparent 60%);
              animation: auroraBreathe 14s ease-in-out infinite alternate;
            }

            @keyframes auroraBreathe {
              0% {
                transform: scale(1) translate(0, 0);
                opacity: 0.9;
              }
              50% {
                transform: scale(1.06) translate(15px, -10px);
                opacity: 1;
              }
              100% {
                transform: scale(1) translate(-10px, 12px);
                opacity: 0.92;
              }
            }

            button, a, select, input {
              touch-action: manipulation;
            }

            /* Prevent iOS auto-zoom */
            input, select, textarea {
              font-size: 16px !important;
            }

            /* Sleek Glass Scrollbar */
            ::-webkit-scrollbar {
              height: 6px;
              width: 6px;
            }
            ::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.2);
            }
            ::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.18);
              border-radius: 99px;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: rgba(20, 184, 166, 0.6);
            }

            /* Micro-Interactions & Touch Feedback */
            .touch-btn {
              transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s ease, filter 0.15s ease, background 0.15s ease;
              user-select: none;
            }
            .touch-btn:active {
              transform: scale(0.96) translateY(1px);
            }

            .glass-hover {
              transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
            }
            .glass-hover:hover {
              transform: translateY(-2px);
              border-color: rgba(255, 255, 255, 0.25) !important;
              box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.6), 0 0 25px rgba(20, 184, 166, 0.2) !important;
            }

            /* Responsive Layout Rules */
            .onboard-grid {
              display: grid;
              grid-template-columns: 1.1fr 1fr;
              width: 100%;
              max-width: 1040px;
              border-radius: 28px;
              overflow: hidden;
              box-shadow: 0 30px 70px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(13, 148, 136, 0.15);
              border: 1px solid rgba(255, 255, 255, 0.15);
              background: rgba(13, 20, 36, 0.85);
              backdrop-filter: blur(28px) saturate(190%);
              -webkit-backdrop-filter: blur(28px) saturate(190%);
            }

            .pos-grid-responsive {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
              gap: 12px;
              margin-top: 14px;
            }

            .table-responsive-wrapper {
              width: 100%;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              border-radius: 12px;
            }

            @media (max-width: 768px) {
              .onboard-grid {
                grid-template-columns: 1fr;
                border-radius: 20px;
                max-width: 100%;
                margin: 0 8px;
              }
              .onboard-hero-pad {
                padding: 26px 20px !important;
              }
              .onboard-card-pad {
                padding: 24px 20px !important;
              }
              .feature-grid-responsive {
                grid-template-columns: 1fr !important;
                gap: 10px !important;
              }
              .pos-grid-responsive {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 10px !important;
              }
              .header-responsive {
                padding: 12px 14px !important;
                gap: 10px !important;
              }
              .nav-responsive {
                padding-bottom: 6px !important;
                gap: 6px !important;
              }
              .grid-two-responsive {
                grid-template-columns: 1fr !important;
              }
            }

            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            @keyframes pulseBadge {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.85; transform: scale(1.03); }
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
