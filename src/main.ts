import { MarkdownView, Plugin } from 'obsidian';
import { TabGroup } from 'tabs';
import { TabsPostProcessor } from 'tabsPostProcessor';

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

        this.registerMarkdownCodeBlockProcessor('inline-tabs', (source, el, ctx) => {
            if (!this.codeBlockProcessor) {
                this.codeBlockProcessor = new CodeBlockProcessor();
            }
            this.codeBlockProcessor.processTabGroup(source, el);
        });

        // Register a markdown post processor
        this.registerMarkdownPostProcessor((container, ctx) => {
            const tabStarts = this.findTabStarts(container);
            tabStarts.forEach(tabStart => {
                this.codeBlockProcessor?.buildDomForTabGroup('FirstTabGroup', container, "append");
            });
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
//        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
 //       if (markdownView && this.codeBlockProcessor && this.codeBlockProcessor.tabManager) {
//            await this.codeBlockProcessor.tabManager.monitorTabActivity(markdownView);
//        }
    }

    findTabStarts(container: HTMLElement): HTMLElement[] {
        const tabStarts: HTMLElement[] = [];
        const elements: NodeListOf<HTMLDivElement> = container.querySelectorAll('*');
        elements.forEach(element => {
            if (element.textContent.trim().startsWith('<>FirstTabGroup')) {
                tabStarts.push(element as HTMLElement);
            }
        });
        return tabStarts;
    }
}

