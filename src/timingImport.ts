import type { TimingBlock } from "./projectPackage";

export type TimingImportResult = {
  body: string;
  blocks: TimingBlock[];
};

type ParsedSpeaker = {
  section: string;
  voice: string;
};

export function parseTimingImport(sourceText: string): TimingImportResult {
  const normalizedSource = sourceText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalizedSource) {
    return { body: "", blocks: [] };
  }

  if (normalizedSource.includes("-->")) {
    return parseSrtImport(normalizedSource);
  }

  return parseTranscriptImport(normalizedSource);
}

function parseSrtImport(sourceText: string): TimingImportResult {
  const blocks = sourceText
    .split(/\n\s*\n/g)
    .map((rawBlock) => rawBlock.split("\n").map((line) => line.trim()).filter(Boolean))
    .map((lines) => {
      const timingLineIndex = lines.findIndex((line) => line.includes("-->"));
      if (timingLineIndex === -1) return null;

      const [startRaw, endRaw] = lines[timingLineIndex].split("-->").map((value) => value.trim());
      const text = lines.slice(timingLineIndex + 1).join("\n").trim();
      if (!text) return null;

      return createTimingBlock({
        start: formatSrtTime(startRaw),
        end: formatSrtTime(endRaw),
        text,
      });
    })
    .filter((block): block is TimingBlock => Boolean(block));

  return {
    body: blocks.map((block) => block.text).join("\n"),
    blocks,
  };
}

function parseTranscriptImport(sourceText: string): TimingImportResult {
  const bodyLines: string[] = [];
  const blocks: TimingBlock[] = [];
  let currentSpeaker: ParsedSpeaker = { section: "", voice: "" };

  sourceText.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      if (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] !== "") {
        bodyLines.push("");
      }
      return;
    }

    const timedLine = line.match(/^\(([^)]+)\)\s*(.*)$/);
    if (!timedLine) {
      currentSpeaker = parseSpeaker(line);
      bodyLines.push(line);
      return;
    }

    const text = timedLine[2].trim();
    if (!text) return;

    blocks.push(
      createTimingBlock({
        start: formatTranscriptTime(timedLine[1]),
        text,
        section: currentSpeaker.section,
        voice: currentSpeaker.voice,
      }),
    );
    bodyLines.push(text);
  });

  return {
    body: bodyLines.join("\n").trim(),
    blocks: inferMissingEnds(blocks),
  };
}

function parseSpeaker(line: string): ParsedSpeaker {
  const parts = line.split("/").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { section: "", voice: "" };
  }

  return {
    voice: parts[0],
    section: parts.slice(1).join(" / "),
  };
}

function inferMissingEnds(blocks: TimingBlock[]) {
  return blocks.map((block, index) => {
    if (block.end.trim()) return block;
    const nextBlock = blocks[index + 1];
    return {
      ...block,
      end: nextBlock?.start ?? "",
    };
  });
}

function createTimingBlock(values: Partial<TimingBlock>): TimingBlock {
  return {
    id: makeTimingBlockId(),
    start: values.start ?? "",
    end: values.end ?? "",
    text: values.text ?? "",
    section: values.section ?? "",
    voice: values.voice ?? "",
    notes: values.notes ?? "",
    linkedShotIds: values.linkedShotIds ?? [],
    linkedAssetIds: values.linkedAssetIds ?? [],
    linkedOutputIds: values.linkedOutputIds ?? [],
  };
}

function formatSrtTime(value: string) {
  const [timePart] = value.split(/[,.]/);
  const parts = timePart.split(":").map((part) => part.trim());
  if (parts.length === 3 && parts[0] === "00") {
    return `${parts[1]}:${parts[2]}`;
  }
  return timePart;
}

function formatTranscriptTime(value: string) {
  const parts = value.split(":").map((part) => part.trim());
  if (parts.length === 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  if (parts.length === 3) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
  }
  return value.trim();
}

function makeTimingBlockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `timing_${crypto.randomUUID()}`;
  }

  return `timing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
