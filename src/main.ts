import { MarkdownView, Plugin } from 'obsidian';

import { CodeBlockProcessor } from './code-block-processor';
import { DEFAULT_SETTINGS, InPageTabsSettings, InPageTabsSettingTab } from './settings';

// TODO: Consider whether there should be a single CodeProcessor block supporting multiple
// tabManger instances (current implementation)or multiple CodeProcessor instances each with a single
// tabManager instance. The former is likely more efficient but the latter may be more extensible and
// easier to maintain.

export default class InPageTabs extends Plugin {
	settings: InPageTabsSettings = DEFAULT_SETTINGS;
    codeBlockProcessor: CodeBlockProcessor | null = null;
    runCount: number = 0;
    intervalTimerRunning: boolean = false;

	async onload() {
		await this.loadSettings();

        this.registerMarkdownCodeBlockProcessor('page-tabs', (source, el, ctx) => {
            this.codeBlockProcessor = new CodeBlockProcessor();
            this.runCount++;    // Increment runCount to ensure unique radio group names for each code block instance.
            this.codeBlockProcessor.process(this.app, source, el, ctx, this.runCount);

            // Now the codeblock processor exists it is safe to start the interval timer.
            // Ensure, however that only a single interval timer is started
            if (!this.intervalTimerRunning){
		        this.registerInterval(window.setInterval(() => { void this.intervalTimer(); },  500));
                this.intervalTimerRunning = true;
            }
        });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new InPageTabsSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<InPageTabsSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
    
    async intervalTimer() {
        // This interval timer is currently used to check whether the view mode has changed,
        // and if so, update the tab visibility accordingly.
        // This is a workaround for the fact that there is no event that is triggered when the
        // view mode changes. The radio buttons are not selectable in Reading Mode if source=false
        // as this indicates Live Preview mode so the alternate buttons are active but do not
        // correspond with the diplayed set.
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView && this.codeBlockProcessor && this.codeBlockProcessor.tabManager) {
            await this.codeBlockProcessor.tabManager.monitorTabActivity(markdownView);
        }
    }
}
