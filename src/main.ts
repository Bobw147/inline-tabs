import { MarkdownView, Plugin } from 'obsidian';
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

/*
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
*/

        // This registers a markdown post processor which looks for code blocks with the language 'page-tabs' and processes them using the CodeBlockProcessor.
        this.registerMarkdownPostProcessor((container, ctx) => {
            const tabsContainer: HTMLElement[] = this.findTabStarts(container);
            if (tabsContainer.length === 0) return;
            const tabsPostProcessor = new TabsPostProcessor(this.app, container, ctx);
            tabsPostProcessor.process2(tabsContainer);
        });
/*
            // Check to see if there any tabstart markers in the container.
            const tabStarts: Element[] = this.findElementsWithText(container, '<>tabs-start');
            if (tabStarts.length === 0) return;

            const tabsPostProcessor = new TabsPostProcessor(this.app, container, ctx, )
            tabsPostProcessor.process(tabStarts);
        });
*/
 /*           const tabStarts = this.findElementsWithText(container, '<>tabs-start');
            if (tabStarts.length === 0) return;
            for (const tabStart of tabStarts) {
                const contentEnd = tabStart.textContent?.indexOf('<>tabs-end');
                if (contentEnd === undefined || contentEnd === -1) break;
            
                const source = tabStart.textContent?.substring('<>tabs-start'.length, contentEnd);
                if (!source) continue;

                const header: string[] = source.split('\n');
                let tabGroupName: string = '';
                let labelText: string = '';
                let checked: boolean = false;
                let content: string = '';
                try {
                    for (const line of header) {
                        const [key, value] = line.split(':').map(part => part.trim());
                        if (!key || !value) continue;

                        if (key.toLowerCase() == 'tabgroupname') tabGroupName = value;
                        else if (key.toLowerCase() == 'label') labelText = value;
                        else if (key.toLowerCase() == 'checked') checked = (value.toLowerCase() == 'true');
                        else if (key.toLowerCase() == 'content') content = value;
                    }
                    if (!tabGroupName || !labelText) continue;

                    const tabsDiv = container.createEl('div', {cls: 'inline-tabs'});
                    const tabInput = tabsDiv?.createEl('input', {type: 'radio'});
                    if (!tabInput ) continue;
                    tabInput.name = tabGroupName;
                    tabInput.id = `${tabGroupName}-${labelText}`;
                    tabInput.checked = checked;
                    tabsDiv.createEl('label', {text: labelText, attr: {for: tabInput.id}});

                    const tabInner = tabsDiv.createEl('div', {cls: 'inline-tab'})
                    tabInner.createEl('span', {text: content});

                    // Find the embedded item in the DOMM and relocate inside the tab content space
                    const embeddedItem = container.querySelector('.internal-embed');
                    console.log(tabStarts); // Outputs matching elements
                } catch (error) {
                    // Any error in the header that makes it invalid remains as plain text to show the error to the user
                    // and processing continues for any other valid tab blocks in the same file.
                    continue;
                }
            }
        });
*/        
        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new InPageTabsSettingTab(this.app, this));
	}

    findElementsWithText(container: HTMLElement, searchText: string) {
        return Array.from(container.querySelectorAll('text'))
        .filter(element => element.textContent.includes(searchText));
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

    findTabStarts(container: HTMLElement): HTMLElement[] {
        const tabStarts: HTMLElement[] = [];
        const elements = container.querySelectorAll('p');
        elements.forEach(element => {
            if (element.textContent.includes('<>tabs-start')) {
                tabStarts.push(element as HTMLElement);
            }
        });
        return tabStarts;
    }

    tabProcessor(container: HTMLElement) {
        const tabStarts = this.findTabStarts(container);

        if (tabStarts.length === 0) return;
        for (const tabStart of tabStarts) {
            const contentEnd = tabStart.textContent?.indexOf('<>tabs-end');
            if (contentEnd === undefined || contentEnd === -1) break;
            
            const source = tabStart.textContent?.substring('<>tabs-start'.length, contentEnd);
            if (!source) continue;

            const header: string[] = source.split('\n');
            let tabGroupName: string = '';
            let labelText: string = '';
            let checked: boolean = false;
            let content: string = '';
            try {
                for (const line of header) {
                    const [key, value] = line.split(':').map(part => part.trim());
                    if (!key || !value) continue;

                    if (key.toLowerCase() == 'tabgroupname') tabGroupName = value;
                        else if (key.toLowerCase() == 'label') labelText = value;
                        else if (key.toLowerCase() == 'checked') checked = (value.toLowerCase() == 'true');
                        else if (key.toLowerCase() == 'content') content = value;
                }
                if (!tabGroupName || !labelText) continue;

                const tabsDiv = container.createEl('div', {cls: 'inline-tabs'});
                const tabInput = tabsDiv?.createEl('input', {type: 'radio'});
                if (!tabInput ) continue;
                tabInput.name = tabGroupName;
                tabInput.id = `${tabGroupName}-${labelText}`;
                tabInput.checked = checked;
                tabsDiv.createEl('label', {text: labelText, attr: {for: tabInput.id}});

                const tabInner = tabsDiv.createEl('div', {cls: 'inline-tab'})
                tabInner.createEl('span', {text: content});

                // Find the embedded item in the DOMM and relocate inside the tab content space
                const embeddedItem = container.querySelector('.internal-embed');
                console.log(tabStarts); // Outputs matching elements
            } catch (error) {
                // Any error in the header that makes it invalid remains as plain text to show the error to the user
                // and processing continues for any other valid tab blocks in the same file.
                continue;
            }
        }
    }
}

