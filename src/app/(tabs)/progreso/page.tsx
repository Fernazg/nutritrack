import type { Metadata } from "next";
import { Progress } from "@/features/progress/progress";

export const metadata: Metadata = { title: "Progreso" };

export default function ProgressPage() {
  return <Progress />;
}
