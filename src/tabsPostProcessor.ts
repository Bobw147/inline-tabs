import { App, MarkdownPostProcessorContext } from 'obsidian';
import { v4 as uuidv4 } from 'uuid';

import { TabManager } from './tabManager';

export class TabsPostProcessor {
    private _container: HTMLElement;
    private _ctx: MarkdownPostProcessorContext;
    private _tabManager: TabManager | null = null;

    constructor(app: App, container: HTMLElement, ctx: MarkdownPostProcessorContext) {
        this._container = container;
        this._ctx = ctx;
        this._tabManager = new TabManager(app, container);
    }

    isMarker(node: ChildNode, propertyType: string): boolean {
        if (node.nodeName === '#text' && node.textContent != null) {
            return node.textContent.trim().toLowerCase() === propertyType.toLowerCase();
        }
        return false;
    }

    isContentStart(node: ChildNode): boolean {
        return this.isMarker(node, 'content-start');
    }

    isContentEnd(node: ChildNode): boolean {
        return this.isMarker(node, 'content-end');
    }

    isTabsStart(node: ChildNode): boolean {
        return this.isMarker(node, '<>tabs-start');
    }

    isTabsEnd(node: ChildNode): boolean {
        return this.isMarker(node, '<>tabs-end');
    }

    isTabStart(node: ChildNode): boolean {
        return this.isMarker(node, '<>tab-start');
    }

    isTabEnd(node: ChildNode): boolean {
        return this.isMarker(node, '<>tab-end');
    }

    isProperty(node: ChildNode, propertyType: string): [boolean, string] {
        const fieldId = 0;
        const fieldValue = 1;
        const expectedFieldCount = 2;

        if (node.nodeName === '#text' && node.textContent != null) {
            const splitLine: string[] = node.textContent.split(':');
            if (splitLine && splitLine.length === expectedFieldCount &&
                splitLine[fieldId] !== undefined && 
                splitLine[fieldValue] !== undefined &&
                splitLine[fieldId].trim().toLowerCase() === propertyType.toLowerCase())
            return [true, splitLine[fieldValue].trim()];
        }
        return [false, ''];
    }

    isChecked(node: ChildNode): [boolean, string] {
        return this.isProperty(node, 'checked');
    }

    isLabel(node: ChildNode): [boolean, string] {
        return this.isProperty(node, 'label');
    }

    process2(tabsContainer: Element[]) {
        let inTabsDef: boolean = false;
        let inTabDef: boolean = false;
        let tabGroupName: string = ``;
        let tabId: string = ``;
        let labelText: string = ``;
        let checked: boolean = false;
        let content: HTMLElement[] = [];

        for (const container of tabsContainer) {
            let childNode: ChildNode | undefined | null = container.childNodes[0];
            do {
                if (!childNode) break;
                if (childNode.nodeName === 'BR') {
                    childNode = childNode.nextSibling;
                    continue;
                }
                switch (inTabsDef) {
                    case false:
                        if (this.isTabsStart(childNode)) {
                            inTabsDef = true;
                            inTabDef = false;
                            tabGroupName = `${uuidv4()}`;
                        }
                        break;
                    case true:
                        // <>tabs-end as highest priority to end tabs definition
                        if (this.isTabsEnd(childNode)){
                            inTabsDef = false;
                            tabGroupName = ``;
                            break;
                        } else {
                            switch (inTabDef) {
                                case false:
                                    if (this.isTabStart(childNode)) {
                                        inTabDef = true;
                                        tabId = `${uuidv4()}`;
                                    }
                                    break;
                                case true: {
                                    const [isLabel, value] = this.isLabel(childNode);
                                    if (isLabel) {
                                        labelText = value;
                                        break;
                                    }
                                    const [isChecked, checkedValue] = this.isChecked(childNode);
                                    if (isChecked) {
                                        checked = checkedValue.toLowerCase() === 'true';
                                        break;
                                    }
                                    if (this.isContentStart(childNode)) {
                                        // Create a document fragment to hold the content as we may need
                                        // to move multiple nodes into the content of the tab.
                                        const [isolatedContent, newChildNode] = this.processContent(childNode);
                                        content.push(...isolatedContent);
                                        childNode = newChildNode;
                                        break
                                    }
                                    if (this.isTabEnd(childNode)) {
                                        inTabDef = false;

                                        // See if we have the minimum neccessary to create a tab
                                        if (labelText == '')
                                            labelText = 'Tab';
                                        if (content.length === 0) {
                                            const defaultContent: HTMLElement = document.createElement('div');
                                            defaultContent.textContent = `Content for ${labelText}`;
                                            content.push(defaultContent);
                                        }
                        
                                        this._tabManager?.createTab(tabGroupName, tabId, labelText, checked, content);
                                        
                                        // Reset to default values for next tab definition
                                        tabId = ``;
                                        labelText = ``;
                                        checked = false;
                                        content = [];
                                    }
                                    break;
                                }
                            }
                        }
                        break;
                }
                childNode = childNode.nextSibling;
            } while (childNode);
        }
    }

    processContent(contentStartNode: ChildNode): [HTMLElement[], ChildNode | null] {
        const content: HTMLElement[] = [];
        if (contentStartNode.nextSibling == null) return [content, null];

        let node: ChildNode = contentStartNode.nextSibling;
        while (node && !this.isContentEnd(node)) {
            content.push(node.cloneNode(true) as HTMLElement);

            if (node.nextSibling)
                node = node.nextSibling;
            else
                break;  
        }
        return [content, node];
    }

    process(tabStarts: Element[]) {
        for (const tabBlock of tabStarts) {
            let tabGroupName: string = `${uuidv4()}`;
            const contentEnd = tabBlock.textContent?.indexOf('<>tabs-end');
            if (contentEnd === undefined || contentEnd === -1) continue;
            const source = tabBlock.textContent?.substring('<>tabs-start'.length+1, contentEnd-('<>tabs-end'.length + 1));
            this.processTabBlocks(tabGroupName, source);
            console.log(source);
        }
    }

    processTabBlocks(tabGroupName: string, source: string) {
        const tabBlock: string[] = source.split('<>tab-start');
        for (const tabInfo of tabBlock) {
            if (tabInfo.trim().length === 0) continue;
            this.processTabInfo(tabGroupName, tabInfo);
        }
        console.log(tabBlock);
    }

    processTabInfo(tabGroupName: string, tabInfo: string) {
        let labelText: string = '';
        let checked: boolean = false;
        let content: string = '';
        let tabId: string = "";

        const lines: string[] = tabInfo.split('\n');
        if (lines.length === 0) return;
        lines.forEach((line, index) => {
            if (line.trim().length === 0) return;
            const [key, value] = line.split(':').map(part => part.trim());

            if (!key || !value) return;
            switch (key.toLowerCase()) {
                case 'tabgroupname':
                    tabGroupName = value;
                    break;
                case 'labeltext':
                    labelText = value;
                    break;
                case 'checked':
                    checked = value.toLowerCase() === 'true';
                    break;
                case 'content':
                    content = value;
                    break;
                case '<>tab-end':
                    // Handle tab end if needed
                    break;
                default:
                    break;
            }
        });
        if (labelText == '')
            labelText = 'Tab';
        if (content == '')
            content = 'Content for ' + labelText;
        tabId = `${uuidv4()}`;
        console.log(lines);
        this._tabManager?.createTab(tabGroupName, tabId, labelText, checked, content);
    }
}
