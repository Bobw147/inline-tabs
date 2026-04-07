import { App } from 'obsidian';
import { TabManager } from 'tabManager';

export class CodeBlockProcessor {
    private _tabManager: TabManager|null = null; 

    get tabManager(): TabManager | null {
        return this._tabManager;
    }

    process(app: App, source: string, containerElement: HTMLElement, ctx: object, runCount: number) {
        const nameFieldIndex = 0;
        const numFieldParts = 2;
        const minFieldCount = 3;
        const fieldNameIndex = 0;
        const fieldValueIndex = 1;
        
        this._tabManager = new TabManager(app, containerElement);

        // Convert the source string into an array of lines
        const tabInfo: string[] = source.split('\n');
        if (tabInfo.length <= minFieldCount) return;
    
        let tabGroupName: string = '';
    
        tabInfo.forEach((line, index) => {
            const splitLine: string[] = line.split(':');
            if (splitLine.length != numFieldParts) return;
            const fieldName: string = splitLine[fieldNameIndex]?.trim() || "";
            const fieldValue: string = splitLine[fieldValueIndex]?.trim() || "";

            if (index === 0) {
                // First string is mandated to be the name field, which is used to group tabs together.
                if (fieldName != 'name') return;
                tabGroupName = fieldValue;
            }
            else {
                this.tabManager!.createTab(tabGroupName+runCount.toString(), `${fieldName}-${index}`, fieldName, `${fieldValue} Title`, index == 1);
            }
        });
    }
}
    