import { useMemo, useState } from "react";
import {
  createProjectPackage,
  hasDesktopProjectRuntime,
  openProjectPackage,
  type ProjectPackage,
} from "./projectPackage";

type SectionId =
  | "projects"
  | "brief"
  | "text-timing"
  | "audio"
  | "scenes-shots"
  | "references"
  | "prompts"
  | "outputs"
  | "export";

type Section = {
  id: SectionId;
  label: string;
  summary: string;
};

const sections: Section[] = [
  { id: "projects", label: "Projekty", summary: "Lokálne projektové balíky a snapshoty." },
  { id: "brief", label: "Námet", summary: "Kreatívny námet, ciele a obmedzenia." },
  { id: "text-timing", label: "Text a časovanie", summary: "Text, báseň, SRT a časové mapy." },
  { id: "audio", label: "Audio", summary: "Metadáta zdrojového MP3/WAV a poznámky k dĺžke." },
  { id: "scenes-shots", label: "Scény a zábery", summary: "Štruktúra scén a plánovanie záberov." },
  { id: "references", label: "Referencie", summary: "Referenčné obrázky a vizuálny výskum." },
  { id: "prompts", label: "Prompty", summary: "Verzie promptov priradené k záberom." },
  { id: "outputs", label: "Výstupy", summary: "Vygenerované obrázky/videá a vybrané hero výstupy." },
  { id: "export", label: "Export", summary: "Manuálne exporty a projektové snapshoty." },
];

const countLabels: Array<[keyof ProjectPackage["counts"], string]> = [
  ["scenes", "Scény"],
  ["shots", "Zábery"],
  ["assets", "Assety"],
  ["prompts", "Prompty"],
  ["outputs", "Výstupy"],
];

export default function App() {
  const [selectedSectionId, setSelectedSectionId] = useState<SectionId>("projects");
  const [project, setProject] = useState<ProjectPackage | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState("Pradávny kód");
  const [newProjectPath, setNewProjectPath] = useState("");
  const [openProjectPath, setOpenProjectPath] = useState("");
  const [statusMessage, setStatusMessage] = useState("Pripravené na lokálny projektový balík.");
  const [isBusy, setIsBusy] = useState(false);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? sections[0],
    [selectedSectionId],
  );
  const canUseProjectRuntime = hasDesktopProjectRuntime();
  const stats = project
    ? [
        { label: "Názov projektu", value: project.title },
        { label: "Priečinok projektu", value: project.folderPath },
        { label: "Vytvorené", value: formatDate(project.createdAt) },
        { label: "Aktualizované", value: formatDate(project.updatedAt) },
      ]
    : [
        { label: "Názov projektu", value: "Nie je otvorený" },
        { label: "Priečinok projektu", value: "Nie je vybraný" },
        { label: "Manifest", value: "project.llstory.json" },
        { label: "Workflow", value: "Asset → Záber → Prompt → Výstup" },
      ];

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runProjectAction(async () => {
      const createdProject = await createProjectPackage(newProjectTitle, newProjectPath);
      setProject(createdProject);
      setOpenProjectPath(createdProject.folderPath);
      setStatusMessage("Projektový balík bol vytvorený.");
    });
  }

  async function handleOpenProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runProjectAction(async () => {
      const openedProject = await openProjectPackage(openProjectPath);
      setProject(openedProject);
      setNewProjectTitle(openedProject.title);
      setStatusMessage("Projektový balík bol otvorený.");
    });
  }

  async function runProjectAction(action: () => Promise<void>) {
    if (!canUseProjectRuntime) {
      setStatusMessage("Akcie projektového balíka sú dostupné v desktopovej Tauri aplikácii.");
      return;
    }

    setIsBusy(true);
    setStatusMessage("Pracujem...");
    try {
      await action();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Produkčné sekcie">
        <div className="brand">
          <span className="brand-kicker">Lassi LAB</span>
          <h1>Storyboard</h1>
        </div>

        <nav className="nav-list">
          {sections.map((section) => (
            <button
              key={section.id}
              className={section.id === selectedSectionId ? "nav-item active" : "nav-item"}
              type="button"
              onClick={() => setSelectedSectionId(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <strong>Lokálny produkčný trezor</strong>
          <span>Bez účtov, bez cloud syncu, bez AI generovania v tomto základe.</span>
        </div>
      </aside>

      <section className="workspace" aria-label="Storyboard dashboard">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Základ produkčného balíka</p>
            <h2>Lassi LAB Storyboard</h2>
          </div>
          <span className="status-pill">Desktop režim</span>
        </header>

        <section className="dashboard-band" aria-label="Projektový dashboard">
          <div>
            <p className="eyebrow">Aktívny projekt</p>
            <h3>{project ? project.title : selectedSection.label}</h3>
            <p>{project ? project.folderPath : selectedSection.summary}</p>
          </div>
        </section>

        <section className="stats-grid" aria-label="Stav projektu">
          {stats.map((item) => (
            <div className="stat-tile" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>

        {project && (
          <section className="counts-grid" aria-label="Počty v projektovom balíku">
            {countLabels.map(([key, label]) => (
              <div className="count-tile" key={key}>
                <strong>{project.counts[key]}</strong>
                <span>{label}</span>
              </div>
            ))}
          </section>
        )}

        <section className="project-actions" aria-label="Akcie projektového balíka">
          <form className="action-panel" onSubmit={(event) => { void handleCreateProject(event); }}>
            <h3>Vytvoriť nový projekt</h3>
            <label>
              <span>Názov projektu</span>
              <input
                value={newProjectTitle}
                onChange={(event) => setNewProjectTitle(event.target.value)}
                placeholder="Pradávny kód"
              />
            </label>
            <label>
              <span>Cesta k priečinku projektu</span>
              <input
                value={newProjectPath}
                onChange={(event) => setNewProjectPath(event.target.value)}
                placeholder="C:\\Projects\\Pradávny kód"
              />
            </label>
            <button disabled={isBusy || !canUseProjectRuntime} type="submit">
              Vytvoriť balík
            </button>
          </form>

          <form className="action-panel" onSubmit={(event) => { void handleOpenProject(event); }}>
            <h3>Otvoriť existujúci projekt</h3>
            <label>
              <span>Cesta k priečinku projektu</span>
              <input
                value={openProjectPath}
                onChange={(event) => setOpenProjectPath(event.target.value)}
                placeholder="C:\\Projects\\Pradávny kód"
              />
            </label>
            <button disabled={isBusy || !canUseProjectRuntime} type="submit">
              Otvoriť balík
            </button>
          </form>
        </section>

        <section className="status-panel" aria-label="Stav projektového balíka">
          <span className={canUseProjectRuntime ? "runtime-dot ready" : "runtime-dot"} />
          <p>{statusMessage}</p>
        </section>
      </section>

      <aside className="inspector" aria-label="Inspector">
        <p className="eyebrow">Inšpektor</p>
        <h2>{project ? project.title : "Vybraná položka"}</h2>
        <div className="inspector-body">
          <span className="field-label">Sekcia</span>
          <strong>{selectedSection.label}</strong>
          <span className="field-label">ID projektu</span>
          <strong>{project?.projectId ?? "Žiadny projekt nie je otvorený"}</strong>
          <span className="field-label">Stav</span>
          <strong>{project ? "Projektový balík je otvorený" : "Zatiaľ iba zástupný obsah"}</strong>
          <span className="field-label">Úloha manifestu</span>
          <strong>{project ? `Schéma ${project.schemaVersion}` : "Pripravené pre budúce metadáta"}</strong>
        </div>
      </aside>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
