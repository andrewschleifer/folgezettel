import * as vscode from "vscode";
import {
  incId,
  nextTrainIdFromFilenames,
  parentFromCurrent,
  childFromCurrent,
  TheoreticalParsedId,
  newParsedIdFromPath,
  MarkdownFilename,
  newTheoreticalParsedId,
} from "./pureFolgezettel";
import { touch } from "./utils";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  try {
    console.log("Extension activation started");

    const newTrainDisposable = vscode.commands.registerCommand(
      "vscode-folgezettel.newTrainOfThought",
      async () => {
        try {
          const files = await vscode.workspace.findFiles("*.md");
          const filenames = files.map((f) => f.path) as MarkdownFilename[];
          const targetId = nextTrainIdFromFilenames(filenames);
          const newId = newTheoreticalParsedId(`${targetId}.1`);
          const uri = vscode.Uri.joinPath(
            vscode.workspace.workspaceFolders![0].uri,
            newId.basename,
          );
          await touch(newId.basename as MarkdownFilename);
          await vscode.window.showTextDocument(uri);
        } catch (err) {
          console.error("Error in newTrainOfThought:", err);
          vscode.window.showErrorMessage("Error in newTrainOfThought: " + err);
        }
      },
    );
    context.subscriptions.push(newTrainDisposable);

    const newSiblingDisposable = vscode.commands.registerCommand(
      "vscode-folgezettel.newSiblingThought",
      async () => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showErrorMessage("No active editor");
            console.error("No active editor");
            return;
          }
          // when-clause defined in package.json makes it safe to assume the currently open document is Markdown
          const baseId = newParsedIdFromPath(
            editor.document.uri.path as MarkdownFilename,
          );
          let candidate = incId(baseId);

          while (true) {
            const matches = await vscode.workspace.findFiles(
              `${candidate.id}*.md`,
              undefined,
              1,
            );
            const taken = matches.some((m) => {
              const b = newParsedIdFromPath(m.path as MarkdownFilename);
              return b.id.startsWith(candidate.id);
            });
            if (!taken) {
              break;
            }
            candidate = incId(candidate);
          }
          const uri = vscode.Uri.joinPath(
            vscode.workspace.workspaceFolders![0].uri,
            candidate.basename,
          );
          await touch(candidate.basename as MarkdownFilename);
          await vscode.window.showTextDocument(uri);
        } catch (err) {
          console.error("Error in newSiblingThought:", err);
          vscode.window.showErrorMessage("Error in newSiblingThought: " + err);
        }
      },
    );
    context.subscriptions.push(newSiblingDisposable);

    const newChildDisposable = vscode.commands.registerCommand(
      "vscode-folgezettel.newChildThought",
      async () => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showErrorMessage("No active editor");
            return;
          }
          // when-clause defined in package.json makes it safe to assume the currently open document is Markdown
          const currentFile = editor.document.uri.path as MarkdownFilename;
          const currentId = newParsedIdFromPath(currentFile);
          const initialCandidate: TheoreticalParsedId =
            childFromCurrent(currentId);
          var candidateId = initialCandidate;

          while (true) {
            const candidateUri = vscode.Uri.joinPath(
              vscode.workspace.workspaceFolders![0].uri,
              candidateId.basename,
            );
            try {
              await vscode.workspace.fs.stat(candidateUri);
              candidateId = incId(candidateId);
              continue;
            } catch {
              const matches = await vscode.workspace.findFiles(
                `${candidateId.id}*.md`,
                undefined,
                1,
              );
              const taken = matches.some((m) => {
                const b = newParsedIdFromPath(m.path as MarkdownFilename);
                return b.id === candidateId.id;
              });
              if (taken) {
                candidateId = incId(candidateId);
                continue;
              }
              await vscode.workspace.fs.writeFile(
                candidateUri,
                new Uint8Array(),
              );
              await vscode.window.showTextDocument(candidateUri);
              break;
            }
          }
        } catch (err) {
          console.error("Error in newChildThought:", err);
          vscode.window.showErrorMessage("Error in newChildThought: " + err);
        }
      },
    );
    context.subscriptions.push(newChildDisposable);

    const goToParentDisposable = vscode.commands.registerCommand(
      "vscode-folgezettel.goToParentThought",
      async () => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showErrorMessage("No active editor");
            console.error("No active editor");
            return;
          }
          const currentFile = newParsedIdFromPath(
            editor.document.fileName as MarkdownFilename,
          );
          const parentId = parentFromCurrent(currentFile);

          const files = await vscode.workspace.findFiles("*.md");
          let parentFile: vscode.Uri | undefined;
          for (const file of files) {
            const parsed = newParsedIdFromPath(file.path as MarkdownFilename);
            if (parsed.id === parentId.id) {
              parentFile = file;
              break;
            }
          }
          if (!parentFile) {
            // fallback to untitled file with just id
            parentFile = vscode.Uri.joinPath(
              vscode.workspace.workspaceFolders![0].uri,
              parentId.basename,
            );
          }
          await vscode.window.showTextDocument(parentFile);
        } catch (err) {
          console.error("Error in goToParentThought:", err);
          vscode.window.showErrorMessage("Error in goToParentThought: " + err);
        }
      },
    );
    context.subscriptions.push(goToParentDisposable);
  } catch (err) {
    console.error("Error during extension activation:", err);
    vscode.window.showErrorMessage("Extension activation error: " + err);
  }
}

export function deactivate() {}
