import { useEffect, useMemo, useState } from "react";
import {
  chooseTextTimingImportFile,
  chooseProjectFolder,
  createProjectPackage,
  hasDesktopProjectRuntime,
  openProjectPackage,
  readTextTimingImportFile,
  saveProjectTextTiming,
  type ProjectPackage,
  type ProjectText,
  type TimingBlock,
} from "./projectPackage";
import { parseTimingImport } from "./timingImport";

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

type StatItem = {
  label: string;
  value: string;
  kind?: "path";
};

type LastProject = {
  title: string;
  projectFolderPath: string;
  lastOpenedAt: string;
};

type TimingEditableField = "start" | "end" | "text" | "section" | "voice" | "notes";

const LAST_PROJECT_STORAGE_KEY = "lassiLabStoryboard.lastProject";

const emptyProjectText: ProjectText = {
  body: "",
  notes: "",
  updatedAt: "",
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
  ["scenes", "Počet scén"],
  ["shots", "Počet záberov"],
  ["assets", "Počet assetov"],
  ["prompts", "Počet promptov"],
  ["outputs", "Počet výstupov"],
];

export default function App() {
  const [selectedSectionId, setSelectedSectionId] = useState<SectionId>("projects");
  const [project, setProject] = useState<ProjectPackage | null>(null);
  const [lastProject, setLastProject] = useState<LastProject | null>(() => readLastProject());
  const [newProjectTitle, setNewProjectTitle] = useState("Pradávny kód");
  const [newProjectPath, setNewProjectPath] = useState("");
  const [openProjectPath, setOpenProjectPath] = useState("");
  const [statusMessage, setStatusMessage] = useState("Pripravené na lokálny projektový balík.");
  const [isBusy, setIsBusy] = useState(false);
  const [textDraft, setTextDraft] = useState<ProjectText>(emptyProjectText);
  const [timingDraft, setTimingDraft] = useState<TimingBlock[]>([]);
  const [timingImportText, setTimingImportText] = useState("");

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? sections[0],
    [selectedSectionId],
  );
  const canUseProjectRuntime = hasDesktopProjectRuntime();
  const stats: StatItem[] = project
    ? [
        { label: "Názov projektu", value: project.title },
        ...(project.parentFolderPath
          ? [{ label: "Rodičovský priečinok", value: project.parentFolderPath, kind: "path" as const }]
          : []),
        { label: "Projektový priečinok", value: project.folderPath, kind: "path" },
        { label: "Manifest", value: "project.llstory.json" },
        { label: "Vytvorené", value: formatDate(project.createdAt) },
        { label: "Upravené", value: formatDate(project.updatedAt) },
      ]
    : [];
  const hasIncompleteTiming = timingDraft.some((block) => !block.start.trim() || !block.end.trim());
  const hasUnsavedTextTimingChanges = useMemo(() => {
    if (!project) return false;

    return (
      JSON.stringify(projectTextForComparison(textDraft)) !== JSON.stringify(projectTextForComparison(project.text)) ||
      JSON.stringify(timingBlocksForComparison(timingDraft)) !== JSON.stringify(timingBlocksForComparison(project.timing))
    );
  }, [project, textDraft, timingDraft]);

  useEffect(() => {
    if (!project) {
      setTextDraft(emptyProjectText);
      setTimingDraft([]);
      return;
    }

    setTextDraft(normalizeProjectText(project.text));
    setTimingDraft(normalizeTimingBlocks(project.timing));
  }, [project]);

  useEffect(() => {
    if (!hasUnsavedTextTimingChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedTextTimingChanges]);

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runProjectAction(async () => {
      const createdProject = await createProjectPackage(newProjectTitle, newProjectPath);
      const normalizedProject = normalizeProjectPackage(createdProject);
      setProject(normalizedProject);
      setOpenProjectPath(normalizedProject.folderPath);
      rememberProject(normalizedProject);
      setStatusMessage("Projektový balík bol vytvorený v novom podpriečinku.");
    });
  }

  async function handleOpenProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runProjectAction(async () => {
      await openProjectFromPath(openProjectPath, "Projektový balík bol otvorený.");
    });
  }

  async function handleOpenLastProject() {
    if (!lastProject) {
      setStatusMessage("Žiadny posledný projekt nie je uložený.");
      return;
    }

    await runProjectAction(async () => {
      try {
        await openProjectFromPath(lastProject.projectFolderPath, "Posledný projekt bol otvorený.");
      } catch {
        setStatusMessage("Posledný projekt sa nepodarilo otvoriť. Skontroluj, či priečinok stále existuje.");
      }
    });
  }

  async function handleSaveText() {
    await saveTextTimingDraft("Text bol uložený do manifestu.");
  }

  async function handleSaveTiming() {
    await saveTextTimingDraft("Časovanie bolo uložené do manifestu.");
  }

  async function handleSaveProjectTextTiming() {
    await saveTextTimingDraft("Projekt bol uložený do project.llstory.json.");
  }

  function handleAddTimingBlock() {
    setTimingDraft((currentBlocks) => [...currentBlocks, createEmptyTimingBlock()]);
    setStatusMessage("Časový blok bol pridaný. Ulož časovanie, aby sa zapísalo do manifestu.");
  }

  function handleUpdateTimingBlock(id: string, field: TimingEditableField, value: string) {
    setTimingDraft((currentBlocks) =>
      currentBlocks.map((block) => (block.id === id ? { ...block, [field]: value } : block)),
    );
  }

  function handleDeleteTimingBlock(id: string) {
    const confirmed = window.confirm("Odstrániť tento časový blok?");
    if (!confirmed) return;

    setTimingDraft((currentBlocks) => currentBlocks.filter((block) => block.id !== id));
    setStatusMessage("Časový blok bol odstránený z návrhu. Ulož časovanie, aby sa zmena zapísala do manifestu.");
  }

  async function handleChooseTimingImportFile() {
    await runProjectAction(async () => {
      const filePath = await chooseTextTimingImportFile();
      if (!filePath) {
        setStatusMessage("Výber importovaného súboru bol zrušený.");
        return;
      }

      const importedText = await readTextTimingImportFile(filePath);
      setTimingImportText(importedText);
      setStatusMessage("Súbor bol načítaný do importu. Skontroluj ho a pridaj bloky do časovania.");
    });
  }

  function handleImportTimingBlocks() {
    if (!project) {
      setStatusMessage("Najprv vytvor alebo otvor projektový balík.");
      return;
    }

    const importResult = parseTimingImport(timingImportText);
    if (importResult.blocks.length === 0) {
      setStatusMessage("Import nenašiel žiadne časové bloky. Skontroluj formát textu alebo SRT.");
      return;
    }

    setTimingDraft((currentBlocks) => [...currentBlocks, ...importResult.blocks]);
    setTextDraft((currentText) =>
      currentText.body.trim() || !importResult.body.trim()
        ? currentText
        : { ...currentText, body: importResult.body },
    );
    setStatusMessage(
      `Import pridal ${importResult.blocks.length} časových blokov do návrhu. Uprav ich a potom ulož časovanie.`,
    );
  }

  async function handleChooseNewProjectFolder() {
    await runProjectAction(async () => {
      const folderPath = await chooseProjectFolder("Vyber rodičovský priečinok pre nový projekt");
      if (!folderPath) {
        setStatusMessage("Výber priečinka bol zrušený.");
        return;
      }

      setNewProjectPath(folderPath);
      setStatusMessage("Rodičovský priečinok je vybraný. Projekt sa vytvorí v novom projektovom priečinku.");
    });
  }

  async function handleChooseExistingProjectFolder() {
    await runProjectAction(async () => {
      const folderPath = await chooseProjectFolder("Vyber existujúci projektový balík");
      if (!folderPath) {
        setStatusMessage("Výber priečinka bol zrušený.");
        return;
      }

      setOpenProjectPath(folderPath);
      setStatusMessage("Priečinok existujúceho projektu je vybraný.");
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

  async function openProjectFromPath(folderPath: string, successMessage: string) {
    const openedProject = normalizeProjectPackage(await openProjectPackage(folderPath));
    setProject(openedProject);
    setNewProjectTitle(openedProject.title);
    setOpenProjectPath(openedProject.folderPath);
    rememberProject(openedProject);
    setStatusMessage(successMessage);
  }

  async function saveTextTimingDraft(successMessage: string) {
    const activeProject = project;
    if (!activeProject) {
      setStatusMessage("Najprv vytvor alebo otvor projektový balík.");
      return;
    }

    await runProjectAction(async () => {
      const savedProject = normalizeProjectPackage(
        await saveProjectTextTiming(activeProject.folderPath, normalizeProjectText(textDraft), normalizeTimingBlocks(timingDraft)),
      );
      setProject(savedProject);
      rememberProject(savedProject);
      setStatusMessage(successMessage);
    });
  }

  function rememberProject(projectPackage: ProjectPackage) {
    const savedProject = {
      title: projectPackage.title,
      projectFolderPath: projectPackage.folderPath,
      lastOpenedAt: new Date().toISOString(),
    };

    setLastProject(savedProject);
    writeLastProject(savedProject);
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
            <h3>{project ? project.title : "Žiadny projekt nie je otvorený"}</h3>
            <p className={project ? "dashboard-path" : undefined}>
              {project ? project.folderPath : "Vytvor alebo otvor produkčný balík."}
            </p>
          </div>
        </section>

        {stats.length > 0 && (
          <section className="stats-grid" aria-label="Stav projektu">
            {stats.map((item) => (
              <div className="stat-tile" key={item.label}>
                <span>{item.label}</span>
                <strong className={item.kind === "path" ? "path-value" : undefined} title={item.value}>
                  {item.value}
                </strong>
              </div>
            ))}
          </section>
        )}

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

        {selectedSectionId === "text-timing" && (
          <section className="text-timing-section" aria-label="Text a časovanie">
            {project ? (
              <>
                <section className="save-project-panel" aria-label="Uloženie projektu">
                  <div>
                    <div className="save-project-title">
                      <div>
                        <p className="eyebrow">Uloženie</p>
                        <h3>Uložiť projekt</h3>
                      </div>
                      <span className={hasUnsavedTextTimingChanges ? "dirty-pill" : "saved-pill"}>
                        {hasUnsavedTextTimingChanges ? "Neuložené zmeny" : "Uložené"}
                      </span>
                    </div>
                    <p>Text a časové bloky sa ukladajú do project.llstory.json v otvorenom projektovom priečinku.</p>
                    <p className="last-save-line">Naposledy uložené: {formatDate(project.updatedAt)}</p>
                    {hasUnsavedTextTimingChanges && (
                      <p className="save-note">Pred zatvorením appky alebo otvorením iného projektu klikni na Uložiť projekt.</p>
                    )}
                  </div>
                  <button disabled={isBusy || !canUseProjectRuntime} onClick={() => { void handleSaveProjectTextTiming(); }} type="button">
                    Uložiť projekt
                  </button>
                </section>

                <section className="text-editor-panel" aria-label="Text piesne alebo básne">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Text a časovanie</p>
                      <h3>Text projektu</h3>
                    </div>
                    <button disabled={isBusy || !canUseProjectRuntime} onClick={() => { void handleSaveText(); }} type="button">
                      Uložiť text
                    </button>
                  </div>
                  <label>
                    <span>Text piesne / básne</span>
                    <textarea
                      className="text-body-input"
                      value={textDraft.body}
                      onChange={(event) => setTextDraft((currentText) => ({ ...currentText, body: event.target.value }))}
                      placeholder="Sem vlož celý text piesne, básne alebo voiceoveru."
                    />
                  </label>
                  <label>
                    <span>Poznámky k textu</span>
                    <textarea
                      className="text-notes-input"
                      value={textDraft.notes}
                      onChange={(event) => setTextDraft((currentText) => ({ ...currentText, notes: event.target.value }))}
                      placeholder="Poznámky, verzie, jazykové úpravy alebo otvorené otázky."
                    />
                  </label>
                </section>

                <section className="timing-panel" aria-label="Časové bloky">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Časové bloky</p>
                      <h3>Riadky a sekcie</h3>
                    </div>
                    <div className="panel-actions">
                      <button disabled={isBusy || !canUseProjectRuntime} onClick={handleAddTimingBlock} type="button">
                        Pridať časový blok
                      </button>
                      <button disabled={isBusy || !canUseProjectRuntime} onClick={() => { void handleSaveTiming(); }} type="button">
                        Uložiť časovanie
                      </button>
                    </div>
                  </div>

                  <section className="timing-import-panel" aria-label="Import časovania">
                    <div className="panel-header compact">
                      <div>
                        <p className="eyebrow">Import</p>
                        <h4>TXT / SRT / copy-paste</h4>
                      </div>
                      <div className="panel-actions">
                        <button
                          className="secondary-button"
                          disabled={isBusy || !canUseProjectRuntime}
                          onClick={() => { void handleChooseTimingImportFile(); }}
                          type="button"
                        >
                          Vybrať TXT/SRT
                        </button>
                        <button disabled={isBusy || !timingImportText.trim()} onClick={handleImportTimingBlocks} type="button">
                          Pridať z importu
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="timing-import-input"
                      value={timingImportText}
                      onChange={(event) => setTimingImportText(event.target.value)}
                      placeholder="Speaker 1 / hlavný vokál&#10;(0:50) Nebo sa zavrelo.&#10;(0:53) Mračná sa kopia."
                    />
                    <p className="save-note">
                      Importné pole je len pracovná plocha. Ak chceš import uložiť do projektu, klikni najprv Pridať z importu a potom Uložiť projekt.
                    </p>
                    <p className="field-hint">
                      Import pridá bloky do návrhu a nič neuloží automaticky. Bloky môžeš upraviť v tabuľke a potom uložiť časovanie.
                    </p>
                  </section>

                  {hasIncompleteTiming && (
                    <p className="soft-warning">Niektoré bloky nemajú vyplnené pole Od alebo Do. V tejto verzii sa dajú uložiť aj tak.</p>
                  )}

                  {timingDraft.length === 0 ? (
                    <p className="empty-state">Zatiaľ nie sú pridané žiadne časové bloky.</p>
                  ) : (
                    <div className="timing-table" role="table" aria-label="Časovanie textu">
                      <div className="timing-header" role="row">
                        <span>Od</span>
                        <span>Do</span>
                        <span>Text / riadok</span>
                        <span>Sekcia</span>
                        <span>Hlas</span>
                        <span>Poznámka</span>
                        <span>Akcie</span>
                      </div>
                      {timingDraft.map((block) => (
                        <div className="timing-row" role="row" key={block.id}>
                          <input
                            aria-label="Od"
                            value={block.start}
                            onChange={(event) => handleUpdateTimingBlock(block.id, "start", event.target.value)}
                            placeholder="00:00"
                          />
                          <input
                            aria-label="Do"
                            value={block.end}
                            onChange={(event) => handleUpdateTimingBlock(block.id, "end", event.target.value)}
                            placeholder="00:07"
                          />
                          <textarea
                            aria-label="Text / riadok"
                            value={block.text}
                            onChange={(event) => handleUpdateTimingBlock(block.id, "text", event.target.value)}
                            placeholder="Text riadku alebo obrazu"
                          />
                          <input
                            aria-label="Sekcia"
                            value={block.section}
                            onChange={(event) => handleUpdateTimingBlock(block.id, "section", event.target.value)}
                            placeholder="verš"
                          />
                          <input
                            aria-label="Hlas"
                            value={block.voice}
                            onChange={(event) => handleUpdateTimingBlock(block.id, "voice", event.target.value)}
                            placeholder="hlas"
                          />
                          <textarea
                            aria-label="Poznámka"
                            value={block.notes}
                            onChange={(event) => handleUpdateTimingBlock(block.id, "notes", event.target.value)}
                            placeholder="poznámka"
                          />
                          <button
                            className="delete-button"
                            disabled={isBusy || !canUseProjectRuntime}
                            onClick={() => handleDeleteTimingBlock(block.id)}
                            type="button"
                          >
                            Odstrániť blok
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <section className="section-empty-panel">
                <p>Najprv vytvor alebo otvor projektový balík.</p>
              </section>
            )}
          </section>
        )}

        {lastProject && !project && (
          <section className="last-project-card" aria-label="Posledný projekt">
            <div>
              <p className="eyebrow">Posledný projekt</p>
              <h3>{lastProject.title}</h3>
              <p className="last-project-path">{lastProject.projectFolderPath}</p>
            </div>
            <div className="last-project-actions">
              <button disabled={isBusy || !canUseProjectRuntime} onClick={() => { void handleOpenLastProject(); }} type="button">
                Otvoriť posledný projekt
              </button>
              <button
                className="secondary-button"
                disabled={isBusy || !canUseProjectRuntime}
                onClick={() => { void handleChooseExistingProjectFolder(); }}
                type="button"
              >
                Vybrať iný projekt
              </button>
            </div>
          </section>
        )}

        <section className="project-actions" aria-label="Akcie projektového balíka">
          <form className="action-panel" onSubmit={(event) => { void handleCreateProject(event); }}>
            <h3>Nový projektový balík</h3>
            <label>
              <span>Názov projektu</span>
              <input
                value={newProjectTitle}
                onChange={(event) => setNewProjectTitle(event.target.value)}
                placeholder="Pradávny kód"
              />
            </label>
            <label>
              <span>Rodičovský priečinok</span>
              <span className="path-row">
                <input
                  value={newProjectPath}
                  onChange={(event) => setNewProjectPath(event.target.value)}
                  placeholder="F:\\Môj disk\\Storyboard projekty"
                />
                <button
                  className="secondary-button"
                  disabled={isBusy || !canUseProjectRuntime}
                  onClick={() => { void handleChooseNewProjectFolder(); }}
                  type="button"
                >
                  Vybrať priečinok
                </button>
              </span>
              <span className="field-hint">
                Vyber rodičovský priečinok. Appka v ňom vytvorí nový projektový priečinok podľa názvu projektu.
              </span>
            </label>
            <button disabled={isBusy || !canUseProjectRuntime} type="submit">
              Vytvoriť nový projekt
            </button>
          </form>

          <form className="action-panel" onSubmit={(event) => { void handleOpenProject(event); }}>
            <h3>Existujúci projektový balík</h3>
            <label>
              <span>Cesta k priečinku</span>
              <span className="path-row">
                <input
                  value={openProjectPath}
                  onChange={(event) => setOpenProjectPath(event.target.value)}
                  placeholder="C:\\Projects\\Pradávny kód"
                />
                <button
                  className="secondary-button"
                  disabled={isBusy || !canUseProjectRuntime}
                  onClick={() => { void handleChooseExistingProjectFolder(); }}
                  type="button"
                >
                  Vybrať priečinok
                </button>
              </span>
            </label>
            <button disabled={isBusy || !canUseProjectRuntime} type="submit">
              Otvoriť existujúci projekt
            </button>
          </form>
        </section>

        <section className="status-panel" aria-label="Stav projektového balíka">
          <span className={canUseProjectRuntime ? "runtime-dot ready" : "runtime-dot"} />
          <p>{statusMessage}</p>
        </section>
      </section>

      <aside className="inspector" aria-label="Inšpektor">
        <p className="eyebrow">Inšpektor</p>
        <h2>{project ? project.title : "Vybraná položka"}</h2>
        <div className="inspector-body">
          <span className="field-label">Sekcia</span>
          <strong>{selectedSection.label}</strong>
          <span className="field-label">ID projektu</span>
          <strong>{project?.projectId ?? "Žiadny projekt nie je otvorený"}</strong>
          <span className="field-label">Stav</span>
          <strong>{project ? "Projektový balík je otvorený" : selectedSection.summary}</strong>
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
  return date.toLocaleString("sk-SK");
}

function readLastProject(): LastProject | null {
  if (typeof window === "undefined") return null;

  try {
    const storedValue = window.localStorage.getItem(LAST_PROJECT_STORAGE_KEY);
    if (!storedValue) return null;

    const parsedValue = JSON.parse(storedValue) as Partial<LastProject>;
    if (
      typeof parsedValue.title !== "string" ||
      typeof parsedValue.projectFolderPath !== "string" ||
      typeof parsedValue.lastOpenedAt !== "string"
    ) {
      return null;
    }

    return {
      title: parsedValue.title,
      projectFolderPath: parsedValue.projectFolderPath,
      lastOpenedAt: parsedValue.lastOpenedAt,
    };
  } catch {
    return null;
  }
}

function writeLastProject(projectToSave: LastProject) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LAST_PROJECT_STORAGE_KEY, JSON.stringify(projectToSave));
  } catch {
    // Local storage is only a convenience; project packages remain the source of truth.
  }
}

function createEmptyTimingBlock(): TimingBlock {
  return {
    id: makeTimingBlockId(),
    start: "",
    end: "",
    text: "",
    section: "",
    voice: "",
    notes: "",
    linkedShotIds: [],
    linkedAssetIds: [],
    linkedOutputIds: [],
  };
}

function normalizeProjectPackage(projectPackage: ProjectPackage): ProjectPackage {
  return {
    ...projectPackage,
    text: normalizeProjectText(projectPackage.text),
    timing: normalizeTimingBlocks(projectPackage.timing),
  };
}

function normalizeProjectText(text: Partial<ProjectText> | null | undefined): ProjectText {
  return {
    body: typeof text?.body === "string" ? text.body : "",
    notes: typeof text?.notes === "string" ? text.notes : "",
    updatedAt: typeof text?.updatedAt === "string" ? text.updatedAt : "",
  };
}

function normalizeTimingBlocks(timing: Partial<TimingBlock>[] | null | undefined): TimingBlock[] {
  if (!Array.isArray(timing)) return [];

  return timing.map((block) => ({
    id: typeof block.id === "string" && block.id.trim() ? block.id : makeTimingBlockId(),
    start: typeof block.start === "string" ? block.start : "",
    end: typeof block.end === "string" ? block.end : "",
    text: typeof block.text === "string" ? block.text : "",
    section: typeof block.section === "string" ? block.section : "",
    voice: typeof block.voice === "string" ? block.voice : "",
    notes: typeof block.notes === "string" ? block.notes : "",
    linkedShotIds: Array.isArray(block.linkedShotIds) ? block.linkedShotIds : [],
    linkedAssetIds: Array.isArray(block.linkedAssetIds) ? block.linkedAssetIds : [],
    linkedOutputIds: Array.isArray(block.linkedOutputIds) ? block.linkedOutputIds : [],
  }));
}

function projectTextForComparison(text: Partial<ProjectText> | null | undefined) {
  const normalizedText = normalizeProjectText(text);
  return {
    body: normalizedText.body,
    notes: normalizedText.notes,
  };
}

function timingBlocksForComparison(timing: Partial<TimingBlock>[] | null | undefined) {
  if (!Array.isArray(timing)) return [];

  return timing.map((block) => ({
    id: typeof block.id === "string" ? block.id : "",
    start: typeof block.start === "string" ? block.start : "",
    end: typeof block.end === "string" ? block.end : "",
    text: typeof block.text === "string" ? block.text : "",
    section: typeof block.section === "string" ? block.section : "",
    voice: typeof block.voice === "string" ? block.voice : "",
    notes: typeof block.notes === "string" ? block.notes : "",
    linkedShotIds: Array.isArray(block.linkedShotIds) ? block.linkedShotIds : [],
    linkedAssetIds: Array.isArray(block.linkedAssetIds) ? block.linkedAssetIds : [],
    linkedOutputIds: Array.isArray(block.linkedOutputIds) ? block.linkedOutputIds : [],
  }));
}

function makeTimingBlockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `timing_${crypto.randomUUID()}`;
  }

  return `timing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
