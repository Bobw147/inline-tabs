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

    isMarker(node: ChildNode, propertyType: string, stripleadingNewlines: boolean = false): boolean {
        if (node.nodeName === '#text'&& node.textContent != null) {
            let textContent = node.textContent;
            if (stripleadingNewlines) {
                textContent = textContent.replace(/^[\r\n]+/, '');
            }
            return textContent.trim().toLowerCase() === propertyType.toLowerCase();
        }
        return false;
    }

    isContentStart(node: ChildNode): boolean {
        return this.isMarker(node, 'content-start');
    }

    isContentEnd(node: ChildNode): boolean {
        return this.isMarker(node, 'content-end');
    }

    isTabsStart(node: ChildNode, removeBR: boolean = false): boolean {
        return this.isMarker(node, '<>tabs-start', removeBR);
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

    nextSibling(currentNode: ChildNode | null, removeBR: boolean): ChildNode | null {
        let node: ChildNode | null = (currentNode ? currentNode.nextSibling : null);
        while (node) {
            if (node.nodeName === 'BR' && removeBR) {
                const next: ChildNode | null = node.nextSibling;
                node.remove();
                node = next;
            }
            else
                break;
        }
        return node;
    }

    process2(DOMContainer: HTMLElement, tabContainers: Element[]) {
        // DOMContainer is a 'div el-p' that contains all the declarations of all the top level tab groupings
        // tabContainers is an array of HTMLElelemnts that each contain the declarations for a single tab group.
        // There may be multiple tabContainers within a single DOMContainer.
        // if there are multiple top level tab groupings within a single leaf each tabContainer needs to be processed
        // separately to ensure that the tabs are grouped correctly.
        // Find all the tab groups in this leaf and process them
        for (const tabContainer of tabContainers) {
            if ((!tabContainer) || tabContainer.childNodes.length === 0) continue;
            let childNode: ChildNode | null = tabContainer.childNodes[0] as ChildNode;
            while (childNode && !this.isTabsStart(childNode, true)) {
                childNode = this.nextSibling(childNode, true) as ChildNode;
            }
            this.processTabGroup(DOMContainer, childNode);
        }
    }

    processTabGroup(DOMContainer: HTMLElement, childNode: ChildNode | null) {
        let inTabsDef: boolean = false;
        let inTabDef: boolean = false;
        let tabGroupName: string = ``;
        let tabId: string = ``;
        let labelText: string = ``;
        let checked: boolean = false;
        let content: HTMLElement[] = [];
    
        // On entry, childNode should be the tabsStarts node.
        while (childNode) {
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
                                    const [isolatedContent, nextChildNode] = this.processContent(childNode);
                                    content.push(...isolatedContent);
                                    childNode = nextChildNode as ChildNode;
                                    break;
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
                if (childNode) {
                    let nextNode: ChildNode = this.nextSibling(childNode, true) as ChildNode;
                    childNode.remove();
                    childNode = nextNode;
                }
            }
    }
    
    processContent(contentStartNode: ChildNode): [HTMLElement[], ChildNode | null] {
        const content: HTMLElement[] = [];

        let node: ChildNode | null = this.nextSibling(contentStartNode, true);
        contentStartNode.remove();
        while (node && !this.isContentEnd(node)) {
            const clone = node.cloneNode(true) as HTMLElement;
            content.push(clone);
            let nextNode: ChildNode | null = this.nextSibling(node, true);
            node.remove();
            node = nextNode;
        }
        return [content, node];  
    }
}


