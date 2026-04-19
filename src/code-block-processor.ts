import { App, MarkdownPostProcessorContext } from 'obsidian';
import {
    isCheckedProperty, isContentEndMarker, isContentProperty, isContentStartMarker, isLabelProperty,
    isTabEndMarker, isTabGroupNameProperty, isTabStartMarker, nextSibling
} from 'tabProcessor';
import { Tab } from 'tabs';
import { v4 as uuidv4 } from 'uuid';

import { TabManager } from './tabManager';

export class CodeBlockProcessor {
    private _tabManager: TabManager | null = null;

    get tabManager(): TabManager | null {
        return this._tabManager;
    }

    reset() {
        this._tabManager = null;
    }

    processTabGroup(source: string, container: ChildNode | null) {
        let inTabsDef: boolean = false;
        let inTabDef: boolean = false;
        let tabGroupName: string = ``;
        let tabId: string = ``;
        let labelText: string = ``;
        let checked: boolean = false;
        let content: string[] = [];
    
        this._tabManager = new TabManager();
        // On entry, childNode should be the tabsStarts node.
        const entries: string[] = source.split('\n');
        entries.forEach(element => {
            const line = element.trim();
            if (!inTabDef) {
                const [isTabGroupName, value] = isTabGroupNameProperty(line);
                if (isTabGroupName) {
                    tabGroupName = value;
                    return;
                }
                if (isTabStartMarker(line)) {
                    inTabDef = true;
                    tabId = `${uuidv4()}`;
                    return;
                }
            } else {
                const [isLabel, labelValue] = isLabelProperty(line);
                if (isLabel) {
                    labelText = labelValue;
                    return;
                }
                const [isChecked, checkedValue] = isCheckedProperty(line);
                if (isChecked) {
                    checked = checkedValue.toLowerCase() === 'true';
                    return;
                }
                const [isContent, contentValue] = isContentProperty(line);
                if (isContent) {
                    content.push(contentValue);
                    return;
                }
                if (isTabEndMarker(line)) {
                    inTabDef = false;

                    // See if we have the minimum neccessary to create a tab
                    if (tabGroupName === '')
                        return;
                    if (labelText == '')
                        labelText = 'Tab';
                    if (content.length === 0) {
                        const defaultContent: string =`Content for ${labelText}`;
                        content.push(defaultContent);
                    }
                        
                    this._tabManager?.createTab2(tabGroupName, tabId, labelText, checked, content);
                                        
                    // Reset to default values for next tab definition
                    tabId = ``;
                    labelText = ``;
                    checked = false;
                    content = [];
                    return;
                }
            }
        });
        this.buildDomForTabGroup(tabGroupName, container);
    }

    buildDomForTabGroup(tabGroupName: string, container: ChildNode | null): void {
        if (!container || !this._tabManager) return;

        const tabGroup = this._tabManager.getTabGroup(tabGroupName);
        if (!tabGroup) return;

        const tabsDiv = container.createEl('div', {cls: 'inline-tabs'});

        for (const tab of tabGroup.tabs) {
            if (!tab) return;
            const tabNode = tabsDiv.createEl('input', {type: 'radio'});
            tabNode.id = tab.tabId;
            tabNode.name = tabGroupName;
            tabNode.checked = tab.checked;

            tabsDiv.createEl('label', {text: tab.title, attr: {for: tab.tabId}});
            const tabInner = tabsDiv.createEl('div', {cls: 'inline-tab'});
            tab.content.forEach(line => {
                const p = tabInner.createEl('p', {text: line});
                tabInner.appendChild(p);
            });
        };
        container.appendChild(tabsDiv);
        this._tabManager?.resetTabGroups();
    }   
}
    