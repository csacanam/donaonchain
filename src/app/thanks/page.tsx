import { Suspense } from "react";
import type { Metadata } from "next";
import { ThanksView } from "@/components/ThanksView";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-8 sm:py-12 sm:px-6">
      <Suspense fallback={null}>
        <ThanksView />
      </Suspense>
    </main>
  );
}
