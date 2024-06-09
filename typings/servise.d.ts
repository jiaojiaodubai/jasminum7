interface Service {
  getRequestArgs(attachmentItem: Zotero.Item): Promise<RequestArgs>;
  getSearchResults(doc: Document | Element): IOItems;
  getSnapshot(item: Zotero.Item): undefined | Zotero.Item;
  translate(
    doc: Document,
    referItem: Zotero.Item,
    saveAttachments: boolean = false,
  ): Promise<Zotero.Item>;
  translateSnapshot(
    doc: Document,
    referItem: Zotero.Item,
  ): ?Promise<Zotero.Item>;
}

type RequestArgs = [
  string,
  {
    method: string;
    headers: object;
    body: string;
  },
];
