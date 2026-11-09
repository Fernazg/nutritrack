import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MealDetail } from "@/features/meals/meal-detail";
import { MEALS, getMeal } from "@/lib/nutrition/meals";

export function generateStaticParams() {
  return MEALS.map((m) => ({ comida: m.type }));
}

export async function generateMetadata({ params }: PageProps<"/diario/[comida]">) {
  const { comida } = await params;
  return { title: getMeal(comida)?.label ?? "Comida" };
}

export default function MealPage({ params }: PageProps<"/diario/[comida]">) {
  return (
    <Suspense>
      <MealContent params={params} />
    </Suspense>
  );
}

async function MealContent({ params }: { params: Promise<{ comida: string }> }) {
  const { comida } = await params;
  const meal = getMeal(comida);
  if (!meal) notFound();
  return <MealDetail meal={meal.type} />;
}
