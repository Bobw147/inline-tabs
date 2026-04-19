
export function isMarker(text: string, propertyType: string, stripleadingNewlines: boolean = false): boolean {
    return text.trim().toLowerCase() === propertyType.toLowerCase();
}

export function isContentStartMarker(text: string): boolean {
    return isMarker(text, 'content-start');
}

export function isContentEndMarker(text: string): boolean {
    return isMarker(text, 'content-end');
}

export function isTabsStartMarker(text: string, removeBR: boolean = false): boolean {
    return isMarker(text, '<>tabs-start');
}

export function isTabsEndMarker(text: string): boolean {
    return isMarker(text, '<>tabs-end');
}

export function isTabStartMarker(text: string): boolean {
    return isMarker(text, 'tab-start');
}

export function isTabEndMarker(text: string): boolean {
    return isMarker(text, 'tab-end');
}

export function isProperty(text: string, propertyType: string): [boolean, string] {
    const fieldId = 0;
    const fieldValue = 1;
    const expectedFieldCount = 2;

    const splitLine: string[] = text.split(':');
    if (splitLine && splitLine.length === expectedFieldCount &&
        splitLine[fieldId] !== undefined && 
        splitLine[fieldValue] !== undefined &&
        splitLine[fieldId].trim().toLowerCase() === propertyType.toLowerCase())
        return [true, splitLine[fieldValue].trim()];
    return [false, ''];
}

export function isCheckedProperty(text: string): [boolean, string] {
    return isProperty(text, 'checked');
}

export function isLabelProperty(text: string): [boolean, string] {
    return isProperty(text, 'label');
}

export function isContentProperty(text: string): [boolean, string] {
    return isProperty(text, 'content');
}

export function isTabGroupNameProperty(text: string): [boolean, string] {
    return isProperty(text, 'tab-group-name');
}

export function nextSibling(currentNode: ChildNode | null, removeBR: boolean): ChildNode | null {
    let node: ChildNode | null = (currentNode ? currentNode.nextSibling : null);
    while (node) {
        if (node.nodeName === 'BR') {
            const next: ChildNode | null = node.nextSibling;
            if (removeBR)
                node.remove();
            node = next;
        }
        else
            break;
    }
    return node;
}
