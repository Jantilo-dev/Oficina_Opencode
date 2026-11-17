import { getBaseUrl } from "../server/opencode.js";

const base = getBaseUrl();
const confirmed = process.argv.includes("--yes");

type SessionLike = { id: string; title: string; parentID?: string };

async function main() {
  const path = await (await fetch(`${base}/path`)).json();
  const query = `?directory=${encodeURIComponent(path.directory)}`;
  const sessions = (await (await fetch(`${base}/session${query}`)).json()) as SessionLike[];

  const demo = sessions.filter((session) =>
    /^(Oficina demo|Describir contenido|Inspeccionar|Investigar)\b/.test(session.title ?? "")
  );

  if (demo.length === 0) {
    console.log("No hay sesiones demo en este directorio.");
    return;
  }

  console.log(`${demo.length} sesiones demo en ${path.directory}:`);
  for (const session of demo) {
    console.log(`  ${session.id}  ${session.title}`);
  }

  if (!confirmed) {
    console.log("\nNada borrado. Ejecuta `npm run clean-demo -- --yes` para eliminarlas.");
    return;
  }

  for (const session of demo) {
    const res = await fetch(`${base}/session/${session.id}${query}`, { method: "DELETE" });
    console.log(`  ${session.id} -> HTTP ${res.status}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
