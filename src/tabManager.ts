import { App, MarkdownView } from 'obsidian';

enum ViewMode {
    Edit = 'source',
    Preview = 'preview',
    Reading = 'reading'
}

// Remember to rename these classes and interfaces!
export class TabManager {
    private activeTab: HTMLInputElement | null = null;
    private tabsDiv: HTMLDivElement | null = null;
    private currentViewMode: ViewMode;
    private app: App;
    private wasSourceMode: boolean;

    constructor(app: App, containerEl: HTMLElement) {
        this.app = app;
        this.tabsDiv = containerEl.createEl('div', {cls: 'inline-tabs'});
        this.tabsDiv.addEventListener('click', mouseEvent => this.handleTabClick(mouseEvent));
        this.currentViewMode = this.getViewMode();
        this.wasSourceMode = false;
    }

    private handleTabClick(mouseEvent: MouseEvent) {
        const target = mouseEvent.target as HTMLElement;
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'radio') {
            const instances = document.getElementsByName((target as HTMLInputElement).name);
            instances.forEach(instance => {
                if (instance.id == target.id) {
                    if ((target as HTMLInputElement).checked && !(instance as HTMLInputElement).checked) {
                        (instance as HTMLInputElement).checked = true;
                    }
                    else if (!(target as HTMLInputElement).checked && (instance as HTMLInputElement).checked) {
                        (target as HTMLInputElement).checked = true;
                    }
                }
            });
            this.activeTab = target as HTMLInputElement;
        }
    }

    createTab(tabGroupName: string, tabId: string, labelText: string, title: string, isChecked: boolean = false): HTMLInputElement | null {
        if (this.tabsDiv) {
            const tab = this.tabsDiv.createEl('input', {type: 'radio'});
            if (!tab) return null;
            tab.checked = isChecked;
            tab.id = tabId;
            tab.name = tabGroupName;

            this.tabsDiv.createEl('label', {text: labelText, attr: {for: tabId}});
            const tabInner = this.tabsDiv.createEl('div', {cls: 'in-page-tab'})
            tabInner.createEl('h2', {text: title});
            tabInner.createEl('p', {text: `Content for ${labelText}`});
            return tab;
        }
        return null;
    }

    getViewMode(): ViewMode {
        const markdownView: MarkdownView | null = this.app.workspace.getActiveViewOfType(MarkdownView);
        const viewState = markdownView?.getState();
        if (viewState?.mode == 'preview' && viewState?.source == 'false') {
            return ViewMode.Reading;
        }
        return ViewMode.Edit;
    }
}
