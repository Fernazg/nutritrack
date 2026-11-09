import type { Metadata } from "next";
import { Settings } from "@/features/settings/settings";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  return <Settings />;
}
