import { App, MarkdownView, ViewStateResult } from 'obsidian';

enum ViewMode {
    Edit = 0,
    LivePreview = 1,
    Reading_Source_True = 2,
    Reading_Source_False = 3,
    Invalid_View_State = 4
}

// Remember to rename these classes and interfaces!
export class TabManager {
    private activeTab: HTMLInputElement | null = null;
    private tabsDiv: HTMLDivElement | null = null;
    private currentViewMode: ViewMode | null = null;
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
                    (instance as HTMLInputElement).checked = (target as HTMLInputElement).checked;
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

        // Ensure returned ViewState is valid
        if (!viewState) return ViewMode.Invalid_View_State;

        // 'source' mode is a straight select between LivePreview and Edit`
        if (viewState.mode == 'source')
            return viewState.source ? ViewMode.Edit : ViewMode.LivePreview;

        if (viewState.mode == 'preview')
            return viewState.source ? ViewMode.Reading_Source_True : ViewMode.Reading_Source_False;
        return ViewMode.Invalid_View_State;
    }

    async monitorTabActivity(markdownView: MarkdownView) {
        const newViewMode = this.getViewMode();
        if (this.currentViewMode === null) {
            this.currentViewMode = newViewMode;
            return;
        }

        // Get the new view mode. If it has changed update the current view mode
        // and handle the change if needed.
        if (newViewMode !== this.currentViewMode) {
            this.currentViewMode = newViewMode;
            let viewStateResult: ViewStateResult = {history: false};
            if (newViewMode == ViewMode.Reading_Source_False) {
                await markdownView?.setState({mode: 'preview', source: true}, viewStateResult);
            }
        }
    }
}
