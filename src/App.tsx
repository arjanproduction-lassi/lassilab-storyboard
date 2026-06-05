import { useEffect, useMemo, useRef, useState } from "react";
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

type TextLineSelection = {
  start: number;
  end: number;
  text: string;
  normalizedText: string;
  occurrence: number;
};

type FinalTextTimingCheck = {
  exact: boolean;
  firstMismatchLine: number | null;
  projectLine: string;
  timingLine: string;
};

type DraftSnapshot = {
  textDraft: ProjectText;
  timingDraft: TimingBlock[];
  selectedTimingBlockId: string | null;
  lastClickedTextLine: TextLineSelection | null;
};

type TimingEditableField = "start" | "end" | "text" | "section" | "voice" | "notes";
type TextPanelMode = "hidden" | "compact" | "expanded";

const LAST_PROJECT_STORAGE_KEY = "lassiLabStoryboard.lastProject";
const DRAFT_HISTORY_LIMIT = 40;

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
  const [selectedTimingBlockId, setSelectedTimingBlockId] = useState<string | null>(null);
  const [isTimingImportOpen, setIsTimingImportOpen] = useState(false);
  const [textPanelMode, setTextPanelMode] = useState<TextPanelMode>("compact");
  const [lastClickedTextLine, setLastClickedTextLine] = useState<TextLineSelection | null>(null);
  const [isTimingTextPreviewOpen, setIsTimingTextPreviewOpen] = useState(false);
  const [finalTextTimingCheck, setFinalTextTimingCheck] = useState<FinalTextTimingCheck | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const textBodyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const timingRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const undoStackRef = useRef<DraftSnapshot[]>([]);
  const redoStackRef = useRef<DraftSnapshot[]>([]);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? sections[0],
    [selectedSectionId],
  );
  const isTextTimingWorkspace = selectedSectionId === "text-timing";
  const showProjectOverview = selectedSectionId === "projects";
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
  const selectedTimingBlock = useMemo(
    () => timingDraft.find((block) => block.id === selectedTimingBlockId) ?? null,
    [selectedTimingBlockId, timingDraft],
  );
  const generatedTimingText = useMemo(() => buildExactTextFromTiming(timingDraft), [timingDraft]);
  const canUndoDraft = undoStackRef.current.length > 0;
  const canRedoDraft = redoStackRef.current.length > 0;
  void historyVersion;

  useEffect(() => {
    if (!project) {
      setTextDraft(emptyProjectText);
      setTimingDraft([]);
      setSelectedTimingBlockId(null);
      setLastClickedTextLine(null);
      setIsTimingTextPreviewOpen(false);
      setFinalTextTimingCheck(null);
      clearDraftHistory();
      return;
    }

    const normalizedTiming = normalizeTimingBlocks(project.timing);
    setTextDraft(normalizeProjectText(project.text));
    setTimingDraft(normalizedTiming);
    setLastClickedTextLine(null);
    setIsTimingTextPreviewOpen(false);
    setFinalTextTimingCheck(null);
    clearDraftHistory();
    setSelectedTimingBlockId((currentId) =>
      currentId && normalizedTiming.some((block) => block.id === currentId)
        ? currentId
        : normalizedTiming[0]?.id ?? null,
    );
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

  useEffect(() => {
    if (!selectedTimingBlockId || selectedSectionId !== "text-timing") return;

    timingRowRefs.current[selectedTimingBlockId]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedSectionId, selectedTimingBlockId]);

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

  async function handleSaveProjectTextTiming() {
    await saveTextTimingDraft("Projekt bol uložený do project.llstory.json.");
  }

  function recordDraftHistory() {
    if (!project) return;

    const snapshot = makeDraftSnapshot(textDraft, timingDraft, selectedTimingBlockId, lastClickedTextLine);
    const lastSnapshot = undoStackRef.current[undoStackRef.current.length - 1];
    if (lastSnapshot && draftSnapshotsAreEqual(lastSnapshot, snapshot)) return;

    undoStackRef.current = [...undoStackRef.current, snapshot].slice(-DRAFT_HISTORY_LIMIT);
    redoStackRef.current = [];
    setHistoryVersion((version) => version + 1);
  }

  function clearDraftHistory() {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setHistoryVersion((version) => version + 1);
  }

  function applyDraftSnapshot(snapshot: DraftSnapshot) {
    setTextDraft(snapshot.textDraft);
    setTimingDraft(snapshot.timingDraft);
    setSelectedTimingBlockId(snapshot.selectedTimingBlockId);
    setLastClickedTextLine(snapshot.lastClickedTextLine);
    setFinalTextTimingCheck(null);
  }

  function handleUndoDraft() {
    const previousSnapshot = undoStackRef.current[undoStackRef.current.length - 1];
    if (!previousSnapshot) return;

    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [
      ...redoStackRef.current,
      makeDraftSnapshot(textDraft, timingDraft, selectedTimingBlockId, lastClickedTextLine),
    ].slice(-DRAFT_HISTORY_LIMIT);
    applyDraftSnapshot(previousSnapshot);
    setHistoryVersion((version) => version + 1);
    setStatusMessage("Posledná zmena bola vrátená späť.");
  }

  function handleRedoDraft() {
    const nextSnapshot = redoStackRef.current[redoStackRef.current.length - 1];
    if (!nextSnapshot) return;

    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [
      ...undoStackRef.current,
      makeDraftSnapshot(textDraft, timingDraft, selectedTimingBlockId, lastClickedTextLine),
    ].slice(-DRAFT_HISTORY_LIMIT);
    applyDraftSnapshot(nextSnapshot);
    setHistoryVersion((version) => version + 1);
    setStatusMessage("Vrátená zmena bola obnovená.");
  }

  function handleAddTimingBlock() {
    recordDraftHistory();
    const newBlock = createEmptyTimingBlock();
    setTimingDraft((currentBlocks) => [...currentBlocks, newBlock]);
    setSelectedTimingBlockId(newBlock.id);
    setStatusMessage("Časový blok bol pridaný. Ulož časovanie, aby sa zapísalo do manifestu.");
  }

  function handleUpdateTimingBlock(id: string, field: TimingEditableField, value: string) {
    recordDraftHistory();
    setFinalTextTimingCheck(null);
    setTimingDraft((currentBlocks) =>
      currentBlocks.map((block) => (block.id === id ? { ...block, [field]: value } : block)),
    );
  }

  function handleUpdateProjectTextBody(value: string) {
    recordDraftHistory();
    setFinalTextTimingCheck(null);
    setTextDraft((currentText) => ({ ...currentText, body: value }));
  }

  function handleUpdateProjectTextNotes(value: string) {
    recordDraftHistory();
    setTextDraft((currentText) => ({ ...currentText, notes: value }));
  }

  function handleSelectTimingBlock(block: TimingBlock) {
    setSelectedTimingBlockId(block.id);
    scrollTextToTimingBlock(block);
  }

  function handleTextBodyClick(event: React.MouseEvent<HTMLTextAreaElement>) {
    const line = getTextLineSelectionAtCaret(event.currentTarget.value, event.currentTarget.selectionStart);
    setLastClickedTextLine(line);
    if (!line.normalizedText) return;

    const matchingBlock = findTimingBlockForTextLine(line, timingDraft, selectedTimingBlockId);
    if (!matchingBlock) {
      setStatusMessage("Nenašiel sa zodpovedajúci časový blok.");
      return;
    }

    setSelectedTimingBlockId(matchingBlock.id);
    setStatusMessage("Časový blok podľa textového riadku bol vybraný.");
  }

  function scrollTextToTimingBlock(block: TimingBlock) {
    if (textPanelMode === "hidden") return;

    const textarea = textBodyInputRef.current;
    const normalizedText = normalizeTextLineForMatch(block.text);
    if (!textarea || !normalizedText) return;

    const matchingLine = findTextLineRange(textarea.value, normalizedText);
    if (!matchingLine) return;

    window.requestAnimationFrame(() => {
      textarea.setSelectionRange(matchingLine.start, matchingLine.end);
      scrollTextareaToLine(textarea, matchingLine.start);
    });
  }

  function handleUseClickedLineInTimingBlock() {
    if (!selectedTimingBlock || !lastClickedTextLine?.text.trim()) {
      setStatusMessage("Najprv vyber časový blok a klikni na riadok v texte.");
      return;
    }

    handleUpdateTimingBlock(selectedTimingBlock.id, "text", lastClickedTextLine.text.trim());
    setStatusMessage("Text riadku bol prevzatý do časového bloku.");
  }

  function handleUseTimingBlockInProjectText() {
    if (!selectedTimingBlock?.text.trim() || !lastClickedTextLine) {
      setStatusMessage("Najprv vyber časový blok a klikni na riadok v texte.");
      return;
    }

    const replacedText = replaceSelectedTextLine(textDraft.body, lastClickedTextLine, selectedTimingBlock.text.trim());
    if (!replacedText) {
      setStatusMessage("Riadok v hlavnom texte sa nepodarilo bezpečne nájsť.");
      return;
    }

    recordDraftHistory();
    setTextDraft((currentText) => ({ ...currentText, body: replacedText.body }));
    setLastClickedTextLine(replacedText.selection);
    setStatusMessage("Text z časovania bol prevzatý do hlavného textu. Ulož projekt, aby sa zmena zapísala.");
  }

  function handlePrepareTextFromTiming() {
    setIsTimingTextPreviewOpen(true);
    setStatusMessage(
      generatedTimingText.trim()
        ? "Text z časovania bol pripravený ako návrh."
        : "Časovanie zatiaľ neobsahuje text pre návrh.",
    );
  }

  function handleCheckFinalTextTimingMatch() {
    const checkResult = compareProjectTextWithTimingText(textDraft.body, generatedTimingText);
    setFinalTextTimingCheck(checkResult);
    setStatusMessage(
      checkResult.exact
        ? "Text a časovanie sedia presne."
        : "Text a časovanie sa líšia. Pred finálnym exportom ich zosúlaď.",
    );
  }

  function handleReplaceMainTextFromTiming() {
    if (!generatedTimingText.trim()) {
      setStatusMessage("Časovanie zatiaľ neobsahuje text pre návrh.");
      return;
    }

    const confirmed = window.confirm("Nahradiť hlavný text textom z časovania? Zmena sa zapíše až po kliknutí na Uložiť.");
    if (!confirmed) return;

    recordDraftHistory();
    setTextDraft((currentText) => ({ ...currentText, body: generatedTimingText }));
    setFinalTextTimingCheck(null);
    setStatusMessage("Hlavný text bol nahradený návrhom z časovania. Ulož projekt, aby sa zmena zapísala.");
  }

  async function handleCopyGeneratedTimingText() {
    if (!generatedTimingText.trim()) {
      setStatusMessage("Časovanie zatiaľ neobsahuje text na kopírovanie.");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedTimingText);
      setStatusMessage("Text z časovania bol skopírovaný do schránky.");
    } catch {
      setStatusMessage("Kopírovanie cez schránku nie je dostupné. Text ostáva v náhľade a dá sa označiť ručne.");
    }
  }

  function handleDeleteTimingBlock(id: string) {
    const confirmed = window.confirm("Odstrániť tento časový blok?");
    if (!confirmed) return;

    recordDraftHistory();
    setTimingDraft((currentBlocks) => currentBlocks.filter((block) => block.id !== id));
    setSelectedTimingBlockId((currentId) => (currentId === id ? null : currentId));
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

    recordDraftHistory();
    setTimingDraft((currentBlocks) => [...currentBlocks, ...importResult.blocks]);
    setSelectedTimingBlockId((currentId) => currentId ?? importResult.blocks[0]?.id ?? null);
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
          <strong>Lokálny trezor</strong>
          <span>Bez účtov, bez cloud syncu, bez AI generovania.</span>
        </div>
      </aside>

      <section className="main-column" aria-label="Pracovná plocha">
        <header className="topbar" aria-label="Stav projektu">
          <div className="topbar-title">
            <span className="topbar-app">Lassi LAB Storyboard</span>
            <strong title={project?.title ?? undefined}>{project ? project.title : "Bez otvoreného projektu"}</strong>
            <span>{selectedSection.label}</span>
          </div>
          <div className="topbar-actions">
            <span className={project && hasUnsavedTextTimingChanges ? "dirty-pill" : "saved-pill"}>
              {project ? (hasUnsavedTextTimingChanges ? "Neuložené zmeny" : "Uložené") : "Bez projektu"}
            </span>
            {project && <span className="last-save">Naposledy uložené: {formatDate(project.updatedAt)}</span>}
            {project && isTextTimingWorkspace && (
              <>
                <button
                  className="toolbar-secondary-button"
                  disabled={!canUndoDraft}
                  onClick={handleUndoDraft}
                  type="button"
                >
                  Späť
                </button>
                <button
                  className="toolbar-secondary-button"
                  disabled={!canRedoDraft}
                  onClick={handleRedoDraft}
                  type="button"
                >
                  Znova
                </button>
              </>
            )}
            <button
              disabled={!project || isBusy || !canUseProjectRuntime}
              onClick={() => { void handleSaveProjectTextTiming(); }}
              type="button"
            >
              Uložiť
            </button>
          </div>
        </header>

        <section
          className={isTextTimingWorkspace ? "workspace workbench-workspace" : "workspace"}
          aria-label="Aktívna pracovná plocha"
        >
          {showProjectOverview && (
            <>
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
            </>
          )}

          {selectedSectionId === "text-timing" && (
            <section className={`text-timing-section text-mode-${textPanelMode}`} aria-label="Text a časovanie">
              {project ? (
                <>
                  <section className={`text-editor-panel text-dock ${textPanelMode}`} aria-label="Text piesne alebo básne">
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">Text projektu</p>
                        <h3>Text piesne / básne</h3>
                        <p className="dock-summary">
                          {textDraft.body.trim() ? `${textDraft.body.trim().split(/\s+/).length} slov` : "Text ešte nie je vyplnený"}
                        </p>
                      </div>
                      <div className="panel-mode-actions" aria-label="Režim textového panelu" role="group">
                        <button
                          aria-pressed={textPanelMode === "hidden"}
                          className={textPanelMode === "hidden" ? "mode-button active" : "mode-button"}
                          onClick={() => setTextPanelMode("hidden")}
                          type="button"
                        >
                          Skryť text
                        </button>
                        <button
                          aria-pressed={textPanelMode === "compact"}
                          className={textPanelMode === "compact" ? "mode-button active" : "mode-button"}
                          onClick={() => setTextPanelMode("compact")}
                          type="button"
                        >
                          Zobraziť text
                        </button>
                        <button
                          aria-pressed={textPanelMode === "expanded"}
                          className={textPanelMode === "expanded" ? "mode-button active" : "mode-button"}
                          onClick={() => setTextPanelMode("expanded")}
                          type="button"
                        >
                          Zväčšiť text
                        </button>
                      </div>
                    </div>
                    {textPanelMode !== "hidden" && (
                      <div className="text-dock-grid">
                        <label>
                          <span>Text piesne / básne</span>
                          <textarea
                            className="text-body-input"
                            ref={textBodyInputRef}
                            value={textDraft.body}
                            onClick={handleTextBodyClick}
                            onChange={(event) => handleUpdateProjectTextBody(event.target.value)}
                            placeholder="Sem vlož celý text piesne, básne alebo voiceoveru."
                          />
                        </label>
                        <label>
                          <span>Poznámky k textu</span>
                          <textarea
                            className="text-notes-input"
                            value={textDraft.notes}
                            onChange={(event) => handleUpdateProjectTextNotes(event.target.value)}
                            placeholder="Poznámky, verzie, jazykové úpravy alebo otvorené otázky."
                          />
                        </label>
                      </div>
                    )}
                  </section>

                  <section className="timing-panel timing-workspace" aria-label="Časové bloky">
                    <div className="panel-header timing-toolbar">
                      <div>
                        <p className="eyebrow">Časové bloky</p>
                        <h3>Timing list</h3>
                        <p className="dock-summary">{timingDraft.length} blokov</p>
                      </div>
                      <div className="panel-actions">
                        <button
                          className="secondary-button"
                          disabled={timingDraft.length === 0}
                          onClick={handlePrepareTextFromTiming}
                          type="button"
                        >
                          Vytvoriť text z časovania
                        </button>
                        <button
                          className="secondary-button"
                          disabled={timingDraft.length === 0}
                          onClick={handleCheckFinalTextTimingMatch}
                          type="button"
                        >
                          Skontrolovať zhodu textu a časovania
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => setIsTimingImportOpen((isOpen) => !isOpen)}
                          type="button"
                        >
                          {isTimingImportOpen ? "Skryť import" : "Import TXT/SRT"}
                        </button>
                        <button disabled={isBusy || !canUseProjectRuntime} onClick={handleAddTimingBlock} type="button">
                          Pridať blok
                        </button>
                      </div>
                    </div>

                    {isTimingImportOpen && (
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
                          Importné pole je len pracovná plocha. Ak chceš import uložiť do projektu, klikni najprv Pridať z importu a potom Uložiť.
                        </p>
                      </section>
                    )}

                    {isTimingTextPreviewOpen && (
                      <section className="timing-text-preview-panel" aria-label="Náhľad textu z časovania">
                        <div className="panel-header compact">
                          <div>
                            <p className="eyebrow">Náhľad textu z časovania</p>
                            <h4>Text z timing blokov</h4>
                          </div>
                          <div className="panel-actions">
                            <button
                              className="secondary-button"
                              disabled={!generatedTimingText.trim()}
                              onClick={() => { void handleCopyGeneratedTimingText(); }}
                              type="button"
                            >
                              Kopírovať text
                            </button>
                            <button
                              disabled={!generatedTimingText.trim()}
                              onClick={handleReplaceMainTextFromTiming}
                              type="button"
                            >
                              Nahradiť hlavný text textom z časovania
                            </button>
                          </div>
                        </div>
                        <textarea
                          className="timing-text-preview-input"
                          readOnly
                          value={generatedTimingText}
                          placeholder="Text z časovania sa zobrazí tu."
                        />
                        <p className="save-note">
                          Návrh nič neprepisuje automaticky. Hlavný text sa zmení až po potvrdení a uloží sa až cez Uložiť.
                        </p>
                      </section>
                    )}

                    {finalTextTimingCheck && (
                      <section
                        className={finalTextTimingCheck.exact ? "final-match-panel exact" : "final-match-panel mismatch"}
                        aria-label="Finálna zhoda textu a časovania"
                      >
                        {finalTextTimingCheck.exact ? (
                          <strong>Text a časovanie sedia presne.</strong>
                        ) : (
                          <>
                            <strong>Text a časovanie sa líšia. Pred finálnym exportom ich zosúlaď.</strong>
                            <span>Prvý rozdiel: riadok {finalTextTimingCheck.firstMismatchLine}</span>
                            <span>Projekt: {finalTextTimingCheck.projectLine || "—"}</span>
                            <span>Časovanie: {finalTextTimingCheck.timingLine || "—"}</span>
                            <button
                              className="secondary-button"
                              disabled={!generatedTimingText.trim()}
                              onClick={handleReplaceMainTextFromTiming}
                              type="button"
                            >
                              Nahradiť hlavný text textom z časovania
                            </button>
                          </>
                        )}
                      </section>
                    )}

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
                          <span>Sekcia</span>
                          <span>Hlas</span>
                          <span>Text / riadok</span>
                          <span>Pozn.</span>
                          <span>Akcie</span>
                        </div>
                        {timingDraft.map((block) => (
                          <div
                            aria-selected={block.id === selectedTimingBlockId}
                            className={block.id === selectedTimingBlockId ? "timing-row active" : "timing-row"}
                            key={block.id}
                            onClick={() => handleSelectTimingBlock(block)}
                            onKeyDown={(event) => {
                              if (
                                event.target instanceof HTMLInputElement ||
                                event.target instanceof HTMLTextAreaElement ||
                                event.target instanceof HTMLButtonElement
                              ) {
                                return;
                              }

                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleSelectTimingBlock(block);
                              }
                            }}
                            ref={(element) => {
                              timingRowRefs.current[block.id] = element;
                            }}
                            role="row"
                            tabIndex={0}
                          >
                            <input
                              aria-label="Od"
                              className="timing-row-input time-cell"
                              onClick={(event) => event.stopPropagation()}
                              onFocus={() => setSelectedTimingBlockId(block.id)}
                              onChange={(event) => handleUpdateTimingBlock(block.id, "start", event.target.value)}
                              placeholder="—"
                              value={block.start}
                            />
                            <input
                              aria-label="Do"
                              className="timing-row-input time-cell"
                              onClick={(event) => event.stopPropagation()}
                              onFocus={() => setSelectedTimingBlockId(block.id)}
                              onChange={(event) => handleUpdateTimingBlock(block.id, "end", event.target.value)}
                              placeholder="—"
                              value={block.end}
                            />
                            <input
                              aria-label="Sekcia"
                              className="timing-row-input compact-cell"
                              onClick={(event) => event.stopPropagation()}
                              onFocus={() => setSelectedTimingBlockId(block.id)}
                              onChange={(event) => handleUpdateTimingBlock(block.id, "section", event.target.value)}
                              placeholder="—"
                              title={block.section}
                              value={block.section}
                            />
                            <input
                              aria-label="Hlas"
                              className="timing-row-input compact-cell"
                              onClick={(event) => event.stopPropagation()}
                              onFocus={() => setSelectedTimingBlockId(block.id)}
                              onChange={(event) => handleUpdateTimingBlock(block.id, "voice", event.target.value)}
                              placeholder="—"
                              title={block.voice}
                              value={block.voice}
                            />
                            <input
                              aria-label="Text alebo riadok"
                              className="timing-row-input text-cell"
                              onClick={(event) => event.stopPropagation()}
                              onFocus={() => setSelectedTimingBlockId(block.id)}
                              onChange={(event) => handleUpdateTimingBlock(block.id, "text", event.target.value)}
                              placeholder="Bez textu"
                              title={block.text}
                              value={block.text}
                            />
                            <input
                              aria-label="Poznámka"
                              className="timing-row-input compact-cell"
                              onClick={(event) => event.stopPropagation()}
                              onFocus={() => setSelectedTimingBlockId(block.id)}
                              onChange={(event) => handleUpdateTimingBlock(block.id, "notes", event.target.value)}
                              placeholder="—"
                              title={block.notes}
                              value={block.notes}
                            />
                            <button
                              className="delete-button"
                              disabled={isBusy || !canUseProjectRuntime}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteTimingBlock(block.id);
                              }}
                              type="button"
                            >
                              Odstrániť
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <section className="section-empty-panel workbench-empty">
                  <h3>Najprv vytvor alebo otvor projektový balík.</h3>
                  <p>Text a časovanie sa ukladajú do project.llstory.json v otvorenom projektovom priečinku.</p>
                </section>
              )}
            </section>
          )}

          {!showProjectOverview && selectedSectionId !== "text-timing" && (
            <section className="section-empty-panel workbench-empty">
              <p className="eyebrow">{selectedSection.label}</p>
              <h3>{project ? selectedSection.label : "Najprv vytvor alebo otvor projektový balík."}</h3>
              <p>
                {project
                  ? `${selectedSection.summary} Táto pracovná sekcia je pripravená na ďalší pass.`
                  : "Projektové akcie nájdeš v sekcii Projekty."}
              </p>
            </section>
          )}
        </section>

        <footer className="bottom-dock" aria-label="Stav aplikácie">
          <span className={canUseProjectRuntime ? "runtime-dot ready" : "runtime-dot"} />
          <span>{statusMessage}</span>
          <strong>Spodný dock pripravený pre časovú os a importné stavy.</strong>
        </footer>
      </section>

      <aside className="inspector" aria-label="Inšpektor">
        <p className="eyebrow">Inšpektor</p>
        {project && isTextTimingWorkspace ? (
          <>
            <h2>{selectedTimingBlock ? "Vybraný časový blok" : "Text a časovanie"}</h2>
            {selectedTimingBlock ? (
              <div className="inspector-body inspector-editor">
                <div className="inspector-field-row">
                  <label>
                    <span className="field-label">Od</span>
                    <input
                      value={selectedTimingBlock.start}
                      onChange={(event) => handleUpdateTimingBlock(selectedTimingBlock.id, "start", event.target.value)}
                      placeholder="00:00"
                    />
                  </label>
                  <label>
                    <span className="field-label">Do</span>
                    <input
                      value={selectedTimingBlock.end}
                      onChange={(event) => handleUpdateTimingBlock(selectedTimingBlock.id, "end", event.target.value)}
                      placeholder="00:07"
                    />
                  </label>
                </div>
                <label>
                  <span className="field-label">Text</span>
                  <textarea
                    value={selectedTimingBlock.text}
                    onChange={(event) => handleUpdateTimingBlock(selectedTimingBlock.id, "text", event.target.value)}
                    placeholder="Text alebo riadok"
                  />
                </label>
                <div className="inspector-field-row">
                  <label>
                    <span className="field-label">Sekcia</span>
                    <input
                      value={selectedTimingBlock.section}
                      onChange={(event) => handleUpdateTimingBlock(selectedTimingBlock.id, "section", event.target.value)}
                      placeholder="verš"
                    />
                  </label>
                  <label>
                    <span className="field-label">Hlas</span>
                    <input
                      value={selectedTimingBlock.voice}
                      onChange={(event) => handleUpdateTimingBlock(selectedTimingBlock.id, "voice", event.target.value)}
                      placeholder="hlas"
                    />
                  </label>
                </div>
                <label>
                  <span className="field-label">Poznámka</span>
                  <textarea
                    value={selectedTimingBlock.notes}
                    onChange={(event) => handleUpdateTimingBlock(selectedTimingBlock.id, "notes", event.target.value)}
                    placeholder="Poznámka k bloku"
                  />
                </label>
                <div className="sync-tools" aria-label="Text a timing synchronizácia">
                  <span className="field-label">Text ↔ timing</span>
                  <p>
                    {lastClickedTextLine?.text.trim()
                      ? `Posledný riadok: ${lastClickedTextLine.text.trim()}`
                      : "Klikni na riadok v hlavnom texte a potom môžeš ručne zosúladiť vybraný blok."}
                  </p>
                  <button
                    className="secondary-button"
                    disabled={!lastClickedTextLine?.text.trim()}
                    onClick={handleUseClickedLineInTimingBlock}
                    type="button"
                  >
                    Prevziať text z riadku
                  </button>
                  <button
                    className="secondary-button"
                    disabled={!selectedTimingBlock.text.trim() || !lastClickedTextLine}
                    onClick={handleUseTimingBlockInProjectText}
                    type="button"
                  >
                    Prevziať text z časovania
                  </button>
                </div>
                <button
                  className="delete-button"
                  disabled={isBusy || !canUseProjectRuntime}
                  onClick={() => handleDeleteTimingBlock(selectedTimingBlock.id)}
                  type="button"
                >
                  Odstrániť blok
                </button>
              </div>
            ) : (
              <div className="inspector-body">
                <strong>Vyber časový blok zo zoznamu.</strong>
                <span className="field-label">Počet blokov</span>
                <strong>{timingDraft.length}</strong>
              </div>
            )}
          </>
        ) : (
          <>
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
          </>
        )}
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

function normalizeTextLineForMatch(value: string) {
  return value
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,!?:;…]+$/u, "")
    .trim()
    .toLocaleLowerCase("sk-SK");
}

function getTextLineSelectionAtCaret(text: string, caretIndex: number): TextLineSelection {
  const line = getTextLineAtCaret(text, caretIndex);
  const normalizedText = normalizeTextLineForMatch(line.text);

  return {
    ...line,
    normalizedText,
    occurrence: normalizedText ? countTextLineOccurrenceUntil(text, line.start, normalizedText) : 0,
  };
}

function getTextLineAtCaret(text: string, caretIndex: number) {
  const safeCaretIndex = Math.max(0, Math.min(caretIndex, text.length));
  const lineStart = text.lastIndexOf("\n", Math.max(0, safeCaretIndex - 1)) + 1;
  const nextLineBreak = text.indexOf("\n", safeCaretIndex);
  const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;

  return {
    start: lineStart,
    end: lineEnd,
    text: text.slice(lineStart, lineEnd),
  };
}

function findTimingBlockForTextLine(
  line: TextLineSelection,
  timing: TimingBlock[],
  selectedTimingBlockId: string | null,
) {
  const selectedIndex = timing.findIndex((block) => block.id === selectedTimingBlockId);
  const selectedBlock = selectedIndex >= 0 ? timing[selectedIndex] : null;
  const selectedBlockOccurrence =
    selectedBlock && normalizeTextLineForMatch(selectedBlock.text) === line.normalizedText
      ? countTimingOccurrenceUntil(timing, selectedIndex, line.normalizedText)
      : 0;
  const forwardStartIndex =
    selectedIndex >= 0 && line.occurrence > selectedBlockOccurrence ? selectedIndex + 1 : Math.max(0, selectedIndex);
  const forwardMatch =
    selectedIndex >= 0
      ? timing
          .slice(forwardStartIndex)
          .find((block) => normalizeTextLineForMatch(block.text) === line.normalizedText)
      : null;

  if (forwardMatch) return forwardMatch;

  const occurrenceMatches = timing.filter((block) => normalizeTextLineForMatch(block.text) === line.normalizedText);
  return occurrenceMatches[line.occurrence - 1] ?? null;
}

function findTextLineRange(text: string, normalizedLine: string) {
  let lineStart = 0;

  while (lineStart <= text.length) {
    const nextLineBreak = text.indexOf("\n", lineStart);
    const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
    const lineText = text.slice(lineStart, lineEnd);

    if (normalizeTextLineForMatch(lineText) === normalizedLine) {
      return {
        start: lineStart,
        end: lineEnd,
        text: lineText,
      };
    }

    if (nextLineBreak === -1) break;
    lineStart = nextLineBreak + 1;
  }

  return null;
}

function countTextLineOccurrenceUntil(text: string, targetStart: number, normalizedLine: string) {
  let lineStart = 0;
  let occurrence = 0;

  while (lineStart <= text.length) {
    const nextLineBreak = text.indexOf("\n", lineStart);
    const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
    const lineText = text.slice(lineStart, lineEnd);

    if (normalizeTextLineForMatch(lineText) === normalizedLine) {
      occurrence += 1;
    }

    if (lineStart >= targetStart || nextLineBreak === -1) break;
    lineStart = nextLineBreak + 1;
  }

  return occurrence;
}

function countTimingOccurrenceUntil(timing: TimingBlock[], targetIndex: number, normalizedLine: string) {
  return timing
    .slice(0, targetIndex + 1)
    .filter((block) => normalizeTextLineForMatch(block.text) === normalizedLine).length;
}

function replaceSelectedTextLine(text: string, selection: TextLineSelection, replacementLine: string) {
  const currentLineAtStoredRange = text.slice(selection.start, selection.end);
  const matchingLine =
    currentLineAtStoredRange === selection.text
      ? selection
      : findTextLineRange(text, selection.normalizedText);

  if (!matchingLine) return null;

  const nextBody = `${text.slice(0, matchingLine.start)}${replacementLine}${text.slice(matchingLine.end)}`;
  const nextSelection: TextLineSelection = {
    start: matchingLine.start,
    end: matchingLine.start + replacementLine.length,
    text: replacementLine,
    normalizedText: normalizeTextLineForMatch(replacementLine),
    occurrence: countTextLineOccurrenceUntil(nextBody, matchingLine.start, normalizeTextLineForMatch(replacementLine)),
  };

  return {
    body: nextBody,
    selection: nextSelection,
  };
}

function buildExactTextFromTiming(timing: TimingBlock[]) {
  return timing
    .filter((block) => block.text.trim())
    .map((block) => block.text)
    .join("\n");
}

function compareProjectTextWithTimingText(projectText: string, timingText: string): FinalTextTimingCheck {
  if (projectText === timingText) {
    return {
      exact: true,
      firstMismatchLine: null,
      projectLine: "",
      timingLine: "",
    };
  }

  const projectLines = projectText.split("\n");
  const timingLines = timingText.split("\n");
  const maxLineCount = Math.max(projectLines.length, timingLines.length);

  for (let index = 0; index < maxLineCount; index += 1) {
    const projectLine = projectLines[index] ?? "";
    const timingLine = timingLines[index] ?? "";

    if (projectLine !== timingLine) {
      return {
        exact: false,
        firstMismatchLine: index + 1,
        projectLine,
        timingLine,
      };
    }
  }

  return {
    exact: false,
    firstMismatchLine: maxLineCount + 1,
    projectLine: "",
    timingLine: "",
  };
}

function makeDraftSnapshot(
  textDraft: ProjectText,
  timingDraft: TimingBlock[],
  selectedTimingBlockId: string | null,
  lastClickedTextLine: TextLineSelection | null,
): DraftSnapshot {
  return {
    textDraft: { ...textDraft },
    timingDraft: timingDraft.map((block) => ({
      ...block,
      linkedShotIds: [...block.linkedShotIds],
      linkedAssetIds: [...block.linkedAssetIds],
      linkedOutputIds: [...block.linkedOutputIds],
    })),
    selectedTimingBlockId,
    lastClickedTextLine: lastClickedTextLine ? { ...lastClickedTextLine } : null,
  };
}

function draftSnapshotsAreEqual(firstSnapshot: DraftSnapshot, secondSnapshot: DraftSnapshot) {
  return JSON.stringify(firstSnapshot) === JSON.stringify(secondSnapshot);
}

function scrollTextareaToLine(textarea: HTMLTextAreaElement, lineStart: number) {
  const textBeforeLine = textarea.value.slice(0, lineStart);
  const lineIndex = textBeforeLine.split(/\r\n|\r|\n/).length - 1;
  const computedStyle = window.getComputedStyle(textarea);
  const parsedLineHeight = Number.parseFloat(computedStyle.lineHeight);
  const parsedFontSize = Number.parseFloat(computedStyle.fontSize);
  const lineHeight = Number.isNaN(parsedLineHeight)
    ? Number.isNaN(parsedFontSize)
      ? 20
      : parsedFontSize * 1.35
    : parsedLineHeight;

  textarea.scrollTop = Math.max(0, lineIndex * lineHeight - textarea.clientHeight / 3);
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
