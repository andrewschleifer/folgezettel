import * as assert from "assert";
import * as vscode from "vscode";
import { touch } from "../../utils";
import { MarkdownFilename, newParsedIdFromPath } from "../../pureFolgezettel";

async function openNote(uri: vscode.Uri) {
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc);
}

function activeBasename(): string {
  return vscode.window.activeTextEditor!.document.fileName.split("/").pop()!;
}

describe("Go To Sibling integration", () => {
  it("navigates to earlier sibling for 51.2 -> 51.1", async function () {
    await touch("51.1.md");
    const uri = await touch("51.2.md");
    await touch("51.3.md");
    await openNote(uri);

    await vscode.commands.executeCommand(
      "vscode-folgezettel.goToEarlierSiblingThought",
    );
    assert.strictEqual(activeBasename(), "51.1.md");
  });

  it("navigates to later sibling for 52.2 -> 52.3", async function () {
    await touch("52.1.md");
    const uri = await touch("52.2.md");
    await touch("52.3.md");
    await openNote(uri);

    await vscode.commands.executeCommand(
      "vscode-folgezettel.goToLaterSiblingThought",
    );
    assert.strictEqual(activeBasename(), "52.3.md");
  });

  it("wraps around in both directions", async function () {
    const first = await touch("53.1.md");
    await touch("53.2.md");
    const last = await touch("53.3.md");

    await openNote(last);
    await vscode.commands.executeCommand(
      "vscode-folgezettel.goToLaterSiblingThought",
    );
    assert.strictEqual(activeBasename(), "53.1.md");

    await openNote(first);
    await vscode.commands.executeCommand(
      "vscode-folgezettel.goToEarlierSiblingThought",
    );
    assert.strictEqual(activeBasename(), "53.3.md");
  });

  it("skips over gaps: 54.1 -> 54.3 when 54.2 is missing", async function () {
    const uri = await touch("54.1.md");
    await touch("54.3.md");
    await openNote(uri);

    await vscode.commands.executeCommand(
      "vscode-folgezettel.goToLaterSiblingThought",
    );
    assert.strictEqual(activeBasename(), "54.3.md");
  });

  it("navigates between titled notes", async function () {
    const earlier = newParsedIdFromPath(
      (await touch("55.1 hello world.md")).path as MarkdownFilename,
    );
    const laterUri = await touch("55.2 world says hello back.md");
    await openNote(laterUri);

    await vscode.commands.executeCommand(
      "vscode-folgezettel.goToEarlierSiblingThought",
    );
    const active = newParsedIdFromPath(
      vscode.window.activeTextEditor!.document.uri.path as MarkdownFilename,
    );
    assert.strictEqual(active.id, earlier.id);
  });

  it("stays put when there is no other sibling", async function () {
    const uri = await touch("56.1.md");
    await openNote(uri);

    await vscode.commands.executeCommand(
      "vscode-folgezettel.goToLaterSiblingThought",
    );
    assert.strictEqual(activeBasename(), "56.1.md");
  });
});
