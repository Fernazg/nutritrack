import { Suspense } from "react";
import type { Metadata } from "next";
import { Diary } from "@/features/meals/diary";

export const metadata: Metadata = { title: "Diario" };

export default function DiaryPage() {
  return (
    <Suspense>
      <Diary />
    </Suspense>
  );
}
