import * as vscode from 'vscode';
import { execSync } from 'child_process';

export class GitBranchManager {
    private cwd: string;
    private branchesList: string[] = [];

    constructor(cwd: string) {
        this.cwd = cwd;
    }

    // 1. Mostrar las ramas de Git
    public showBranches(): void {
        try {
            const stdout = execSync('git branch -a', {
                cwd: this.cwd,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.branchesList = stdout
                .split(/\r?\n/)
                .map((line: string) => line.trim())
                .filter(Boolean);

            // Mostrar el selector rápido (equivalente a show_quick_panel)
            vscode.window.showQuickPick(this.branchesList, {
                placeHolder: 'Selecciona una rama para cambiar'
            }).then(selected => {
                if (selected) {
                    this.onSelectBranch(selected);
                }
            });

        } catch (error: any) {
            const errorMsg = error.stderr ? error.stderr.toString() : error.message;
            vscode.window.showErrorMessage(`Error al obtener las ramas:\n${errorMsg}`);
        }
    }

    // 2. Manejar la selección de la rama
    private async onSelectBranch(rawBranch: string): Promise<void> {
        let selectedBranch = rawBranch.replace('*', '').trim();

        if (selectedBranch.startsWith('remotes/')) {
            const parts = selectedBranch.split('/');
            if (parts.length > 2) {
                selectedBranch = parts[parts.length - 1]; // equivalente a parts[-1]
            }
        }

        // Intentar hacer el switch
        const [success, errorMsg] = this.trySwitchBranch(selectedBranch);

        if (!success) {
            // Si falla por cambios locales, preguntar si desea hacer stash automático
            if (errorMsg.includes('would be overwritten') || errorMsg.includes('local changes')) {
                const answer = await vscode.window.showInformationMessage(
                    "¿Deseas hacer un 'stash' de tus cambios y cambiar de rama?",
                    { modal: true },
                    'Sí',
                    'No'
                );

                if (answer === 'Sí') {
                    try {
                        // 1. Guardar cambios en stash
                        execSync('git stash push -m "Auto-stash por GitExplorer en VS Code"', {
                            cwd: this.cwd,
                            stdio: ['pipe', 'pipe', 'pipe']
                        });

                        // 2. Reintentar switch
                        const [successRetry, errRetry] = this.trySwitchBranch(selectedBranch);
                        if (successRetry) {
                            // 3. Aplicar stash en la nueva rama
                            execSync('git stash pop', {
                                cwd: this.cwd,
                                stdio: ['pipe', 'pipe', 'pipe']
                            });
                            vscode.window.showInformationMessage(`¡Cambiado a '${selectedBranch}' y cambios restaurados con éxito!`);
                        } else {
                            vscode.window.showErrorMessage(`No se pudo cambiar de rama: ${errRetry}`);
                        }
                    } catch (stashErr: any) {
                        const stashErrorMsg = stashErr.stderr ? stashErr.stderr.toString() : stashErr.message;
                        vscode.window.showErrorMessage(`Error al procesar el stash:\n${stashErrorMsg}`);
                    }
                }
            } else {
                vscode.window.showErrorMessage(`No se pudo cambiar de rama:\n${errorMsg}`);
            }
        }
    }

    // 3. Intentar cambiar de rama (con fallback de switch a checkout)
    private trySwitchBranch(branchName: string): [boolean, string] {
        try {
            execSync(`git switch ${branchName}`, {
                cwd: this.cwd,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
            vscode.window.setStatusBarMessage(`Cambiado a la rama: ${branchName}`, 4000);
            return [true, ''];
        } catch (switchError) {
            // Fallback a checkout antiguo
            try {
                execSync(`git checkout ${branchName}`, {
                    cwd: this.cwd,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                vscode.window.setStatusBarMessage(`Cambiado a la rama: ${branchName}`, 4000);
                return [true, ''];
            } catch (checkoutError: any) {
                const errStderr = checkoutError.stderr ? checkoutError.stderr.toString().trim() : checkoutError.message;
                return [false, errStderr];
            }
        }
    }
}