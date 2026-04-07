import { Editor, MarkdownView, Plugin, ViewStateResult } from 'obsidian';

import { CodeBlockProcessor } from './code-block-processor';
import { DEFAULT_SETTINGS, InPageTabsSettings, InPageTabsSettingTab } from './settings';

export default class InPageTabs extends Plugin {
	settings: InPageTabsSettings = DEFAULT_SETTINGS;
    codeBlockProcessor: CodeBlockProcessor | null = null;
    runCount: number = 0;

	async onload() {
		await this.loadSettings();

        this.registerMarkdownCodeBlockProcessor('page-tabs', (source, el, ctx) => {
            const codeBlockProcessor: CodeBlockProcessor = new CodeBlockProcessor();
            this.runCount++;    // Increment runCount to ensure unique radio group names for each code block instance.
            codeBlockProcessor.process(this.app, source, el, ctx, this.runCount);
        });

        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (editor: Editor, ctx: MarkdownView) => {
				editor.replaceSelection('Sample editor command');
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new InPageTabsSettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => this.intervalTimer(),  500));

        this.registerDomEvent(document, 'change', (event) => {
            const target = event.target as HTMLElement;
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
            }
        });
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<InPageTabsSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
    
    intervalTimer() {
        // This interval timer is currently used to check whether the view mode has changed,
        // and if so, update the tab visibility accordingly.
        // This is a workaround for the fact that there is no event that is triggered when the
        // view mode changes. The radio buttons are not selectable in Reading Mode if source=false
        // as this indicates Live Preview mode so the alternate buttons are active but do not
        // correspond with the diplayed set.

        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const viewType = markdownView?.getViewType();
        const viewMode = markdownView?.getMode();
        const viewState = markdownView?.getState();
        if (viewState?.mode == 'preview' && !viewState?.source) {
            try {
                this.forceState(markdownView).catch((error) => {
                    console.error("Error forcing state:", error);
                });
            } catch (error) {
                console.error("Error forcing state:", error);
            }
        }
        console.log(`Interval timer triggered. View type: ${viewType}, view mode: ${viewMode}, view state: ${JSON.stringify(viewState)}`); 
    }

    async forceState(markdownView: MarkdownView | null){
        let viewStateResult: ViewStateResult;
        await markdownView?.setState({mode: 'preview', source: true}, viewStateResult);
    }
}
