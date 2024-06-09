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
async function getJsonData(): Promise<{
  [filename: string]: { label: string; lastUpdated: string };
}> {
  const cachePath = PathUtils.join(
    Zotero.Prefs.get("dataDir") as string,
    "translators_CN.json",
  );
  let contents;
  if ((await IOUtils.exists(cachePath)) && !checkUpdate()) {
    contents = await Zotero.File.getContentsAsync(cachePath, "utf8");
    return JSON.parse(contents as string);
  }
  const url = baseUrl + "/data/translators.json";
  contents = await Zotero.File.getContentsFromURLAsync(url);
  await Zotero.File.putContentsAsync(cachePath, contents);
  return JSON.parse(contents);
}

/**
 * 从本地translator中读取元数据
 * @param filepath translator的文件名（含拓展名）
 * @returns 若本地文件存在，则返回其元数据，否则返回`null`
 */
async function getFileMeta(filepath: string): Promise<TranslatorMetadata> {
  const content = (await Zotero.File.getContentsAsync(filepath)) as string;
  const infoRe = /^\s*{[\S\s]*?}\s*?[\r\n]/;
  return JSON.parse(infoRe.exec(content)![0]);
}

export async function updateRowsData() {
  const json = await getJsonData();
  const rows: { [filenam: string]: TranslatorRow } = {};
  for (const filename in json) {
    const newMeta = json[filename];
    const desPath = PathUtils.join(
      Zotero.Prefs.get("dataDir") as string,
      "translators",
      filename,
    );
    const noSuchFile = !(await IOUtils.exists(desPath));
    const oldMeta = noSuchFile
      ? { lastUpdated: "--" }
      : await getFileMeta(desPath);
    const outdated = isEarlier(oldMeta.lastUpdated, newMeta.lastUpdated);
    ztoolkit.log(
      "check translator: ",
      desPath,
      " => ",
      "no such file: ",
      noSuchFile,
      "outdated: ",
      outdated,
    );
    rows[filename] = {
      zhLabel: newMeta.label,
      enLabel: filename.replace(/\.js$/, ""),
      filename: filename,
      localeUpdateTime: oldMeta.lastUpdated,
      remoteUpdateTime: newMeta.lastUpdated,
      status: noSuchFile || outdated ? "✖" : "✔",
    };
  }
  addon.data.prefs.translators = rows;
}

/**
 * 根据给定的文件名下载translator
 */
async function downloadTranslator(filename: string): Promise<void> {
  const url = baseUrl + "/" + filename;
  const code = await Zotero.File.getContentsFromURLAsync(url);
  const desPath = PathUtils.join(
    Zotero.Prefs.get("dataDir") as string,
    "translators",
    filename,
  );
  await IOUtils.writeUTF8(desPath, code);
}

/**
 * 下载所有translator
 * @param force 设为`true`时，无视更新时间直接下载替换；设为`false`时则仅下载和替换较新的translator
 */
export async function downloadTranslators(
  force: boolean = false,
): Promise<void> {
  const translators = addon.data.prefs.translators;
  let todo = Object.keys(translators);
  if (!force) {
    todo = todo.filter((filename) => translators[filename].status == "✖");
  }
  ztoolkit.log("translators to be updated:", todo);
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
          type: "success",
        });
      })
      .catch((error) => {
        ztoolkit.log(`${filename} download failed: ${error}`);
        popupWin.changeLine({
          progress: progress,
          text: `[${filename}] ${getString("progress-translator-download-failed")}`,
          type: "fail",
        });
      });
    progress += degree;
  }
  await Zotero.Translators.reinit();
  popupWin.changeLine({
    progress: 100,
    text: `[100%] ${getString(todo.length ? "progress-translator-download-done" : "progress-translator-download-skip")}`,
  });
  popupWin.startCloseTimer(3000);
}
