/**
 * String manipulation functions for interacting with
 * folgezettel-style filenames.
 * @see https://writing.bobdoto.computer/how-to-use-folgezettel-in-your-zettelkasten-everything-you-need-to-know-to-get-started/
 */

// TODO: Make this a separate module

export type MarkdownFilename = `${string}.md`;

export type AlphabetOnlyString = string & { __brand: "AlphabetOnly" };

function isAlphabetOnly(str: string): str is AlphabetOnlyString {
  return /^[a-zA-Z]*$/.test(str);
}

/**
 * Increment one or more letters of the Latin alphabet, similar to how Excel does it (a...z, then aa...zz, etc.)
 * @param input The string to increment
 * @returns AlphabetOnlyString
 */
function incAlpha(input: AlphabetOnlyString): AlphabetOnlyString {
  let arr = input.split("");
  let i = arr.length - 1;
  let carry = true;
  while (i >= 0 && carry) {
    let c = arr[i];
    let b = c.charCodeAt(0);
    if (b >= 97 && b < 122) {
      // 'a' to 'y'
      arr[i] = String.fromCharCode(b + 1);
      carry = false;
    } else if (b === 122) {
      // 'z'
      arr[i] = "a";
      carry = true;
    } else if (b >= 65 && b < 90) {
      // 'A' to 'Y'
      arr[i] = String.fromCharCode(b + 1);
      carry = false;
    } else if (b === 90) {
      // 'Z'
      arr[i] = "A";
      carry = true;
    } else {
      carry = false;
    }
    i--;
  }
  if (carry) {
    arr.unshift(/[a-z]/.test(input[0]) ? "a" : "A");
  }
  return arr.join("") as AlphabetOnlyString;
}

export interface TheoreticalParsedId {
  // token without extension and without trailing title (e.g. "2.1a")
  id: string;
  // original basename including extension and optional title (e.g. "2.1a some title.md")
  basename: MarkdownFilename;
  title?: string;
  // TODO: make this into a class with these members
  // incrementId(): TheoreticalParsedId;
  // findParent(): TheoreticalParsedId;
  // newChild(): TheoreticalParsedId;
  // nextAvailableTrain(): TheoreticalParsedId;
}

export interface RealParsedId extends TheoreticalParsedId {
  path: string;
}

export function newTheoreticalParsedId(id: string): TheoreticalParsedId {
  const basename = `${id}.md` as MarkdownFilename;
  return { id, basename };
}

export function newParsedIdFromPath(path: MarkdownFilename): RealParsedId {
  const basename = path.split("/").pop()! as MarkdownFilename;
  const noExt = basename.replace(/\.md$/, "");
  const [id, title] = noExt.split(" ");
  return { path, id, basename, title };
}

export function incId(originalId: TheoreticalParsedId): TheoreticalParsedId {
  const token = originalId.id;

  const lastDot = token.lastIndexOf(".");
  if (lastDot < 0) {
    return originalId;
  }

  let workingPrefix = token.slice(0, lastDot + 1); // include the dot
  let workingTail = token.slice(lastDot + 1);

  // Use non-greedy prefix so group2 is the full last run of letters or digits
  const m = workingTail.match(/^(.*?)([A-Za-z]+|\d+)$/);
  if (m) {
    const before = m[1];
    const segment = m[2];
    if (/^\d+$/.test(segment)) {
      const num = parseInt(segment, 10) + 1;
      const width = segment.length;
      const fmt = num.toString().padStart(width, "0");
      return newTheoreticalParsedId(workingPrefix + before + fmt);
    }
    if (isAlphabetOnly(segment)) {
      return newTheoreticalParsedId(workingPrefix + before + incAlpha(segment));
    }
  }

  // Fallback: return the ID unchanged
  return originalId;
}

export interface LastRun {
  stem: string;
  run: string;
  kind: "num" | "alpha";
}

/**
 * Split an id into everything before its final run of digits or letters and
 * the run itself, e.g. "2.1a4b1" -> { stem: "2.1a4b", run: "1", kind: "num" }.
 * Returns null for ids without a dot or without a trailing run.
 */
export function splitLastRun(id: TheoreticalParsedId): LastRun | null {
  const token = id.id;

  const lastDot = token.lastIndexOf(".");
  if (lastDot < 0) {
    return null;
  }

  const prefix = token.slice(0, lastDot + 1); // include the dot
  const tail = token.slice(lastDot + 1);

  const m = tail.match(/^(.*?)([A-Za-z]+|\d+)$/);
  if (!m) {
    return null;
  }
  return {
    stem: prefix + m[1],
    run: m[2],
    kind: /^\d+$/.test(m[2]) ? "num" : "alpha",
  };
}

/**
 * Order sibling runs of the same kind: numeric runs compare as integers,
 * alpha runs in Excel order (a < ... < z < aa < ab ...).
 */
export function compareSiblingRuns(a: string, b: string): number {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    return parseInt(a, 10) - parseInt(b, 10);
  }
  if (a.length !== b.length) {
    return a.length - b.length;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

export function nextTrainIdFromFilenames(
  filenames: MarkdownFilename[],
): number {
  const ids = filenames
    .map(newParsedIdFromPath)
    .map(({ id }) => {
      const m = id.match(/^(\d+)\.1$/);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter((x): x is number => x !== null);

  return (ids.length ? Math.max(...ids) : 0) + 1;
}

export function childFromCurrent(
  currentId: TheoreticalParsedId,
): TheoreticalParsedId {
  if (/\d$/.test(currentId.id)) {
    return newTheoreticalParsedId(`${currentId.id}a`);
  }
  return newTheoreticalParsedId(`${currentId.id}1`);
}

export function parentFromCurrent(
  currentId: TheoreticalParsedId,
): TheoreticalParsedId {
  // If there's no dot, there's no parent to go to
  const lastDot = currentId.id.lastIndexOf(".");
  if (lastDot < 0) {
    return currentId;
  }

  const prefix = currentId.id.slice(0, lastDot);
  const tail = currentId.id.slice(lastDot + 1);
  // Split tail into alternating digit/letter groups, e.g. '1a4b1' -> ['1','a','4','b','1']
  const groups: string[] = [];
  let i = 0;
  while (i < tail.length) {
    const isDigit = /\d/.test(tail[i]);
    let j = i + 1;
    while (j < tail.length && /\d/.test(tail[j]) === isDigit) {
      j++;
    }
    groups.push(tail.slice(i, j));
    i = j;
  }

  if (
    groups.length === 1 &&
    /^\d+$/.test(groups[0]) &&
    prefix.indexOf(".") < 0
  ) {
    return currentId;
  }

  // Remove the last group (go up one level)
  groups.pop();

  if (groups.length === 0) {
    return newTheoreticalParsedId(prefix);
  }

  // If the new last group is alphabetic and has length > 1, shorten it by 1 character
  const last = groups[groups.length - 1];
  if (/^[A-Za-z]+$/.test(last) && last.length > 1) {
    groups[groups.length - 1] = last.slice(0, -1);
  }

  const newTail = groups.join("");
  return newTheoreticalParsedId(`${prefix}.${newTail}`);
}
