// src/app/(app)/layout.tsx
import React from 'react';

// This layout applies to routes within the (app) group, like /dashboard
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-secondary">
       {/* Optional: Add shared UI elements for the app section, like a header/navbar */}
      {/* <header>App Header</header> */}
      <main>{children}</main>
      {/* Optional: Add shared footer */}
      {/* <footer>App Footer</footer> */}
    </div>
  );
}
