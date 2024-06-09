import { json2URI } from "../../utils/http";
import { getPref } from "../../utils/prefs";
import { DocTools, getPDFTitle } from "../../utils/translate";

const cnki: Service = {
  getRequestArgs,
  getSearchResults,
  translate,
  translateSnapshot,
  getSnapshot,
};

export default cnki;

async function getRequestArgs(
  attachmentItem: Zotero.Item,
): Promise<RequestArgs> {
  let pdfTitle = "";
  if (attachmentItem.isPDFAttachment()) {
    pdfTitle = await getPDFTitle(attachmentItem.id);
  }
  const searchValue = attachmentItem.attachmentFilename
    .replace(/((\(\d+\)| - 副本)+)?\.\w+$/, "")
    .replace(/_[\u4e00-\u9fff・·]{2,4}$|^[\u4e00-\u9fff・·]{2,4}_/g, "")
    .split(/_(省略_)?|\.{3}|_|\s?-\s?/g)
    .join(" % ");
  // 专业检索表达式的语法见<https://piccache.cnki.net/2022/kdn/index/helper/manual.html#frame2-1-3>
  const searchExp = `TI%='${pdfTitle || searchValue}'`;
  ztoolkit.log(`search expression: ${searchExp}`);
  let url: string = "https://kns.cnki.net/kns8s/brief/grid";
  let headers: object = {
    Host: "kns.cnki.net",
    Referer: "https://kns.cnki.net/kns8s/AdvSearch?classid=WD0FTY92",
  };
  let body: string = json2URI({
    QueryJson: {
      Platform: "",
      Resource: "CROSSDB",
      Classid: "WD0FTY92",
      Products: "",
      QNode: {
        QGroup: [
          {
            Key: "Subject",
            Title: "",
            Logic: 0,
            Items: [
              {
                Key: "Expert",
                Title: "",
                Logic: 0,
                Field: "EXPERT",
                Operator: 0,
                Value: searchExp,
                Value2: "",
              },
            ],
            ChildItems: [],
          },
          {
            Key: "ControlGroup",
            Title: "",
            Logic: 0,
            Items: [],
            ChildItems: [],
          },
        ],
      },
      ExScope: 1,
      SearchType: 8,
      Rlang: "CHINESE",
      KuaKuCode:
        "YSTT4HG0,LSTPFY1C,JUP3MUPD,MPMFIG1A,WQ0UVIAA,BLZOG7CK,EMRPGLPA,PWFIRAGL,NLBO1Z6R,NN3FJMUV",
    },
    boolSearch: true,
    CurPage: 1,
    pageNum: 1,
    pageSize: 20,
    sortField: "FFD",
    sortType: "desc",
    dstyle: "listmode",
    boolSortSearch: true,
    sentenceSearch: false,
    /* 下面的三个参数不是必需的 */
    productStr:
      "YSTT4HG0,LSTPFY1C,RMJLXHZ3,JQIRZIYA,JUP3MUPD,1UR4K4HZ,BPBAFJ5S,R79MZMCB,MPMFIG1A,WQ0UVIAA,NB3BWEHK,XVLO76FD,HR1YT1Z9,BLZOG7CK,EMRPGLPA,J708GVCE,ML4DRIDX,PWFIRAGL,NLBO1Z6R,NN3FJMUV",
    aside: `(TI%: &#39;${searchValue}&#39;)`,
    searchFrom: "资源范围：总库;  中英文扩展;  时间范围：更新时间：不限;  ",
  });
  if (getPref("isOversea")) {
    url = "https://chn.oversea.cnki.net/kns/Brief/GetGridTableHtml";
    headers = {
      Host: "chn.oversea.cnki.net",
      Referer:
        "https://chn.oversea.cnki.net/kns/AdvSearch?dbcode=CFLS&crossDbcodes=CJFQ,CDMD,CIPD,CCND,CYFD,CCJD,BDZK,CISD,CJFQ,CDMD,CIPD,CCND,CYFD,CCJD,BDZK,CISD,CJFN",
    };
    body = json2URI({
      QueryJson: {
        Platform: "",
        DBCode: "CFLS",
        QNode: {
          QGroup: [
            {
              Key: "Subject",
              Title: "",
              Logic: 4,
              Items: [
                {
                  Key: "Expert",
                  Title: "",
                  Logic: 0,
                  Name: "",
                  Operate: "",
                  Value: searchExp,
                  ExtendType: 12,
                  ExtendValue: "中英文对照",
                  Value2: "",
                  BlurType: "",
                },
              ],
              ChildItems: [],
            },
            {
              Key: "ControlGroup",
              Title: "",
              Logic: 1,
              Items: [],
              ChildItems: [],
            },
          ],
        },
        ExScope: 1,
        CodeLang: "",
        KuaKuCode: "CJFQ,CCND,CIPD,CDMD,CYFD,BDZK,CISD,CCJD,CJFN",
      },
      IsSearch: false,
      CurPage: 1,
      RecordsCntPerPage: 20,
      CurrSortField: "RELEVANT",
      CurrSortFieldType: "desc",
      CurDisplayMode: "listmode",
      IsSentenceSearch: false,
      KuaKuCodes: "CJFQ,CCND,CIPD,CDMD,CYFD,BDZK,CISD,CCJD,CJFN",
      PageName: "AdvSearch",
      DBCode: "CFLS",
      Subject: "",
    });
  }
  return [
    url,
    {
      method: "POST",
      headers: headers,
      body: body,
    },
  ];
}

function getSearchResults(doc: Document | Element): IOItems {
  const items: IOItems = {};
  const rows = doc.querySelectorAll("table.result-table-list > tbody > tr");
  ztoolkit.log(rows.length);
  for (const row of rows) {
    const doctools = new DocTools(row);
    const href = doctools.attr(".name > a", "href");
    const title = doctools.text(".name > a");
    if (!href || !title) continue;
    items[href] = Zotero.Utilities.trimInternal(
      [
        title,
        doctools.text(".author"),
        doctools.text(".source"),
        doctools.text(".date"),
      ].join(" | "),
    );
  }
  return items;
}

async function translate(
  doc: Document,
  referItem: Zotero.Item,
  saveAttachments: boolean = false,
): Promise<Zotero.Item> {
  const translate = new Zotero.Translate.Web();
  // CNKI
  translate.setTranslator("5c95b67b-41c5-4f55-b71a-48d5d7183063");
  translate.setDocument(doc);
  const items = await translate.translate({
    libraryID: referItem.libraryID,
    saveAttachments: saveAttachments,
  });
  const item = items[0] as Zotero.Item;
  ztoolkit.log(item);
  referItem.getCollections().forEach((collectionID) => {
    item.addToCollection(collectionID);
  });
  return item;
}

async function translateSnapshot(doc: Document, referItem: Zotero.Item) {
  function addInput(localeID: string, value: string) {
    const input = doc.createElement("input");
    input.type = "hidden";
    input.id = `param${localeID}`;
    input.value = value;
    doc.body.appendChild(input);
  }
  const checkbox = doc.querySelector("input.infocheckbox") as HTMLInputElement;
  const values = checkbox.value.split("!");
  addInput("dbcode", checkbox.getAttribute("dbcode") as string);
  addInput("dbname", values[0].replace(/^([A-Z])/, "$1LAST"));
  addInput("filename", values[1]);
  return translate(doc, referItem, true);
}

function getSnapshot(item: Zotero.Item): undefined | Zotero.Item {
  const regx = new RegExp(
    "/(kns8?s?|kcms2?)/(article/abstract\\?|detail/detail\\.aspx\\?)",
    "i",
  );
  if (item.itemType == "webpage" && regx.test(item.getField("url"))) {
    return Zotero.Items.get(item.getAttachments()).find((attachment) => {
      return (
        attachment.isSnapshotAttachment() &&
        regx.test(attachment.getField("url"))
      );
    });
  }
  return undefined;
}
