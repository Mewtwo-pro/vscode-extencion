import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as path from 'path';

function openCommit(commitHashx: string){
        const commitHash = commitHashx
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.uri.fsPath) {
            vscode.window.setStatusBarMessage("No hay un archivo activo guardado en disco.", 4000);
            return;
        }

        const fileName = editor.document.uri.fsPath;
        const localPath = path.dirname(fileName);

        let fileDir: string;
        try {
            fileDir = execSync('git rev-parse --show-toplevel', {
                cwd: localPath,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
        } catch (e) {
            vscode.window.setStatusBarMessage("El archivo no pertenece a un repositorio Git.", 4000);
            return;
        }

        const relPath = path.relative(fileDir, fileName).replace(/\\/g, '/');
        if (!relPath) {
            vscode.window.setStatusBarMessage("El archivo no pertenece a un repositorio Git.", 4000);
            return;
        }

        // 1. Verificar si el archivo existía en ese commit
        if (!fileExistsInCommit(fileDir, commitHash, relPath)) {
            vscode.window.setStatusBarMessage(`El archivo no pertenece o no existía en el commit ${commitHash}.`, 4000);
            return;
        }

        // 2. Obtener el contenido del archivo en ese commit
        const content = getFileContentFromCommit(fileDir, commitHash, relPath);

        if (content !== null) {
            // 3. Crear un documento virtual / pestaña nueva en VS Code
            const doc =  vscode.workspace.openTextDocument({
                content: content,
                language: editor.document.languageId // Copia el lenguaje/sintaxis original
            });
        } else {
            vscode.window.setStatusBarMessage("No se pudo leer el contenido del commit.", 4000);
        }
    }
function fileExistsInCommit(cwd: string, commitHash: string, relPath: string): boolean {
    try {
        const result = execSync(`git ls-tree -r ${commitHash} --name-only`, {
            cwd,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        const files = result.split(/\r?\n/).map(l => l.trim());
        return files.includes(relPath);
    } catch {
        return false;
    }
}

function getFileContentFromCommit(cwd: string, commitHash: string, relPath: string): string | null {
    try {
        return execSync(`git show "${commitHash}:${relPath}"`, {
            cwd,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch {
        return null;
    }
}

export class GitCommitManager {
    private cwd: string;
    private commitsList: string[] = [];
    private currentCommitFiles: string[] = [];
    private selectedCommitIndex: number = 0;

    constructor(cwd: string) {
        this.cwd = cwd;
    }

    // 1. Mostrar la lista de commits
    public showCommits(): void {
        try {
            // Nota: En Windows con Git Bash / PowerShell, usar pipes complejos con 'awk' a veces requiere 'shell: true'
            // O podemos filtrar por Node.js para evitar problemas de compatibilidad con shells.
            const command = "git log --decorate --oneline | awk '/\\(/ {c++; if(c==2) exit} {print}'";
            const stdout = execSync(command, {
                cwd: this.cwd,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Procesar líneas (simulando el límite de awk si es necesario, o mostrando las recientes)
            let commits = stdout
                .split(/\r?\n/)
                .map((line: string) => line.trim())
                .filter(Boolean);

            if (commits.length === 0) {
                vscode.window.showInformationMessage("No hay commits en esta rama todavía o está vacía.");
                return;
            }

            this.commitsList = commits;

            // Mapear al formato que espera showQuickPick
            const pickItems = commits.map(c => ({
                label: c,
                description: ''
            }));

            vscode.window.showQuickPick(pickItems, {
                placeHolder: 'Selecciona un commit'
            }).then(selected => {
                if (selected) {
                    const index = this.commitsList.indexOf(selected.label);
                    if (index !== -1) {
                        this.onSelectCommit(index);
                    }
                }
            });

        } catch (error: any) {
            const errorMsg = error.stderr ? error.stderr.toString() : error.message;
            vscode.window.showErrorMessage(`Error al obtener los commits:\n${errorMsg}`);
        }
    }

    // 2. Mostrar opciones para el commit seleccionado
    private onSelectCommit(index: number): void {
        this.selectedCommitIndex = index;
        
        const options = [
            { label: "view files commit", detail: "muestra los files" },
            { label: "open commit in file", detail: "abre en un buffer el commit actual" },
            { label: "copy commit to all files", detail: "modifica todos los files del commit" },
            { label: "copy commit to current file", detail: "modifica el contenido actual con el commit" },
        ];

        vscode.window.showQuickPick(options, {
            placeHolder: 'Selecciona una acción para el commit'
        }).then(selected => {
            if (!selected) return;
            const opIndex = options.findIndex(o => o.label === selected.label);
            this.opcionesCommit(opIndex);
        });
    }

    // 3. Enrutar según la opción elegida
    private opcionesCommit(index: number): void {
        switch (index) {
            case 0:
                this.viewFilesToCommit(this.selectedCommitIndex);
                break;
            case 1:
                this.openCommitBuffer(this.selectedCommitIndex);
                break;
            case 2:
                this.copyCommitAllFiles(this.selectedCommitIndex);
                break;
            case 3:
                this.copyCommitCurrentFile(this.selectedCommitIndex);
                break;
        }
    }

    // 4. Copiar commit a todos los archivos (`git checkout <hash> -- .`)
    private copyCommitAllFiles(index: number): void {
        const selectedLine = this.commitsList[index];
        const commitHash = selectedLine.split(' ')[0];

        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.uri.fsPath) {
            vscode.window.setStatusBarMessage("No hay un archivo activo guardado en disco.", 4000);
            return;
        }

        const localPath = path.dirname(editor.document.uri.fsPath);
        
        try {
            const fileDir = execSync('git rev-parse --show-toplevel', {
                cwd: localPath,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();

            execSync(`git checkout ${commitHash} -- .`, {
                cwd: fileDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            vscode.window.showInformationMessage("Workspace actualizado con el commit.");
        } catch (error: any) {
            const errorMsg = error.stderr ? error.stderr.toString() : error.message;
            vscode.window.showErrorMessage(`Error Git:\n${errorMsg}`);
        }
    }

    // 5. Copiar commit al archivo actual (`git checkout <hash> -- <rel_path>`)
    private copyCommitCurrentFile(index: number): void {
        const selectedLine = this.commitsList[index];
        const commitHash = selectedLine.split(' ')[0];

        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.uri.fsPath) {
            vscode.window.setStatusBarMessage("No hay un archivo activo guardado en disco.", 4000);
            return;
        }

        const fileName = editor.document.uri.fsPath;
        const localPath = path.dirname(fileName);

        try {
            const fileDir = execSync('git rev-parse --show-toplevel', {
                cwd: localPath,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();

            const relPath = path.relative(fileDir, fileName).replace(/\\/g, '/');
            if (!relPath) {
                vscode.window.setStatusBarMessage("El archivo no pertenece a un repositorio Git.", 4000);
                return;
            }

            execSync(`git checkout ${commitHash} -- "${relPath}"`, {
                cwd: fileDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            vscode.window.showInformationMessage("Current file actualizado.");
        } catch (error: any) {
            const errorMsg = error.stderr ? error.stderr.toString() : error.message;
            vscode.window.showErrorMessage(`Error Git:\n{errorMsg}`);
        }
    }

    // 6. Abrir commit en un buffer virtual (equivalente al comando custom de Sublime)
    private openCommitBuffer(index: number): void {
        const selectedLine = this.commitsList[index];
        const commitHash = selectedLine.split(' ')[0];
        openCommit(commitHash)
    }

    // 7. Ver archivos modificados en un commit específico (`git show --name-only`)
    private viewFilesToCommit(index: number): void {
        if (index === -1) return;

        const selectedLine = this.commitsList[index];
        const commitHash = selectedLine.split(' ')[0];

        vscode.window.setStatusBarMessage(`Analizando commit: ${commitHash}`, 3000);

        try {
            const stdout = execSync(`git show --name-only --pretty= ${commitHash}`, {
                cwd: this.cwd,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const files = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

            if (files.length === 0) {
                vscode.window.showInformationMessage("Este commit no contiene archivos registrados.");
                return;
            }

            this.currentCommitFiles = files;

            const pickFiles = files.map(f => ({ label: `Archivo: ${f}` }));

            vscode.window.showQuickPick(pickFiles, {
                placeHolder: 'Selecciona un archivo del commit'
            }).then(selected => {
                if (selected) {
                    const fileIndex = pickFiles.findIndex(p => p.label === selected.label);
                    if (fileIndex !== -1) {
                        this.onSelectCommitFile(fileIndex);
                    }
                }
            });

        } catch (error: any) {
            const errorMsg = error.stderr ? error.stderr.toString() : error.message;
            vscode.window.showErrorMessage(`Error al obtener los archivos del commit:\n${errorMsg}`);
        }
    }

    private onSelectCommitFile(index: number): void {
        if (index === -1) return;
        const selectedFile = this.currentCommitFiles[index];
        vscode.window.setStatusBarMessage(`Archivo seleccionado del commit: ${selectedFile}`, 4000);
    }
}