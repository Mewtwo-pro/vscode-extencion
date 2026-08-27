import * as vscode from 'vscode';
import { execSync } from 'child_process';

export class GitGitHubManager {
    private cwd: string;

    constructor(cwd: string) {
        this.cwd = cwd;
    }

    // 1. Verificar si existe 'origin' o pedir URL nueva
    public async github(): Promise<void> {
        try {
            // Verificar si ya existe un remote 'origin'
            const resultado = execSync('git remote get-url origin', {
                cwd: this.cwd,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();

            console.log(`El remoto ya existe: ${resultado}`);

            const mensaje = `El remote 'origin' ya existe:\n${resultado}\n\n¿Deseas usar este link?`;
            
            // Diálogo modal equivalente a sublime.ok_cancel_dialog
            const respuesta = await vscode.window.showInformationMessage(
                mensaje,
                { modal: true },
                'Sí, usar este'
            );

            if (respuesta === 'Sí, usar este') {
                console.log("Se usará el link existente.");
                this.gitPush();
            } else {
                console.log("Eliminando el remote actual para configurar uno nuevo...");
                execSync('git remote remove origin', {
                    cwd: this.cwd,
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                this.gitUrl();
            }

        } catch (error) {
            console.log("El remoto 'origin' no está configurado.");
            this.gitUrl();
        }
    }

    // 2. Pedir la URL del repositorio mediante un Input Box
    private async gitUrl(): Promise<void> {
        const urlInput = await vscode.window.showInputBox({
            prompt: 'link de github :',
            placeHolder: 'https://github.com/usuario/repositorio.git',
            ignoreFocusOut: true
        });

        if (!urlInput) {
            return; // Cancelado por el usuario
        }

        const clearName = urlInput.trim();
        if (!clearName) {
            return;
        }

        try {
            execSync(`git remote add origin "${clearName}"`, {
                cwd: this.cwd,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.gitPush();
        } catch (e: any) {
            const errorMsg = e.stderr ? e.stderr.toString() : e.message;
            vscode.window.showErrorMessage(`Error al crear: ${errorMsg}`);
        }
    }

    // 3. Hacer git push de la rama actual
    public gitPush(): void {
        try {
            const ramaActual = execSync('git branch --show-current', {
                cwd: this.cwd,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();

            vscode.window.setStatusBarMessage(`Haciendo push a origin/${ramaActual}...`, 4000);

            execSync(`git push -u origin "${ramaActual}"`, {
                cwd: this.cwd,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });

            vscode.window.showInformationMessage("github publicado con éxito.");

        } catch (e: any) {
            const errorMsg = e.stderr ? e.stderr.toString() : e.message;
            vscode.window.showErrorMessage(`Error al hacer push:\n${errorMsg}`);
        }
    }
}