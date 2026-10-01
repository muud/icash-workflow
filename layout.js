export const metadata = { title: "iCash Workflow", description: "Workflow platform prototype" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f6f8", color: "#1a1d21" }}>
        {children}
      </body>
    </html>
  );
}
