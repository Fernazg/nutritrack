// Builds src/lib/nutrition/generic-foods.json from USDA FoodData Central SR Legacy
// (public domain / CC0) and the curated list in data/generic-foods.source.json.
// Usage: node scripts/build-generic-foods.mjs <dir with SR Legacy CSVs> [--list]
// Download: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
import { readFileSync, writeFileSync } from "node:fs";

const dir = process.argv[2];
const listOnly = process.argv.includes("--list");
if (!dir) throw new Error("Falta la carpeta con los CSV de SR Legacy");

function parseLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}
function table(file) {
  const [head, ...lines] = readFileSync(`${dir}/${file}`, "utf8").split(/\r?\n/).filter(Boolean);
  const cols = parseLine(head);
  return lines.map((l) => Object.fromEntries(parseLine(l).map((v, i) => [cols[i], v])));
}

const { foods: list } = JSON.parse(readFileSync("data/generic-foods.source.json", "utf8"));
const wanted = new Set(list.map(([id]) => String(id)));

const desc = new Map(table("food.csv").filter((f) => wanted.has(f.fdc_id)).map((f) => [f.fdc_id, f.description]));
const NUTRIENTS = { 1008: "calories", 1003: "protein", 1005: "carbs", 1004: "fat", 1079: "fiber", 2000: "sugars", 1093: "sodiumMg" };
const values = new Map();
for (const n of table("food_nutrient.csv")) {
  if (!wanted.has(n.fdc_id) || !(n.nutrient_id in NUTRIENTS)) continue;
  if (!values.has(n.fdc_id)) values.set(n.fdc_id, {});
  values.get(n.fdc_id)[NUTRIENTS[n.nutrient_id]] = Number(n.amount);
}
const units = new Map(table("measure_unit.csv").map((u) => [u.id, u.name]));
const portions = new Map();
for (const p of table("food_portion.csv")) {
  if (!wanted.has(p.fdc_id)) continue;
  const unit = units.get(p.measure_unit_id);
  const text = [p.amount, unit && unit !== "undetermined" ? unit : "", p.modifier, p.portion_description]
    .filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!portions.has(p.fdc_id)) portions.set(p.fdc_id, []);
  portions.get(p.fdc_id).push({ text, amount: Number(p.amount), modifier: p.modifier, grams: Number(p.gram_weight) });
}

// English portion head → Spanish. Unknown terms keep the original wording.
const ES = [
  [/^cup\b/, "taza"], [/^tbsp\b|^tablespoon/, "cucharada"], [/^tsp\b|^teaspoon/, "cucharadita"],
  [/^oz\b/, "oz"], [/^fl oz/, "oz líq."], [/^slice/, "rebanada"], [/^medium/, "unidad mediana"],
  [/^large/, "unidad grande"], [/^small/, "unidad pequeña"], [/^fruit|^apricot|^beet|^potato|^ear/, "unidad"],
  [/^breast/, "pechuga"], [/^thigh/, "trutro"], [/^fillet/, "filete"], [/^steak/, "bistec"],
  [/^stalk/, "tallo"], [/^clove/, "diente"], [/^roll|^pan\b/, "pan"], [/^pita/, "pan pita"],
  [/^tortilla/, "tortilla"], [/^cracker/, "galleta"], [/^cookie/, "galleta"], [/^frankfurter|^link/, "unidad"],
  [/^olive/, "aceituna"], [/^almonds?/, "almendra"], [/^container/, "envase"], [/^can or bottle|^can\b/, "lata"],
  [/^glass/, "copa"], [/^piece/, "porción"], [/^scoop/, "bola"], [/^pat/, "porción"], [/^floweret/, "ramito"],
  [/hot dog/, "unidad"], [/5 fl oz/, "copa"], [/^NLEA serving/, "porción"], [/^serving/, "porción"],
];
const plural = (w) => w.replace(/^(\S+)/, (m) => (/[aeiouáéó]$/.test(m) ? `${m}s` : /\.$/.test(m) || m === "oz" ? m : `${m}es`));
function spanishLabel(p) {
  const head = (p.modifier || p.text.replace(/^[\d.]+\s*/, "")).trim();
  const found = ES.find(([re]) => re.test(head));
  const word = found ? found[1] : head;
  if (!p.amount || p.amount === 1) return `1 ${word}`;
  return `${String(p.amount).replace(".", ",")} ${p.amount > 1 ? plural(word) : word}`;
}

const out = [];
const problems = [];
for (const [id, name, portionRe] of list) {
  const key = String(id);
  const en = desc.get(key);
  const v = values.get(key);
  if (!en || !v || v.calories == null) { problems.push(`${id} ${name}: no existe en SR Legacy`); continue; }
  const ps = portions.get(key) ?? [];
  if (listOnly) { console.log(`${id} ${name} | ${en}\n   ${ps.map((p) => `${p.text} = ${p.grams} g`).join("\n   ")}`); continue; }
  let serving;
  if (portionRe) {
    for (const alt of portionRe.split("|")) {
      const re = new RegExp(alt, "i");
      const hit = ps.find((p) => re.test(p.text));
      if (hit) { serving = { label: spanishLabel(hit), grams: Math.round(hit.grams * 10) / 10 }; break; }
    }
    if (!serving) problems.push(`${id} ${name}: porción /${portionRe}/ no encontrada en [${ps.map((p) => p.text).join("; ")}]`);
  }
  const r1 = (n) => (n == null ? undefined : Math.round(n * 10) / 10);
  out.push({
    id: Number(id), name, en,
    per100g: { calories: Math.round(v.calories), protein: r1(v.protein ?? 0), carbs: r1(v.carbs ?? 0), fat: r1(v.fat ?? 0) },
    fiber: r1(v.fiber), sugars: r1(v.sugars), sodiumMg: v.sodiumMg == null ? undefined : Math.round(v.sodiumMg),
    ...(serving && { serving }),
  });
}
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
if (!listOnly) {
  writeFileSync("src/lib/nutrition/generic-foods.json", JSON.stringify(out) + "\n");
  console.log(`OK: ${out.length} alimentos`);
}
