import { v4 as uuidv4 } from 'uuid';

export class Tab {
    private _title: string;
    private _checked: boolean;
    private _content: ChildNode[];
    private _tabId: string = uuidv4();
    
    constructor(title: string, checked: boolean, content: ChildNode []) {
        this._title = title;
        this._checked = checked;
        this._content = content;
    }

    get title(): string {
        return this._title;
    }

    get checked(): boolean {
        return this._checked;
    }

    get tabId(): string {
        return this._tabId;
    }

    get content(): ChildNode[] {
        return this._content;
    }
}

export class TabGroup {
    private _tabs: Tab[] = [];
    private _groupId: string = uuidv4();

    public get groupId(): string {
        return this._groupId;
    }

    public get tabs(): Tab[] {
        return this._tabs;
    }

    public addTab(tab: Tab): void {
        this._tabs.push(tab);
    }

    public reset(): void {
        this._tabs = [];
    }
}
