'use client';

import { Footerdemo } from "@/components/ui/footer-section";

export default function FooterDemoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Content area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-bold mb-4">Footer Component Demo</h1>
          <p className="text-muted-foreground">
            Scroll down to see the footer component in action. Try the dark mode toggle!
          </p>
        </div>
      </div>

      {/* Footer */}
      <Footerdemo />
    </div>
  );
}
