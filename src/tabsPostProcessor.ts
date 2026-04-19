import { App, MarkdownPostProcessorContext } from 'obsidian';
import {
    isCheckedProperty, isContentEndMarker, isContentStartMarker, isLabelProperty, isTabEndMarker,
    isTabsEndMarker, isTabsStartMarker, isTabStartMarker, nextSibling
} from 'tabProcessor';
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
            while (childNode && !isTabsStartMarker(childNode, true)) {
                childNode = nextSibling(childNode, true) as ChildNode;
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
                    if (isTabsStartMarker(childNode)) {
                        inTabsDef = true;
                        inTabDef = false;
                        tabGroupName = `${uuidv4()}`;
                    }
                    break;
                case true:
                    // <>tabs-end as highest priority to end tabs definition
                    if (isTabsEndMarker(childNode)){
                        inTabsDef = false;
                        tabGroupName = ``;
                        break;
                    } else {
                        switch (inTabDef) {
                            case false:
                                if (isTabStartMarker(childNode)) {
                                    inTabDef = true;
                                    tabId = `${uuidv4()}`;
                                }
                                break;
                            case true: {
                                const [isLabel, value] = isLabelProperty(childNode);
                                if (isLabel) {
                                    labelText = value;
                                    break;
                                }
                                const [isChecked, checkedValue] = isCheckedProperty(childNode);
                                if (isChecked) {
                                    checked = checkedValue.toLowerCase() === 'true';
                                    break;
                                }
                                if (isContentStartMarker(childNode)) {
                                    // Create a document fragment to hold the content as we may need
                                    // to move multiple nodes into the content of the tab.
                                    const [isolatedContent, nextChildNode] = this.processContent(childNode);
                                    content.push(...isolatedContent);
                                    childNode = nextChildNode as ChildNode;
                                    break;
                                }
                                if (isTabEndMarker(childNode)) {
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
                    let nextNode: ChildNode = nextSibling(childNode, true) as ChildNode;
                    childNode.remove();
                    childNode = nextNode;
                }
            }
    }
    
    processContent(contentStartNode: ChildNode): [HTMLElement[], ChildNode | null] {
        const content: HTMLElement[] = [];

        let node: ChildNode | null = nextSibling(contentStartNode, true);
        contentStartNode.remove();
        while (node && !isContentEndMarker(node)) {
            const clone = node.cloneNode(true) as HTMLElement;
            content.push(clone);
            let nextNode: ChildNode | null = nextSibling(node, true);
            node.remove();
            node = nextNode;
        }
        return [content, node];  
    }
}


