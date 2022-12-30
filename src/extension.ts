// A lot of the code used to make this extension is from the following repos:
// https://github.com/phindle/error-lens/blob/master/src/extension.ts
// https://github.com/microsoft/vscode-extension-samples/tree/main/webview-sample
// https://github.com/microsoft/vscode-extension-samples/tree/main/webview-view-sample
// https://code.visualstudio.com/api/extension-guides/webview
// and more that I can't find anymore

"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const provider = new CustomSidebarViewProvider(context.extensionUri);

  context.subscriptions.push(vscode.languages.onDidChangeDiagnostics(() => provider.changed()));
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(CustomSidebarViewProvider.viewType, provider));
}

const FACES = [
  {minErrors: 0, asset: "1.webp", sound: "mr-incredible-uncanny-1.mp3"},
  {minErrors: 1, asset: "2.webp", sound: "mr-incredible-uncanny-2.mp3"},
  {minErrors: 5, asset: "3.webp", sound: "mr-incredible-uncanny-3.mp3"},
  {minErrors: 10, asset: "4.webp", sound: "mr-incredible-uncanny-4.mp3"},
  {minErrors: 15, asset: "5.webp", sound: "mr-incredible-uncanny-5.mp3"},
  {minErrors: 20, asset: "6.webp", sound: "mr-incredible-uncanny-6.mp3"},
  {minErrors: 25, asset: "7.png"/* don't ask */, sound: "mr-incredible-uncanny-7.mp3"},
  {minErrors: 30, asset: "8.webp", sound: "mr-incredible-uncanny-8.mp3"},
  {minErrors: 35, asset: "9.webp", sound: "mr-incredible-uncanny-9.mp3"},
  {minErrors: 40, asset: "10.webp", sound: "mr-incredible-uncanny-10.mp3"},
].reverse();

type Face = (typeof FACES)[0];

class CustomSidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "in-your-face.openview";

  view?: vscode.WebviewView;
  face: Face = FACES[0];

  constructor(private readonly _extensionUri: vscode.Uri) { }

  changed() {
    const errorCount = getNumErrors();
    if (!this.view) { return; }
    const face = FACES.find(face => errorCount >= face.minErrors)!;

    this.view.webview.html = this.getHtmlContent(this.view.webview, face, this.face);
    this.face = face;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.view = webviewView;
    //ensurs assets can load
    webviewView.webview.options = {
      enableScripts: true //for audio
    };
    this.changed();
  }


  private getHtmlContent(webview: vscode.Webview, face: Face, previousFace: Face): string {
    const face0 = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "images", face.asset));
    const sound0 = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "sounds", face.sound));

    const faceChanged = face.minErrors !== previousFace.minErrors;
    const playSound = faceChanged && vscode.workspace.getConfiguration().get<boolean>("uncanny.sound");

    return getHtml(face0, playSound ? sound0 : undefined);
  }
}

function getHtml(asset: vscode.Uri, sound?: vscode.Uri) {
  const maybeAudio = sound?
  `<audio autoplay>
    <source src="${sound}" type="audio/mpeg">
  </audio>` : "";

  return `
    <!DOCTYPE html>
			<html lang="en">
			<head>

			</head>

			<body>
			<section class="wrapper">
      <img class="doomFaces" src="${asset}" alt="" >
      ${maybeAudio}
      <h1 id="errorNum">${getNumErrors() + " error(s)"}</h1>
			</section>
      <script>

      </script>
      </body>

		</html>
  `;
}

// function to get the number of errors in the open file
function getNumErrors(): number {
  const activeTextEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
  if (!activeTextEditor) {
    return 0;
  }
  const document: vscode.TextDocument = activeTextEditor.document;

  const numErrors =
    vscode.languages
      .getDiagnostics(document.uri)
      .filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;

  return numErrors;
}
