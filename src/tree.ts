import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {explorer_mode} from './extension';
export class FileExplorerProvider implements vscode.TreeDataProvider<string> {
    private filterText: string = "";
    public mode_open = 0
    private currentFilteredItems: string[] = [];
    public currentPath: string = ""; // Ruta actual que estamos explorando
    public currentSelectedPath : string = "";
    private history: string[] = [];   // Para poder "volver atrás" si quieres
    private _onDidChangeTreeData = new vscode.EventEmitter<string | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }

setFilter(text: string) {
    const dirToRead = this.currentPath ||
        (vscode.window.activeTextEditor
            ? path.dirname(vscode.window.activeTextEditor.document.uri.fsPath)
            : "");

    if (!dirToRead) {
        return;
    }

    try {
        const matches = fs.readdirSync(dirToRead)
            .filter(file =>
                file.toLowerCase().includes(text.toLowerCase())
            );

        // Solo aplicar el filtro si existen coincidencias
        if (matches.length > 0) {
            this.filterText = text.toLowerCase();
            this.refresh();
        }
    } catch {
    }
}
// Inicializamos con la ruta del archivo activo
    setRootPath(path: string) {
        this.currentPath = path;
        this.filterText = "";
        this.refresh();
    }
getChildren(element?: string): string[] {
        // Determinamos la carpeta a leer
        const dirToRead = element || this.currentPath || (vscode.window.activeTextEditor ? path.dirname(vscode.window.activeTextEditor.document.uri.fsPath) : "");
        
        if (!dirToRead){
            vscode.window.showInformationMessage('no carpeta')
            return [];
        }

        try {
            const allFiles = fs.readdirSync(dirToRead);
            
            // FILTRADO: Ahora sí filtramos el contenido de la carpeta actual
            this.currentFilteredItems = allFiles
                .filter(file => file.toLowerCase().includes(this.filterText))
                .map(file => path.join(dirToRead, file));

            return this.currentFilteredItems;
        } catch {
            return [];
        }
    }

    getVisibleItems(): string[] {
        return this.currentFilteredItems;
    }

    getTreeItem(element: string): vscode.TreeItem {
        const isDir = fs.lstatSync(element).isDirectory();
        const item = new vscode.TreeItem(
            path.basename(element),
            vscode.TreeItemCollapsibleState.None
        );
        item.resourceUri = vscode.Uri.file(element);
        if (isDir) {
            item.iconPath = new vscode.ThemeIcon('file-directory')
            if (explorer_mode == 'abrir'){
                item.command = { 
                    command: 'myExtension.navigateFolder', 
                    title: "Entrar a carpeta", 
                    arguments: [element] 
                };
            };
        }

        return item;
    }
    resetToActiveEditor() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this.currentPath = path.dirname(editor.document.uri.fsPath);
            this.filterText = ""; // Limpiamos filtro al resetear
            this.refresh();
        }
    }

    // Método para subir un nivel (ir al directorio padre)
    goUpLevel() {
        if (this.currentPath) {
            const parent = path.dirname(this.currentPath);
            // Evitamos subir más allá de la raíz del sistema si es necesario
            if (parent !== this.currentPath) {
                this.currentPath = parent;
                this.refresh();
            }
        }
    }

}