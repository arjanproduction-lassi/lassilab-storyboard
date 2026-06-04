use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

const APP_NAME: &str = "Lassi LAB Storyboard";
const SCHEMA_VERSION: u64 = 1;
const MANIFEST_FILE: &str = "project.llstory.json";
const PACKAGE_DIRS: &[&str] = &[
    "01_TEXT",
    "02_TIMING",
    "03_AUDIO",
    "04_BRIEF",
    "05_STORYBOARD",
    "06_REFERENCES",
    "07_PROMPTS",
    "08_OUTPUTS",
    "09_EXPORTS",
    ".thumbs",
];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateProjectRequest {
    title: String,
    folder_path: String,
    timestamp: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenProjectRequest {
    folder_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectPackage {
    app_name: String,
    schema_version: u64,
    project_id: String,
    title: String,
    slug: String,
    parent_folder_path: Option<String>,
    folder_path: String,
    created_at: String,
    updated_at: String,
    counts: ProjectCounts,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectCounts {
    scenes: usize,
    shots: usize,
    assets: usize,
    prompts: usize,
    outputs: usize,
}

#[tauri::command]
fn create_project_package(request: CreateProjectRequest) -> Result<ProjectPackage, String> {
    let title = request.title.trim();
    if title.is_empty() {
        return Err("Názov projektu je povinný.".to_string());
    }

    let parent_dir = normalize_project_dir(&request.folder_path)?;
    validate_parent_project_dir(&parent_dir)?;
    let slug = slugify(title);
    let project_dir = parent_dir.join(&slug);
    prepare_new_project_dir(&project_dir)?;

    for folder in PACKAGE_DIRS {
        fs::create_dir_all(project_dir.join(folder))
            .map_err(|error| format!("Nepodarilo sa vytvoriť priečinok {folder}: {error}"))?;
    }

    let manifest_path = project_dir.join(MANIFEST_FILE);
    let manifest = build_manifest(title, &slug, &request.timestamp)?;
    let manifest_text = serde_json::to_string_pretty(&manifest)
        .map_err(|error| format!("Nepodarilo sa pripraviť manifest: {error}"))?;

    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&manifest_path)
        .map_err(|error| format!("Nepodarilo sa vytvoriť {MANIFEST_FILE}: {error}"))?;
    file.write_all(manifest_text.as_bytes())
        .map_err(|error| format!("Nepodarilo sa zapísať {MANIFEST_FILE}: {error}"))?;
    file.write_all(b"\n")
        .map_err(|error| format!("Nepodarilo sa dokončiť {MANIFEST_FILE}: {error}"))?;

    manifest_summary(&project_dir, &manifest)
}

#[tauri::command]
fn open_project_package(request: OpenProjectRequest) -> Result<ProjectPackage, String> {
    let project_dir = normalize_project_dir(&request.folder_path)?;
    if !project_dir.exists() {
        return Err("Priečinok projektu neexistuje.".to_string());
    }
    if !project_dir.is_dir() {
        return Err("Cesta projektu musí byť priečinok.".to_string());
    }

    let manifest = read_manifest(&project_dir)?;
    validate_manifest(&manifest)?;
    manifest_summary(&project_dir, &manifest)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            create_project_package,
            open_project_package
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn normalize_project_dir(raw_path: &str) -> Result<PathBuf, String> {
    let trimmed = raw_path.trim();
    if trimmed.is_empty() {
        return Err("Cesta k priečinku projektu je povinná.".to_string());
    }

    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err("Cesta k priečinku projektu musí byť absolútna.".to_string());
    }
    Ok(path)
}

fn validate_parent_project_dir(parent_dir: &Path) -> Result<(), String> {
    if !parent_dir.exists() {
        return Err("Nadradený priečinok neexistuje.".to_string());
    }
    if !parent_dir.is_dir() {
        return Err("Nadradená cesta musí byť priečinok.".to_string());
    }
    Ok(())
}

fn prepare_new_project_dir(project_dir: &Path) -> Result<(), String> {
    if project_dir.exists() {
        if !project_dir.is_dir() {
            return Err("Cieľová cesta projektu už existuje a nie je priečinok.".to_string());
        }
        if project_dir.join(MANIFEST_FILE).exists() {
            return Err("Projekt s týmto názvom už existuje. Otvor ho ako existujúci projekt alebo zmeň názov.".to_string());
        }
        let is_empty = fs::read_dir(project_dir)
            .map_err(|error| format!("Nepodarilo sa skontrolovať priečinok projektu: {error}"))?
            .next()
            .is_none();
        if !is_empty {
            return Err("Cieľový podpriečinok projektu už existuje a nie je prázdny. Zmeň názov projektu alebo vyber iný nadradený priečinok.".to_string());
        }
        return Ok(());
    }

    fs::create_dir_all(project_dir)
        .map_err(|error| format!("Nepodarilo sa vytvoriť podpriečinok projektu: {error}"))
}

fn build_manifest(title: &str, slug: &str, timestamp: &str) -> Result<Value, String> {
    let project_id = make_project_id(slug)?;

    Ok(json!({
        "appName": APP_NAME,
        "schemaVersion": SCHEMA_VERSION,
        "projectId": project_id,
        "title": title,
        "slug": slug,
        "createdAt": timestamp,
        "updatedAt": timestamp,
        "text": null,
        "timing": [],
        "audio": [],
        "brief": {
            "mainIdea": "",
            "visualConcept": "",
            "notes": ""
        },
        "scenes": [],
        "shots": [],
        "assets": [],
        "prompts": [],
        "outputs": []
    }))
}

fn read_manifest(project_dir: &Path) -> Result<Value, String> {
    let manifest_path = project_dir.join(MANIFEST_FILE);
    if !manifest_path.exists() {
        return Err("V tomto priečinku sa nenašiel project.llstory.json.".to_string());
    }

    let manifest_text = fs::read_to_string(&manifest_path)
        .map_err(|error| format!("Nepodarilo sa načítať project.llstory.json: {error}"))?;
    serde_json::from_str(&manifest_text)
        .map_err(|error| format!("project.llstory.json nie je platný JSON: {error}"))
}

fn validate_manifest(manifest: &Value) -> Result<(), String> {
    let app_name = manifest
        .get("appName")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if app_name != APP_NAME {
        return Err("Tento manifest nepatrí do Lassi LAB Storyboard.".to_string());
    }

    let schema_version = manifest
        .get("schemaVersion")
        .and_then(Value::as_u64)
        .unwrap_or_default();
    if schema_version != SCHEMA_VERSION {
        return Err(format!(
            "Nepodporovaná verzia schemaVersion {schema_version}. Očakávaná verzia je {SCHEMA_VERSION}."
        ));
    }

    Ok(())
}

fn manifest_summary(project_dir: &Path, manifest: &Value) -> Result<ProjectPackage, String> {
    validate_manifest(manifest)?;

    Ok(ProjectPackage {
        app_name: APP_NAME.to_string(),
        schema_version: SCHEMA_VERSION,
        project_id: string_field(manifest, "projectId")?,
        title: string_field(manifest, "title")?,
        slug: string_field(manifest, "slug")?,
        parent_folder_path: parent_folder_path(project_dir),
        folder_path: project_dir.to_string_lossy().to_string(),
        created_at: string_field(manifest, "createdAt")?,
        updated_at: string_field(manifest, "updatedAt")?,
        counts: ProjectCounts {
            scenes: array_count(manifest, "scenes"),
            shots: array_count(manifest, "shots"),
            assets: array_count(manifest, "assets"),
            prompts: array_count(manifest, "prompts"),
            outputs: array_count(manifest, "outputs"),
        },
    })
}

fn parent_folder_path(project_dir: &Path) -> Option<String> {
    project_dir
        .parent()
        .map(|parent| parent.to_string_lossy().to_string())
}

fn string_field(manifest: &Value, field: &str) -> Result<String, String> {
    manifest
        .get(field)
        .and_then(Value::as_str)
        .map(ToString::to_string)
        .ok_or_else(|| format!("Manifestu chýba pole {field}."))
}

fn array_count(manifest: &Value, field: &str) -> usize {
    manifest
        .get(field)
        .and_then(Value::as_array)
        .map(Vec::len)
        .unwrap_or_default()
}

fn make_project_id(slug: &str) -> Result<String, String> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Chyba systémového času: {error}"))?
        .as_millis();
    Ok(format!("llstory_{millis}_{slug}"))
}

fn slugify(title: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;

    for ch in title.chars() {
        for lower in ch.to_lowercase() {
            if lower.is_ascii_alphanumeric() {
                slug.push(lower);
                last_dash = false;
            } else if let Some(mapped) = slovak_ascii_slug(lower) {
                slug.push_str(mapped);
                last_dash = false;
            } else if !last_dash {
                slug.push('-');
                last_dash = true;
            }
        }
    }

    let trimmed = slug.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "project".to_string()
    } else {
        trimmed
    }
}

fn slovak_ascii_slug(ch: char) -> Option<&'static str> {
    match ch {
        'á' | 'ä' => Some("a"),
        'č' => Some("c"),
        'ď' => Some("d"),
        'é' => Some("e"),
        'í' => Some("i"),
        'ĺ' | 'ľ' => Some("l"),
        'ň' => Some("n"),
        'ó' | 'ô' => Some("o"),
        'ŕ' => Some("r"),
        'š' => Some("s"),
        'ť' => Some("t"),
        'ú' => Some("u"),
        'ý' => Some("y"),
        'ž' => Some("z"),
        _ => None,
    }
}
