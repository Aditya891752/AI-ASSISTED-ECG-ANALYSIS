export interface ParseResult {
  values: number[];
  errors: string[];
}

/** Parses a raw text blob (CSV or newline-separated) into an array of floats.
 * Accepts commas, newlines, or whitespace as separators. Skips blank tokens
 * and reports how many invalid (NaN) tokens were dropped. */
export function parseSignalText(raw: string): ParseResult {
  const tokens = raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const values: number[] = [];
  let invalidCount = 0;

  for (const token of tokens) {
    const num = Number(token);
    if (Number.isFinite(num)) {
      values.push(num);
    } else {
      invalidCount++;
    }
  }

  const errors: string[] = [];
  if (invalidCount > 0) {
    errors.push(`Skipped ${invalidCount} non-numeric value(s).`);
  }
  if (values.length < 360) {
    errors.push(
      `Only ${values.length} samples found — the API requires a minimum of 360.`
    );
  }

  return { values, errors };
}

export function parseSignalFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(parseSignalText(String(reader.result ?? "")));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
