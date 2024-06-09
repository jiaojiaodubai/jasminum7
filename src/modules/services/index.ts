import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import { isChineseTopAttachment } from "../menu";
import { requestDocument, text2HTMLDoc } from "../../utils/http";
import { renameAttachmentFromParent, selectItems } from "../../utils/translate";

export class API implements Service {
  constructor(service: Service) {
    Object.assign(this, service);
  }
  getRequestArgs(attachmentItem: Zotero.Item): Promise<RequestArgs> {
    throw new Error("Method not implemented.");
  }
  getSearchResults(doc: Document | Element): IOItems {
    throw new Error("Method not implemented.");
  }
  getSnapshot(item: Zotero.Item): Zotero.Item | undefined {
    throw new Error("Method not implemented.");
  }
  translate(
    doc: Document,
    referItem: Zotero.Item,
    saveAttachments?: boolean,
  ): Promise<Zotero.Item> {
    throw new Error("Method not implemented.");
  }
  async translateSnapshot(doc: Document, referItem: Zotero.Item) {
    return this.translate(doc, referItem, true);
  }

  async search(attachmentItem: Zotero.Item): Promise<boolean> {
    if (!isChineseTopAttachment(attachmentItem)) {
      return false;
    }
    const searchPage = await requestDocument(
      ...(await this.getRequestArgs(attachmentItem)),
    );
    const items = selectItems(this.getSearchResults(searchPage));
    ztoolkit.log("get search result: ", items);
    if (!items) {
      new ztoolkit.ProgressWindow(config.addonName)
        .createLine({
          text: getString("progress-search-unselected"),
          type: "fail",
        })
        .show();
      return false;
    } else {
      const urls = Object.keys(items);
      switch (urls.length) {
        case 1: {
          const item = await this.translate(
            await requestDocument(urls[0]),
            attachmentItem,
          );
          attachmentItem.parentID = item.id;
          await attachmentItem.saveTx();
          await renameAttachmentFromParent(attachmentItem);
          await item.saveTx();
          return true;
        }
        default: {
          for (const url of urls) {
            const item = await this.translate(
              await requestDocument(url),
              attachmentItem,
            );
            item.addRelatedItem(attachmentItem);
            await item.saveTx();
          }
          return true;
        }
      }
    }
  }

  async reTranslate(webpageItem: Zotero.Item) {
    const snapshotItem = this.getSnapshot(webpageItem);
    if (!snapshotItem) return;
    const filePath = await snapshotItem.getFilePathAsync();
    if (!filePath) return;
    const doc = text2HTMLDoc(
      (await Zotero.File.getContentsAsync(filePath)) as string,
      snapshotItem.getField("url"),
    );
    const item = await this.translateSnapshot(doc, snapshotItem);
    const childItems = Zotero.Items.get([
      ...webpageItem.getNotes(),
      ...webpageItem.getAttachments(),
    ]);
    for (const childItem of childItems) {
      childItem.parentID = item.id;
      await childItem.saveTx();
    }
    webpageItem.deleted = true;
    webpageItem.saveTx();
  }
}

export function initAPIs() {
  import(`./cnki`).then(
    (service) => (addon.api.cnki = new API(service.default)),
  );
}

export async function retrieveMetadata(items: Zotero.Item[]) {
  for (const item of items) {
    const isCNTA = isChineseTopAttachment(item);
    ztoolkit.log(`retrieve metadata for item ${item.id}`);
    for (const name in addon.api) {
      ztoolkit.log(`use API: ${name}`);
      const api = addon.api[name];
      if (isCNTA) {
        try {
          const result = await api.search(item);
          if (!result) continue;
          ztoolkit.log("translate successfully");
        } catch (error) {
          ztoolkit.log(error);
          continue;
        }
      } else if (api.getSnapshot(item)) {
        await api.reTranslate(item);
        ztoolkit.log("re-translate successfully");
      }
    }
  }
}
