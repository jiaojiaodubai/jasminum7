function json2URI(obj: {
  [key: string]: boolean | number | string | object | Array<string>;
}) {
  return Object.keys(obj)
    .map((key) => {
      const value = obj[key];
      let vString: string;
      if (Array.isArray(value)) {
        vString = value.join(",");
      } else if (typeof value === "object") {
        vString = JSON.stringify(value);
      } else {
        vString = value.toString();
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(vString)}`;
    })
    .join("&");
}

function text2HTMLDoc(text: string, url?: string): Document {
  let doc = ztoolkit.getDOMParser().parseFromString(text, "text/html");
  if (url) {
    doc = Zotero.HTTP.wrapDocument(doc, url);
  }
  return doc;
}

async function requestDocument(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: any;
    responseType?: string;
    responseCharset?: string;
    successCodes?: number[] | false;
  },
): Promise<Document> {
  const xhr = await Zotero.HTTP.request(options?.method || "GET", url, {
    ...options,
    responseType: "document",
  });
  let doc = xhr.response;
  if (doc && !doc.location) {
    doc = Zotero.HTTP.wrapDocument(doc, xhr.responseURL);
  }
  return doc;
}

export { json2URI, text2HTMLDoc, requestDocument };
