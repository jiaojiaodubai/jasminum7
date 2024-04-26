import { getPref } from "../utils/prefs";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { isEarlier, checkUpdate } from "../utils/date";

const baseUrl = getPref("translatorurl")
    ? getPref("translatorurl")
    : "https://oss.wwang.de/translators_CN";

/**
 * 如果本地临时文件夹有缓存且未满足更新条件，则从临时文件夹中读取translators.json
 * 否则从远程获取translators.json
 */
async function getJsonData(): Promise<{ [filename: string]: { label: string, lastUpdated: string } }> {
  const cachePath = PathUtils.join(
    Zotero.Prefs.get("dataDir") as string,
    "translators_CN.json"
  );
  let contents;
  if (await IOUtils.exists(cachePath) && !checkUpdate()) {
    contents = await Zotero.File.getContentsAsync(cachePath, "utf8");
    return JSON.parse(contents as string);
  }
  const url = baseUrl + "/data/translators.json";
  contents = await Zotero.File.getContentsFromURLAsync(url);
  await Zotero.File.putContentsAsync(cachePath, contents);
  return JSON.parse(contents);
}

/**
 * 尝试从本地translator中读取元数据，若出错则返回默认值
 * @param filename translator的文件名（含拓展名）
 */
async function getFileMeta(filename: string): Promise<TranslatorMeta> {
  const desPath = PathUtils.join(
    Zotero.Prefs.get("dataDir") as string,
      "translators",
      filename
  );
  try {
    const content = (await Zotero.File.getContentsAsync(desPath)) as string;
    const infoRe = /^\s*{[\S\s]*?}\s*?[\r\n]/;
    return JSON.parse(infoRe.exec(content)![0]);
  }
  catch (error) {
    ztoolkit.log(error);
    return new TranslatorMeta();
  }
}

export async function updateRowsData() {
  const json = await getJsonData();
  const rows: { [filenam: string]: TranslatorRow } = {};
  for (const filename in json) {
    // ztoolkit.log(`update row: ${filename}`);
    const oldMeta = await getFileMeta(filename);
    const newMeta = json[filename];
    rows[filename] = {
      zhLabel: newMeta.label,
      enLabel: filename.replace(/\.js$/, ""),
      filename: filename,
      localeUpdateTime: oldMeta.lastUpdated,
      remoteUpdateTime: newMeta.lastUpdated,
      status: isEarlier(oldMeta.lastUpdated, newMeta.lastUpdated)
        ? "✖"
        : "✔"
    }
  }
  addon.data.prefs.translators = rows;
}

/**
 * 根据给定的文件名下载translator，若出错则弹出气泡窗显示错误
 */
async function downloadTranslator(filename: string): Promise<void> {
  const url = baseUrl + "/" + filename;
  const code = await Zotero.File.getContentsFromURLAsync(url);
  const desPath = PathUtils.join(
    Zotero.Prefs.get("dataDir") as string,
    "translators",
    filename
  );
  await IOUtils.writeUTF8(desPath, code);
}

/**
 * 下载所有translator
 * @param force 设为`true`时，无视更新时间直接下载替换；设为`false`时则仅下载和替换较新的translator
 */
export async function downloadTranslators(force: boolean = false): Promise<void> {
  const translators = addon.data.prefs.translators;
  let todo = Object.keys(translators);
  if (!force) {
    const weaver = todo.map(async (filename) => {
      const translator = translators[filename];
      const desPath = PathUtils.join(
        Zotero.Prefs.get("dataDir") as string,
          "translators",
          filename
      );
      const noSuchFile = !IOUtils.exists(desPath);
      const outdated = isEarlier(translator.localeUpdateTime, translator.remoteUpdateTime);
      ztoolkit.log("check translator: ", desPath, " => ", "no such file: ", noSuchFile, "outdated: ", outdated);
      return {
        filename: filename,
        needUpdate: noSuchFile || outdated
      };
    });
    const linen = await Promise.all(weaver);
    todo = linen.filter(result => result.needUpdate).map(result => result.filename);
  }
  ztoolkit.log('there are translators to be updated:', todo);
  const popupWin = new ztoolkit.ProgressWindow(config.addonName, {
    closeOnClick: true,
    closeTime: -1,
  })
    .createLine({
      text: getString("startup-begin"),
      type: "default",
      progress: 0,
    })
    .show();
  const degree = 100 / todo.length;
  let progress = 0;
  for (const filename of todo) {
    await downloadTranslator(filename)
      .then(() => {
        ztoolkit.log(`${filename} download successfully`);
        popupWin.changeLine({
          progress: progress,
          text: `[${filename}] ${getString("progress-translator-download-successfully")}`,
          type: "success"
        });
      })
      .catch(error => {
        ztoolkit.log(`${filename} download failed: ${error}`);
        popupWin.changeLine({
          progress: progress,
          text: `[${filename}] ${getString("progress-translator-download-failed")}`,
          type: "fail"
        });
      })
    progress += degree;
  }
  popupWin.changeLine({
    progress: 100,
    text: `[100%] ${getString(todo.length ? "progress-translator-download-done" : "progress-translator-download-skip")}`
  });
  popupWin.startCloseTimer(3000);
}

export type TranslatorRow = {
  zhLabel: string,
  enLabel: string,
  filename: string,
  localeUpdateTime: string,
  remoteUpdateTime: string,
  status: string
}

class TranslatorMeta {
  translatorID: string = "undefined";
  label: string = "undefined";
  creator: string = "undefined";
  target: string = "undefined";
  minVersion: string = "undefined";
  maxVersion: string = "undefined";
  priority: number = 100;
  inRepository: boolean = false;
  translatorType: number = 4;
  browserSupport: string = "gcsibv";
  lastUpdated: string = "1970-01-01 00:00:00"
}
