import { useEffect, useMemo, useRef, useState } from "react";
import {
  chooseTextTimingImportFile,
  chooseProjectFolder,
  createProjectPackage,
  hasDesktopProjectRuntime,
  openProjectPackage,
  saveProjectSections,
  readTextTimingImportFile,
  type Scene,
  type Shot,
  type ShotStatus,
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
type SceneEditableField = "title" | "description" | "notes" | "startTime" | "endTime";
type ShotEditableField = "title" | "description" | "visualIntent" | "emotion" | "motifs" | "notes" | "status";
type RightDockTab = "inspector" | "overview";
type ScenesShotsResizeKind = "scenes-shots" | "shots-editor" | "scene-shot-editor" | "right-dock";
type SceneShotEditorMode = "both" | "scene" | "shot";

type RightDockState = {
  selectedTab: RightDockTab;
  collapsed: boolean;
};

type ScenesShotsLayout = {
  scenes: number;
  shots: number;
  editor: number;
  sceneEditor: number;
  dock: number;
};

const SHOT_EDITOR_MIN_WIDTH = 420;

const LAST_PROJECT_STORAGE_KEY = "lassiLabStoryboard.lastProject";
const RIGHT_DOCK_STORAGE_KEY = "lassiLabStoryboard.rightDock";
const SCENES_SHOTS_LAYOUT_STORAGE_KEY = "lassiLabStoryboard.scenesShotsLayout";
const SCENE_SHOT_EDITOR_MODE_STORAGE_KEY = "lassiLabStoryboard.sceneShotEditorMode";
const DRAFT_HISTORY_LIMIT = 40;
const SCENE_EDITOR_MIN_WIDTH = 340;
const defaultScenesShotsLayout: ScenesShotsLayout = {
  scenes: 280,
  shots: 360,
  editor: 720,
  sceneEditor: 400,
  dock: 260,
};
const scenesShotsLayoutLimits: Record<keyof ScenesShotsLayout, { min: number; max: number }> = {
  scenes: { min: 220, max: 520 },
  shots: { min: 260, max: 760 },
  editor: { min: 520, max: 1280 },
  sceneEditor: { min: SCENE_EDITOR_MIN_WIDTH, max: 860 },
  dock: { min: 240, max: 560 },
};
const SCENE_SHOT_EDITOR_STACK_WIDTH = SCENE_EDITOR_MIN_WIDTH + SHOT_EDITOR_MIN_WIDTH + 40;
const shotStatusOptions: Array<{ value: ShotStatus; label: string }> = [
  { value: "draft", label: "Návrh" },
  { value: "approved", label: "Schválený" },
  { value: "used", label: "Použitý" },
  { value: "rejected", label: "Zamietnutý" },
  { value: "archived", label: "Archivovaný" },
];

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
  const [sceneDraft, setSceneDraft] = useState<Scene[]>([]);
  const [shotDraft, setShotDraft] = useState<Shot[]>([]);
  const [timingImportText, setTimingImportText] = useState("");
  const [selectedTimingBlockId, setSelectedTimingBlockId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [isTimingImportOpen, setIsTimingImportOpen] = useState(false);
  const [textPanelMode, setTextPanelMode] = useState<TextPanelMode>("compact");
  const [lastClickedTextLine, setLastClickedTextLine] = useState<TextLineSelection | null>(null);
  const [isTimingTextPreviewOpen, setIsTimingTextPreviewOpen] = useState(false);
  const [finalTextTimingCheck, setFinalTextTimingCheck] = useState<FinalTextTimingCheck | null>(null);
  const [rightDockTab, setRightDockTab] = useState<RightDockTab>(() => readRightDockState().selectedTab);
  const [isRightDockCollapsed, setIsRightDockCollapsed] = useState(() => readRightDockState().collapsed);
  const [scenesShotsLayout, setScenesShotsLayout] = useState<ScenesShotsLayout>(() => readScenesShotsLayout());
  const [sceneShotEditorMode, setSceneShotEditorMode] = useState<SceneShotEditorMode>(() => readSceneShotEditorMode());
  const [sceneShotEditorWidth, setSceneShotEditorWidth] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  const textBodyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const timingRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sceneShotEditorPanelRef = useRef<HTMLDivElement | null>(null);
  const undoStackRef = useRef<DraftSnapshot[]>([]);
  const redoStackRef = useRef<DraftSnapshot[]>([]);

  const appShellStyle = {
    "--right-dock-width": `${scenesShotsLayout.dock}px`,
  } as React.CSSProperties & Record<string, string>;
  const scenesShotsSectionStyle = {
    "--scenes-column-width": `${scenesShotsLayout.scenes}px`,
    "--shots-column-width": `${scenesShotsLayout.shots}px`,
    "--editor-column-width": `${scenesShotsLayout.editor}px`,
    "--scene-editor-width": `${scenesShotsLayout.sceneEditor}px`,
  } as React.CSSProperties & Record<string, string>;

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? sections[0],
    [selectedSectionId],
  );
  const isTextTimingWorkspace = selectedSectionId === "text-timing";
  const isScenesShotsWorkspace = selectedSectionId === "scenes-shots";
  const isSceneShotEditorStacked =
    (sceneShotEditorWidth || scenesShotsLayout.editor) < SCENE_SHOT_EDITOR_STACK_WIDTH;
  const isSceneEditorVisible = sceneShotEditorMode !== "shot";
  const isShotEditorVisible = sceneShotEditorMode !== "scene";
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
  const hasUnsavedScenesShotsChanges = useMemo(() => {
    if (!project) return false;

    return (
      JSON.stringify(scenesForComparison(sceneDraft)) !== JSON.stringify(scenesForComparison(project.scenes)) ||
      JSON.stringify(shotsForComparison(shotDraft)) !== JSON.stringify(shotsForComparison(project.shots))
    );
  }, [project, sceneDraft, shotDraft]);
  const hasUnsavedProjectChanges = hasUnsavedTextTimingChanges || hasUnsavedScenesShotsChanges;
  const selectedTimingBlock = useMemo(
    () => timingDraft.find((block) => block.id === selectedTimingBlockId) ?? null,
    [selectedTimingBlockId, timingDraft],
  );
  const orderedScenes = useMemo(() => [...sceneDraft].sort(compareByOrder), [sceneDraft]);
  const selectedScene = useMemo(
    () => sceneDraft.find((scene) => scene.id === selectedSceneId) ?? orderedScenes[0] ?? null,
    [orderedScenes, sceneDraft, selectedSceneId],
  );
  const selectedSceneShots = useMemo(
    () => (selectedScene ? shotDraft.filter((shot) => shot.sceneId === selectedScene.id).sort(compareByOrder) : []),
    [selectedScene, shotDraft],
  );
  const selectedShot = useMemo(
    () => selectedSceneShots.find((shot) => shot.id === selectedShotId) ?? selectedSceneShots[0] ?? null,
    [selectedSceneShots, selectedShotId],
  );
  const generatedTimingText = useMemo(() => buildExactTextFromTiming(timingDraft), [timingDraft]);
  const scenesShotsOverview = useMemo(
    () => buildScenesShotsOverview(project?.title ?? "Bez otvoreného projektu", sceneDraft, shotDraft),
    [project?.title, sceneDraft, shotDraft],
  );
  const canUndoDraft = undoStackRef.current.length > 0;
  const canRedoDraft = redoStackRef.current.length > 0;
  void historyVersion;

  useEffect(() => {
    if (!project) {
      setTextDraft(emptyProjectText);
      setTimingDraft([]);
      setSceneDraft([]);
      setShotDraft([]);
      setSelectedTimingBlockId(null);
      setSelectedSceneId(null);
      setSelectedShotId(null);
      setLastClickedTextLine(null);
      setIsTimingTextPreviewOpen(false);
      setFinalTextTimingCheck(null);
      clearDraftHistory();
      return;
    }

    const normalizedTiming = normalizeTimingBlocks(project.timing);
    const normalizedScenes = normalizeScenes(project.scenes);
    const normalizedShots = normalizeShots(project.shots);
    setTextDraft(normalizeProjectText(project.text));
    setTimingDraft(normalizedTiming);
    setSceneDraft(normalizedScenes);
    setShotDraft(normalizedShots);
    setLastClickedTextLine(null);
    setIsTimingTextPreviewOpen(false);
    setFinalTextTimingCheck(null);
    clearDraftHistory();
    setSelectedTimingBlockId((currentId) =>
      currentId && normalizedTiming.some((block) => block.id === currentId)
        ? currentId
        : normalizedTiming[0]?.id ?? null,
    );
    setSelectedSceneId((currentId) =>
      currentId && normalizedScenes.some((scene) => scene.id === currentId)
        ? currentId
        : [...normalizedScenes].sort(compareByOrder)[0]?.id ?? null,
    );
    setSelectedShotId((currentId) =>
      currentId && normalizedShots.some((shot) => shot.id === currentId)
        ? currentId
        : [...normalizedShots].sort(compareByOrder)[0]?.id ?? null,
    );
  }, [project]);

  useEffect(() => {
    if (!hasUnsavedProjectChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedProjectChanges]);

  useEffect(() => {
    writeRightDockState({
      selectedTab: rightDockTab,
      collapsed: isRightDockCollapsed,
    });
  }, [isRightDockCollapsed, rightDockTab]);

  useEffect(() => {
    writeScenesShotsLayout(scenesShotsLayout);
  }, [scenesShotsLayout]);

  useEffect(() => {
    writeSceneShotEditorMode(sceneShotEditorMode);
  }, [sceneShotEditorMode]);

  useEffect(() => {
    if (selectedSectionId !== "scenes-shots") return;
    const editorPanel = sceneShotEditorPanelRef.current;
    if (!editorPanel) return;

    const updateEditorWidth = () => {
      setSceneShotEditorWidth(Math.round(editorPanel.getBoundingClientRect().width));
    };

    updateEditorWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateEditorWidth);
      return () => window.removeEventListener("resize", updateEditorWidth);
    }

    const resizeObserver = new ResizeObserver(updateEditorWidth);
    resizeObserver.observe(editorPanel);
    return () => resizeObserver.disconnect();
  }, [isRightDockCollapsed, scenesShotsLayout.dock, scenesShotsLayout.editor, scenesShotsLayout.scenes, scenesShotsLayout.shots, selectedSectionId]);

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

  async function handleSaveProjectDraft() {
    await saveProjectDraft("Projekt bol uložený do project.llstory.json.");
  }

  function handleResetScenesShotsLayout() {
    setScenesShotsLayout(defaultScenesShotsLayout);
    setIsRightDockCollapsed(false);
    setRightDockTab("inspector");
    setSceneShotEditorMode("both");
    setStatusMessage("Rozloženie pracovnej plochy bolo resetované.");
  }

  function handleStartScenesShotsResize(kind: ScenesShotsResizeKind, event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startLayout = scenesShotsLayout;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;

      setScenesShotsLayout(() => {
        if (kind === "scenes-shots") {
          return normalizeScenesShotsLayout({
            ...startLayout,
            scenes: startLayout.scenes + deltaX,
            shots: startLayout.shots - deltaX,
          });
        }

        if (kind === "shots-editor") {
          return normalizeScenesShotsLayout({
            ...startLayout,
            shots: startLayout.shots + deltaX,
            editor: startLayout.editor - deltaX,
          });
        }

        if (kind === "scene-shot-editor") {
          const editorWidth = sceneShotEditorPanelRef.current?.getBoundingClientRect().width ?? startLayout.editor;
          const splitHandleWidth = 8;
          const minimumShotEditorWidth = SHOT_EDITOR_MIN_WIDTH;
          const maximumSceneEditorWidth = Math.max(
            scenesShotsLayoutLimits.sceneEditor.min,
            Math.min(scenesShotsLayoutLimits.sceneEditor.max, editorWidth - splitHandleWidth - minimumShotEditorWidth),
          );

          return normalizeScenesShotsLayout({
            ...startLayout,
            sceneEditor: Math.min(maximumSceneEditorWidth, startLayout.sceneEditor + deltaX),
          });
        }

        return normalizeScenesShotsLayout({
          ...startLayout,
          dock: startLayout.dock - deltaX,
        });
      });
    };

    const handleMouseUp = () => {
      document.body.classList.remove("is-resizing-columns");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    document.body.classList.add("is-resizing-columns");
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
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

  async function handleCopyScenesShotsOverview() {
    if (!scenesShotsOverview.trim()) {
      setStatusMessage("Prehľad zatiaľ neobsahuje text na kopírovanie.");
      return;
    }

    try {
      await navigator.clipboard.writeText(scenesShotsOverview);
      setStatusMessage("Prehľad scén a záberov bol skopírovaný do schránky.");
    } catch {
      setStatusMessage("Kopírovanie cez schránku nie je dostupné. Prehľad ostáva označiteľný ručne.");
    }
  }

  function handleCreateScene() {
    const scene = createEmptyScene(sceneDraft.length + 1);
    setSceneDraft((currentScenes) => reorderItems([...currentScenes, scene]));
    setSelectedSceneId(scene.id);
    setSelectedShotId(null);
    setStatusMessage("Scéna bola pridaná. Ulož projekt, aby sa zapísala do manifestu.");
  }

  function handleUpdateScene(id: string, field: SceneEditableField, value: string) {
    setSceneDraft((currentScenes) =>
      currentScenes.map((scene) =>
        scene.id === id
          ? {
              ...scene,
              [field]: nullableTimeField(field, value),
              updatedAt: new Date().toISOString(),
            }
          : scene,
      ),
    );
  }

  function handleDeleteScene(id: string) {
    const hasShots = shotDraft.some((shot) => shot.sceneId === id);
    if (hasShots) {
      setStatusMessage("Scénu nie je možné odstrániť, kým obsahuje zábery.");
      return;
    }

    const confirmed = window.confirm("Odstrániť túto scénu?");
    if (!confirmed) return;

    const remainingScenes = reorderItems(sceneDraft.filter((scene) => scene.id !== id));
    setSceneDraft(remainingScenes);
    setSelectedSceneId((currentId) => (currentId === id ? remainingScenes[0]?.id ?? null : currentId));
    setStatusMessage("Scéna bola odstránená. Ulož projekt, aby sa zmena zapísala.");
  }

  function handleMoveScene(id: string, direction: -1 | 1) {
    const movedScenes = moveOrderedItem(sceneDraft, id, direction);
    setSceneDraft(movedScenes);
    setStatusMessage("Poradie scén bolo upravené. Ulož projekt, aby sa zmena zapísala.");
  }

  function handleCreateShot() {
    if (!selectedScene) {
      setStatusMessage("Najprv vytvor alebo vyber scénu.");
      return;
    }

    const shot = createEmptyShot(selectedScene.id, selectedSceneShots.length + 1);
    setShotDraft((currentShots) => reorderShots([...currentShots, shot]));
    setSelectedShotId(shot.id);
    setStatusMessage("Záber bol pridaný pod vybranú scénu. Ulož projekt, aby sa zapísal.");
  }

  function handleUpdateShot(id: string, field: ShotEditableField, value: string) {
    setShotDraft((currentShots) =>
      currentShots.map((shot) =>
        shot.id === id
          ? {
              ...shot,
              [field]: normalizeShotField(field, value),
              updatedAt: new Date().toISOString(),
            }
          : shot,
      ),
    );
  }

  function handleDeleteShot(id: string) {
    const confirmed = window.confirm("Odstrániť tento záber?");
    if (!confirmed) return;

    const shotToDelete = shotDraft.find((shot) => shot.id === id);
    const remainingShots = reorderShots(shotDraft.filter((shot) => shot.id !== id));
    setShotDraft(remainingShots);
    setSelectedShotId((currentId) => {
      if (currentId !== id) return currentId;
      const sceneShots = remainingShots.filter((shot) => shot.sceneId === shotToDelete?.sceneId).sort(compareByOrder);
      return sceneShots[0]?.id ?? null;
    });
    setStatusMessage("Záber bol odstránený. Ulož projekt, aby sa zmena zapísala.");
  }

  function handleMoveShot(id: string, direction: -1 | 1) {
    const shot = shotDraft.find((item) => item.id === id);
    if (!shot) return;

    const sceneShots = shotDraft.filter((item) => item.sceneId === shot.sceneId);
    const movedSceneShots = moveOrderedItem(sceneShots, id, direction);
    setShotDraft((currentShots) =>
      reorderShots(currentShots.map((item) => movedSceneShots.find((movedShot) => movedShot.id === item.id) ?? item)),
    );
    setStatusMessage("Poradie záberov bolo upravené. Ulož projekt, aby sa zmena zapísala.");
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

  async function saveProjectDraft(successMessage: string) {
    const activeProject = project;
    if (!activeProject) {
      setStatusMessage("Najprv vytvor alebo otvor projektový balík.");
      return;
    }

    await runProjectAction(async () => {
      const savedProject = normalizeProjectPackage(
        await saveProjectSections(
          activeProject.folderPath,
          normalizeProjectText(textDraft),
          normalizeTimingBlocks(timingDraft),
          normalizeScenes(sceneDraft),
          normalizeShots(shotDraft),
        ),
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
    <main className={isRightDockCollapsed ? "app-shell right-dock-collapsed" : "app-shell"} style={appShellStyle}>
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
            <span className={project && hasUnsavedProjectChanges ? "dirty-pill" : "saved-pill"}>
              {project ? (hasUnsavedProjectChanges ? "Neuložené zmeny" : "Uložené") : "Bez projektu"}
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
            {project && isScenesShotsWorkspace && (
              <button className="toolbar-secondary-button" onClick={handleResetScenesShotsLayout} type="button">
                Reset rozloženia
              </button>
            )}
            <button
              disabled={!project || isBusy || !canUseProjectRuntime}
              onClick={() => { void handleSaveProjectDraft(); }}
              type="button"
            >
              Uložiť
            </button>
          </div>
        </header>

        <section
          className={isTextTimingWorkspace || isScenesShotsWorkspace ? "workspace workbench-workspace" : "workspace"}
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

          {selectedSectionId === "scenes-shots" && (
            <section className="scenes-shots-section" style={scenesShotsSectionStyle} aria-label="Scény a zábery">
              {project ? (
                <>
                  <section className="scene-list-panel" aria-label="Scény">
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">Scény</p>
                        <h3>Príbehové jednotky</h3>
                        <p className="dock-summary">{orderedScenes.length} scén</p>
                      </div>
                      <button disabled={isBusy || !canUseProjectRuntime} onClick={handleCreateScene} type="button">
                        Pridať scénu
                      </button>
                    </div>

                    {orderedScenes.length === 0 ? (
                      <p className="empty-state">Zatiaľ nie sú vytvorené žiadne scény.</p>
                    ) : (
                      <div className="scene-list">
                        {orderedScenes.map((scene, index) => {
                          const shotCount = shotDraft.filter((shot) => shot.sceneId === scene.id).length;

                          return (
                            <div
                              className={scene.id === selectedScene?.id ? "scene-row active" : "scene-row"}
                              key={scene.id}
                              onClick={() => {
                                setSelectedSceneId(scene.id);
                                const firstShot = shotDraft.filter((shot) => shot.sceneId === scene.id).sort(compareByOrder)[0];
                                setSelectedShotId(firstShot?.id ?? null);
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <div>
                                <strong title={scene.title || undefined}>
                                  {scene.title ? `${index + 1}. ${scene.title}` : `Scéna ${index + 1}`}
                                </strong>
                                <span>{shotCount} záberov</span>
                              </div>
                              <div className="row-actions">
                                <button
                                  className="secondary-button"
                                  disabled={index === 0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleMoveScene(scene.id, -1);
                                  }}
                                  type="button"
                                >
                                  Hore
                                </button>
                                <button
                                  className="secondary-button"
                                  disabled={index === orderedScenes.length - 1}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleMoveScene(scene.id, 1);
                                  }}
                                  type="button"
                                >
                                  Dole
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <div
                    aria-label="Zmeniť šírku scén a záberov"
                    className="column-resize-handle"
                    onMouseDown={(event) => handleStartScenesShotsResize("scenes-shots", event)}
                    role="separator"
                  />

                  <section className="shot-list-panel" aria-label="Zábery">
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">Zábery</p>
                        <h3>{selectedScene ? selectedScene.title || "Vybraná scéna" : "Vyber scénu"}</h3>
                        <p className="dock-summary">{selectedSceneShots.length} záberov v scéne</p>
                      </div>
                      <button disabled={!selectedScene || isBusy || !canUseProjectRuntime} onClick={handleCreateShot} type="button">
                        Pridať záber
                      </button>
                    </div>

                    {!selectedScene ? (
                      <p className="empty-state">Najprv vytvor alebo vyber scénu.</p>
                    ) : selectedSceneShots.length === 0 ? (
                      <p className="empty-state">Táto scéna zatiaľ nemá žiadne zábery.</p>
                    ) : (
                      <div className="shot-list">
                        {selectedSceneShots.map((shot, index) => (
                          <div
                            className={shot.id === selectedShot?.id ? "shot-row active" : "shot-row"}
                            key={shot.id}
                            onClick={() => setSelectedShotId(shot.id)}
                            role="button"
                            tabIndex={0}
                          >
                            <div>
                              <strong title={shot.title || undefined}>
                                {shot.title ? `${index + 1}. ${shot.title}` : `Záber ${index + 1}`}
                              </strong>
                              <span>{shot.visualIntent || shot.description || "Tvorivý zámer zatiaľ nie je vyplnený"}</span>
                            </div>
                            <span className="status-pill">{shotStatusLabel(shot.status)}</span>
                            <div className="row-actions">
                              <button
                                className="secondary-button"
                                disabled={index === 0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleMoveShot(shot.id, -1);
                                }}
                                type="button"
                              >
                                Hore
                              </button>
                              <button
                                className="secondary-button"
                                disabled={index === selectedSceneShots.length - 1}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleMoveShot(shot.id, 1);
                                }}
                                type="button"
                              >
                                Dole
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <div
                    aria-label="Zmeniť šírku záberov a editora"
                    className="column-resize-handle"
                    onMouseDown={(event) => handleStartScenesShotsResize("shots-editor", event)}
                    role="separator"
                  />

                  <section className="scene-shot-editor-container" aria-label="Editor scény a záberu">
                    <div className="editor-visibility-bar">
                      <div>
                        <p className="eyebrow">Editor</p>
                        <h3>
                          {sceneShotEditorMode === "scene"
                            ? "Editor scény"
                            : sceneShotEditorMode === "shot"
                              ? "Editor záberu"
                              : "Editor scény a záberu"}
                        </h3>
                      </div>
                      <div className="panel-mode-actions" role="group" aria-label="Viditeľnosť editorov">
                        <button
                          aria-pressed={sceneShotEditorMode === "both"}
                          className={sceneShotEditorMode === "both" ? "mode-button active" : "mode-button"}
                          onClick={() => setSceneShotEditorMode("both")}
                          type="button"
                        >
                          Oboje
                        </button>
                        <button
                          aria-pressed={sceneShotEditorMode === "scene"}
                          className={sceneShotEditorMode === "scene" ? "mode-button active" : "mode-button"}
                          onClick={() => setSceneShotEditorMode("scene")}
                          type="button"
                        >
                          Scéna
                        </button>
                        <button
                          aria-pressed={sceneShotEditorMode === "shot"}
                          className={sceneShotEditorMode === "shot" ? "mode-button active" : "mode-button"}
                          onClick={() => setSceneShotEditorMode("shot")}
                          type="button"
                        >
                          Záber
                        </button>
                      </div>
                    </div>

                    <div
                      className={[
                        "scene-shot-editor-panel",
                        isSceneShotEditorStacked ? "stacked" : "",
                        `mode-${sceneShotEditorMode}`,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      ref={sceneShotEditorPanelRef}
                      aria-label="Editor scény a záberu"
                    >
                    {isSceneEditorVisible && selectedScene ? (
                      <div className="editor-group scene-editor-group">
                        <div className="panel-header compact">
                          <div>
                            <p className="eyebrow">Editor scény</p>
                            <h3>{selectedScene.title || "Nová scéna"}</h3>
                          </div>
                          <button
                            className="delete-button"
                            disabled={shotDraft.some((shot) => shot.sceneId === selectedScene.id)}
                            onClick={() => handleDeleteScene(selectedScene.id)}
                            type="button"
                          >
                            Odstrániť scénu
                          </button>
                        </div>
                        <label>
                          <span>Názov scény</span>
                          <input
                            value={selectedScene.title}
                            onChange={(event) => handleUpdateScene(selectedScene.id, "title", event.target.value)}
                            placeholder="Scene 01 – Sucho"
                          />
                        </label>
                        <label>
                          <span>Opis</span>
                          <textarea
                            className="editor-textarea-medium"
                            value={selectedScene.description}
                            wrap="soft"
                            onChange={(event) => handleUpdateScene(selectedScene.id, "description", event.target.value)}
                            placeholder="Príbehový alebo emočný opis scény."
                          />
                        </label>
                        <div className="editor-field-row">
                          <label>
                            <span>Začiatok</span>
                            <input
                              value={selectedScene.startTime ?? ""}
                              onChange={(event) => handleUpdateScene(selectedScene.id, "startTime", event.target.value)}
                              placeholder="00:00"
                            />
                          </label>
                          <label>
                            <span>Koniec</span>
                            <input
                              value={selectedScene.endTime ?? ""}
                              onChange={(event) => handleUpdateScene(selectedScene.id, "endTime", event.target.value)}
                              placeholder="00:30"
                            />
                          </label>
                        </div>
                        <label>
                          <span>Poznámky</span>
                          <textarea
                            className="editor-textarea-medium"
                            value={selectedScene.notes}
                            wrap="soft"
                            onChange={(event) => handleUpdateScene(selectedScene.id, "notes", event.target.value)}
                            placeholder="Poznámky k scéne."
                          />
                        </label>
                      </div>
                    ) : isSceneEditorVisible ? (
                      <p className="empty-state">Vyber alebo vytvor scénu.</p>
                    ) : null}

                    {sceneShotEditorMode === "both" && (
                      <div
                        aria-label="Zmeniť šírku editorov scény a záberu"
                        className="editor-split-handle"
                        onMouseDown={(event) => handleStartScenesShotsResize("scene-shot-editor", event)}
                        role="separator"
                      />
                    )}

                    {isShotEditorVisible && selectedShot ? (
                      <div className="editor-group shot-editor-group">
                        <div className="panel-header compact">
                          <div>
                            <p className="eyebrow">Editor záberu</p>
                            <h3>{selectedShot.title || "Nový záber"}</h3>
                          </div>
                          <button className="delete-button" onClick={() => handleDeleteShot(selectedShot.id)} type="button">
                            Odstrániť záber
                          </button>
                        </div>
                        <label>
                          <span>Názov záberu</span>
                          <input
                            value={selectedShot.title}
                            onChange={(event) => handleUpdateShot(selectedShot.id, "title", event.target.value)}
                            placeholder="Bosá noha vstupuje do hliny"
                          />
                        </label>
                        <label>
                          <span>Tvorivý zámer</span>
                          <textarea
                            className="editor-textarea-medium"
                            value={selectedShot.visualIntent}
                            wrap="soft"
                            onChange={(event) => handleUpdateShot(selectedShot.id, "visualIntent", event.target.value)}
                            placeholder="Aký obraz alebo myšlienku má záber niesť?"
                          />
                        </label>
                        <label>
                          <span>Opis</span>
                          <textarea
                            className="editor-textarea-large"
                            value={selectedShot.description}
                            wrap="soft"
                            onChange={(event) => handleUpdateShot(selectedShot.id, "description", event.target.value)}
                            placeholder="Krátky opis plánovaného obrazu."
                          />
                        </label>
                        <div className="editor-field-row">
                          <label>
                            <span>Emócia</span>
                            <input
                              value={selectedShot.emotion}
                              onChange={(event) => handleUpdateShot(selectedShot.id, "emotion", event.target.value)}
                              placeholder="ticho, smútok, prijatie"
                            />
                          </label>
                          <label>
                            <span>Stav</span>
                            <select
                              value={selectedShot.status}
                              onChange={(event) => handleUpdateShot(selectedShot.id, "status", event.target.value)}
                            >
                              {shotStatusOptions.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label>
                          <span>Motívy</span>
                          <input
                            value={selectedShot.motifs.join(", ")}
                            onChange={(event) => handleUpdateShot(selectedShot.id, "motifs", event.target.value)}
                            placeholder="voda, hlina, črep"
                          />
                        </label>
                        <label>
                          <span>Poznámky</span>
                          <textarea
                            className="editor-textarea-large"
                            value={selectedShot.notes}
                            wrap="soft"
                            onChange={(event) => handleUpdateShot(selectedShot.id, "notes", event.target.value)}
                            placeholder="Poznámky k záberu."
                          />
                        </label>
                      </div>
                    ) : isShotEditorVisible ? (
                      <p className="empty-state">Vyber alebo vytvor záber pod vybranou scénou.</p>
                    ) : null}
                    </div>
                  </section>
                </>
              ) : (
                <section className="section-empty-panel workbench-empty">
                  <h3>Najprv vytvor alebo otvor projektový balík.</h3>
                  <p>Scény a zábery sa ukladajú do project.llstory.json v otvorenom projektovom priečinku.</p>
                </section>
              )}
            </section>
          )}

          {!showProjectOverview && selectedSectionId !== "text-timing" && selectedSectionId !== "scenes-shots" && (
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

      <aside
        className={isRightDockCollapsed ? "inspector right-dock collapsed" : "inspector right-dock"}
        aria-label="Pravý dock"
      >
        {isRightDockCollapsed ? (
          <button className="dock-restore-button" onClick={() => setIsRightDockCollapsed(false)} type="button">
            Dock
          </button>
        ) : (
          <>
            {isScenesShotsWorkspace && (
              <div
                aria-label="Zmeniť šírku pravého docku"
                className="right-dock-resize-handle"
                onMouseDown={(event) => handleStartScenesShotsResize("right-dock", event)}
                role="separator"
              />
            )}
            <div className="right-dock-top">
              <div className="right-dock-tabs" role="tablist" aria-label="Pravý dock">
                <button
                  aria-selected={rightDockTab === "inspector"}
                  className={rightDockTab === "inspector" ? "dock-tab active" : "dock-tab"}
                  onClick={() => setRightDockTab("inspector")}
                  role="tab"
                  type="button"
                >
                  Inšpektor
                </button>
                <button
                  aria-selected={rightDockTab === "overview"}
                  className={rightDockTab === "overview" ? "dock-tab active" : "dock-tab"}
                  onClick={() => setRightDockTab("overview")}
                  role="tab"
                  type="button"
                >
                  Prehľad
                </button>
              </div>
              <button className="dock-collapse-button" onClick={() => setIsRightDockCollapsed(true)} type="button">
                Skryť
              </button>
            </div>

            {rightDockTab === "overview" ? (
              <section className="overview-panel" aria-label="Prehľad scén a záberov">
                <div className="dock-context">
                  <strong>{project?.title ?? "Bez otvoreného projektu"}</strong>
                  <span>Scény a zábery</span>
                </div>
                <button
                  className="secondary-button"
                  disabled={!project || !scenesShotsOverview.trim()}
                  onClick={() => { void handleCopyScenesShotsOverview(); }}
                  type="button"
                >
                  Kopírovať prehľad
                </button>
                <pre className="overview-text">{scenesShotsOverview}</pre>
              </section>
            ) : (
              <section className="inspector-panel" aria-label="Inšpektor">
                <div className="dock-context">
                  <strong>{project?.title ?? "Bez otvoreného projektu"}</strong>
                  <span>{selectedSection.label}</span>
                </div>
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
            <div className="inspector-body compact">
              <span className="field-label">Sekcia</span>
              <strong>{selectedSection.label}</strong>
              <span className="field-label">Stav</span>
              <strong>{project ? "Projektový balík je otvorený" : selectedSection.summary}</strong>
            </div>
            <details className="project-details">
              <summary>Detaily projektu</summary>
              <div className="inspector-body compact">
                <span className="field-label">ID projektu</span>
                <strong>{project?.projectId ?? "Žiadny projekt nie je otvorený"}</strong>
                <span className="field-label">Úloha manifestu</span>
                <strong>{project ? `Schéma ${project.schemaVersion}` : "Pripravené pre budúce metadáta"}</strong>
                {project && (
                  <>
                    <span className="field-label">Projektový priečinok</span>
                    <strong>{project.folderPath}</strong>
                  </>
                )}
              </div>
            </details>
          </>
        )}
              </section>
            )}
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

function readRightDockState(): RightDockState {
  if (typeof window === "undefined") {
    return {
      selectedTab: "inspector",
      collapsed: false,
    };
  }

  try {
    const storedValue = window.localStorage.getItem(RIGHT_DOCK_STORAGE_KEY);
    if (!storedValue) {
      return {
        selectedTab: "inspector",
        collapsed: false,
      };
    }

    const parsedValue = JSON.parse(storedValue) as Partial<RightDockState>;
    return {
      selectedTab: parsedValue.selectedTab === "overview" ? "overview" : "inspector",
      collapsed: Boolean(parsedValue.collapsed),
    };
  } catch {
    return {
      selectedTab: "inspector",
      collapsed: false,
    };
  }
}

function writeRightDockState(state: RightDockState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(RIGHT_DOCK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Dock layout is only a local UI preference.
  }
}

function readScenesShotsLayout(): ScenesShotsLayout {
  if (typeof window === "undefined") return defaultScenesShotsLayout;

  try {
    const storedValue = window.localStorage.getItem(SCENES_SHOTS_LAYOUT_STORAGE_KEY);
    if (!storedValue) return defaultScenesShotsLayout;

    return normalizeScenesShotsLayout(JSON.parse(storedValue) as Partial<ScenesShotsLayout>);
  } catch {
    return defaultScenesShotsLayout;
  }
}

function writeScenesShotsLayout(layout: ScenesShotsLayout) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SCENES_SHOTS_LAYOUT_STORAGE_KEY, JSON.stringify(normalizeScenesShotsLayout(layout)));
  } catch {
    // Resizable panels are only a local UI preference.
  }
}

function readSceneShotEditorMode(): SceneShotEditorMode {
  if (typeof window === "undefined") return "both";

  try {
    const storedValue = window.localStorage.getItem(SCENE_SHOT_EDITOR_MODE_STORAGE_KEY);
    return storedValue === "scene" || storedValue === "shot" ? storedValue : "both";
  } catch {
    return "both";
  }
}

function writeSceneShotEditorMode(mode: SceneShotEditorMode) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SCENE_SHOT_EDITOR_MODE_STORAGE_KEY, mode);
  } catch {
    // Editor visibility is only a local UI preference.
  }
}

function normalizeScenesShotsLayout(layout: Partial<ScenesShotsLayout>): ScenesShotsLayout {
  return {
    scenes: clampColumnWidth(layout.scenes, "scenes"),
    shots: clampColumnWidth(layout.shots, "shots"),
    editor: clampColumnWidth(layout.editor, "editor"),
    sceneEditor: clampColumnWidth(layout.sceneEditor, "sceneEditor"),
    dock: clampColumnWidth(layout.dock, "dock"),
  };
}

function clampColumnWidth(value: unknown, column: keyof ScenesShotsLayout) {
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : defaultScenesShotsLayout[column];
  const limits = scenesShotsLayoutLimits[column];
  return Math.min(limits.max, Math.max(limits.min, Math.round(numericValue)));
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

function createEmptyScene(order: number): Scene {
  const timestamp = new Date().toISOString();

  return {
    id: makeEntityId("scene"),
    title: "",
    description: "",
    notes: "",
    startTime: null,
    endTime: null,
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createEmptyShot(sceneId: string, order: number): Shot {
  const timestamp = new Date().toISOString();

  return {
    id: makeEntityId("shot"),
    sceneId,
    title: "",
    description: "",
    visualIntent: "",
    emotion: "",
    motifs: [],
    notes: "",
    status: "draft",
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function normalizeProjectPackage(projectPackage: ProjectPackage): ProjectPackage {
  return {
    ...projectPackage,
    text: normalizeProjectText(projectPackage.text),
    timing: normalizeTimingBlocks(projectPackage.timing),
    scenes: normalizeScenes(projectPackage.scenes),
    shots: normalizeShots(projectPackage.shots),
    counts: {
      ...projectPackage.counts,
      scenes: normalizeScenes(projectPackage.scenes).length,
      shots: normalizeShots(projectPackage.shots).length,
    },
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

function normalizeScenes(scenes: Partial<Scene>[] | null | undefined): Scene[] {
  if (!Array.isArray(scenes)) return [];

  return reorderItems(
    scenes.map((scene, index) => ({
      id: typeof scene.id === "string" && scene.id.trim() ? scene.id : makeEntityId("scene"),
      title: typeof scene.title === "string" ? scene.title : "",
      description: typeof scene.description === "string" ? scene.description : "",
      notes: typeof scene.notes === "string" ? scene.notes : "",
      startTime: typeof scene.startTime === "string" && scene.startTime.trim() ? scene.startTime : null,
      endTime: typeof scene.endTime === "string" && scene.endTime.trim() ? scene.endTime : null,
      order: typeof scene.order === "number" && Number.isFinite(scene.order) ? scene.order : index + 1,
      createdAt: typeof scene.createdAt === "string" ? scene.createdAt : "",
      updatedAt: typeof scene.updatedAt === "string" ? scene.updatedAt : "",
    })),
  );
}

function normalizeShots(shots: Partial<Shot>[] | null | undefined): Shot[] {
  if (!Array.isArray(shots)) return [];

  return reorderShots(
    shots.map((shot, index) => ({
      id: typeof shot.id === "string" && shot.id.trim() ? shot.id : makeEntityId("shot"),
      sceneId: typeof shot.sceneId === "string" ? shot.sceneId : "",
      title: typeof shot.title === "string" ? shot.title : "",
      description: typeof shot.description === "string" ? shot.description : "",
      visualIntent: typeof shot.visualIntent === "string" ? shot.visualIntent : "",
      emotion: typeof shot.emotion === "string" ? shot.emotion : "",
      motifs: Array.isArray(shot.motifs) ? shot.motifs.filter((motif) => typeof motif === "string") : [],
      notes: typeof shot.notes === "string" ? shot.notes : "",
      status: isShotStatus(shot.status) ? shot.status : "draft",
      order: typeof shot.order === "number" && Number.isFinite(shot.order) ? shot.order : index + 1,
      createdAt: typeof shot.createdAt === "string" ? shot.createdAt : "",
      updatedAt: typeof shot.updatedAt === "string" ? shot.updatedAt : "",
    })),
  );
}

function nullableTimeField(field: SceneEditableField, value: string) {
  if (field === "startTime" || field === "endTime") {
    return value.trim() ? value : null;
  }

  return value;
}

function normalizeShotField(field: ShotEditableField, value: string) {
  if (field === "motifs") {
    return value
      .split(",")
      .map((motif) => motif.trim())
      .filter(Boolean);
  }

  if (field === "status") {
    return isShotStatus(value) ? value : "draft";
  }

  return value;
}

function isShotStatus(value: unknown): value is ShotStatus {
  return value === "draft" || value === "approved" || value === "used" || value === "rejected" || value === "archived";
}

function shotStatusLabel(status: ShotStatus) {
  return shotStatusOptions.find((option) => option.value === status)?.label ?? "Návrh";
}

function compareByOrder<T extends { order: number }>(firstItem: T, secondItem: T) {
  return firstItem.order - secondItem.order;
}

function reorderItems<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort(compareByOrder).map((item, index) => ({ ...item, order: index + 1 }));
}

function reorderShots(shots: Shot[]): Shot[] {
  const groupedShots = new Map<string, Shot[]>();
  for (const shot of shots) {
    groupedShots.set(shot.sceneId, [...(groupedShots.get(shot.sceneId) ?? []), shot]);
  }

  return shots.map((shot) => {
    const reorderedGroup = reorderItems(groupedShots.get(shot.sceneId) ?? []);
    return reorderedGroup.find((item) => item.id === shot.id) ?? shot;
  });
}

function moveOrderedItem<T extends { id: string; order: number }>(items: T[], id: string, direction: -1 | 1): T[] {
  const orderedItems = [...items].sort(compareByOrder);
  const currentIndex = orderedItems.findIndex((item) => item.id === id);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedItems.length) {
    return reorderItems(orderedItems);
  }

  const movedItems = [...orderedItems];
  const [movedItem] = movedItems.splice(currentIndex, 1);
  movedItems.splice(targetIndex, 0, movedItem);
  return reorderItems(movedItems);
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

function buildScenesShotsOverview(projectTitle: string, scenes: Scene[], shots: Shot[]) {
  const orderedScenes = normalizeScenes(scenes);
  const normalizedShots = normalizeShots(shots);
  const lines = [projectTitle.trim() || "Bez otvoreného projektu", ""];

  if (orderedScenes.length === 0) {
    lines.push("Zatiaľ nie sú vytvorené žiadne scény.");
    return lines.join("\n");
  }

  orderedScenes.forEach((scene, sceneIndex) => {
    const sceneTitle = scene.title.trim() || `Scéna ${sceneIndex + 1}`;
    const timeRange = formatOptionalTimeRange(scene.startTime, scene.endTime);
    lines.push(`${sceneIndex + 1}. ${sceneTitle}${timeRange ? ` (${timeRange})` : ""}`);
    if (scene.description.trim()) lines.push(`   Opis: ${scene.description.trim()}`);
    if (scene.notes.trim()) lines.push(`   Poznámky: ${scene.notes.trim()}`);

    const sceneShots = normalizedShots.filter((shot) => shot.sceneId === scene.id).sort(compareByOrder);
    if (sceneShots.length === 0) {
      lines.push("   Zatiaľ bez záberov.");
    } else {
      sceneShots.forEach((shot, shotIndex) => {
        lines.push(`   ${sceneIndex + 1}.${shotIndex + 1} ${shot.title.trim() || `Záber ${shotIndex + 1}`}`);
        if (shot.visualIntent.trim()) lines.push(`       Tvorivý zámer: ${shot.visualIntent.trim()}`);
        if (shot.description.trim()) lines.push(`       Opis: ${shot.description.trim()}`);
        if (shot.emotion.trim()) lines.push(`       Emócia: ${shot.emotion.trim()}`);
        if (shot.motifs.length > 0) lines.push(`       Motívy: ${shot.motifs.join(", ")}`);
        lines.push(`       Stav: ${shotStatusLabel(shot.status)}`);
        if (shot.notes.trim()) lines.push(`       Poznámky: ${shot.notes.trim()}`);
      });
    }

    if (sceneIndex < orderedScenes.length - 1) lines.push("");
  });

  return lines.join("\n");
}

function formatOptionalTimeRange(startTime: string | null, endTime: string | null) {
  const start = startTime?.trim() ?? "";
  const end = endTime?.trim() ?? "";
  if (start && end) return `${start} - ${end}`;
  if (start) return `od ${start}`;
  if (end) return `do ${end}`;
  return "";
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

function scenesForComparison(scenes: Partial<Scene>[] | null | undefined) {
  return normalizeScenes(scenes).map((scene) => ({
    id: scene.id,
    title: scene.title,
    description: scene.description,
    notes: scene.notes,
    startTime: scene.startTime,
    endTime: scene.endTime,
    order: scene.order,
    createdAt: scene.createdAt,
    updatedAt: scene.updatedAt,
  }));
}

function shotsForComparison(shots: Partial<Shot>[] | null | undefined) {
  return normalizeShots(shots).map((shot) => ({
    id: shot.id,
    sceneId: shot.sceneId,
    title: shot.title,
    description: shot.description,
    visualIntent: shot.visualIntent,
    emotion: shot.emotion,
    motifs: shot.motifs,
    notes: shot.notes,
    status: shot.status,
    order: shot.order,
    createdAt: shot.createdAt,
    updatedAt: shot.updatedAt,
  }));
}

function makeTimingBlockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `timing_${crypto.randomUUID()}`;
  }

  return `timing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeEntityId(prefix: "scene" | "shot") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
