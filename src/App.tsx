import { useMemo, useState } from "react";

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
  { id: "projects", label: "Projects", summary: "Local project packages and snapshots." },
  { id: "brief", label: "Brief", summary: "Creative brief, goals and constraints." },
  { id: "text-timing", label: "Text & Timing", summary: "Lyrics, poem text, SRT and timing maps." },
  { id: "audio", label: "Audio", summary: "Source MP3/WAV metadata and duration notes." },
  { id: "scenes-shots", label: "Scenes & Shots", summary: "Scene structure and shot planning." },
  { id: "references", label: "References", summary: "Reference images and visual research." },
  { id: "prompts", label: "Prompts", summary: "Prompt versions linked to shots." },
  { id: "outputs", label: "Outputs", summary: "Generated images/videos and hero selections." },
  { id: "export", label: "Export", summary: "Manual exports and project snapshots." },
];

const stats = [
  { label: "Project folder", value: "Not selected" },
  { label: "Manifest", value: "project.llstory.json" },
  { label: "Workflow", value: "Asset -> Shot -> Prompt -> Output" },
];

export default function App() {
  const [selectedSectionId, setSelectedSectionId] = useState<SectionId>("projects");

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? sections[0],
    [selectedSectionId],
  );

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Production sections">
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
          <strong>Local-first vault</strong>
          <span>No accounts, no cloud sync, no AI generation in this foundation pass.</span>
        </div>
      </aside>

      <section className="workspace" aria-label="Storyboard dashboard">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Production package foundation</p>
            <h2>Lassi LAB Storyboard</h2>
          </div>
          <span className="status-pill">Desktop-first</span>
        </header>

        <section className="dashboard-band" aria-label="Project dashboard">
          <div>
            <p className="eyebrow">Selected area</p>
            <h3>{selectedSection.label}</h3>
            <p>{selectedSection.summary}</p>
          </div>
        </section>

        <section className="stats-grid" aria-label="Project state">
          {stats.map((item) => (
            <div className="stat-tile" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>

        <section className="placeholder-panel" aria-label="Foundation notes">
          <h3>Dashboard placeholder</h3>
          <p>
            The next pass can wire this surface to local project folders, managed assets,
            scenes, shots, prompts and outputs. For now it stays intentionally empty and
            traceable.
          </p>
        </section>
      </section>

      <aside className="inspector" aria-label="Inspector">
        <p className="eyebrow">Inspector</p>
        <h2>Selected item</h2>
        <div className="inspector-body">
          <span className="field-label">Section</span>
          <strong>{selectedSection.label}</strong>
          <span className="field-label">Status</span>
          <strong>Placeholder only</strong>
          <span className="field-label">Manifest role</span>
          <strong>Ready for future metadata</strong>
        </div>
      </aside>
    </main>
  );
}
