import { error } from "console";
import { config, homepage } from "../../package.json";
import { getString } from "../utils/locale";
import { downloadTranslators, updateRowsData } from "./translator";

export function registerPrefsWindow() {
  ztoolkit.PreferencePane.register({
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    label: getString("prefs-title"),
    image: `chrome://${config.addonRef}/content/icons/favicon.svg`,
    defaultXUL: true,
    helpURL: homepage,
  });
}

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/chrome/content/preferences.xul onpaneload
  addon.data.prefs.window = _window;
  await updatePrefsUI();
  bindPrefEvents();
}

async function updatePrefsUI() {
  // You can initialize some UI elements on prefs window
  // with addon.data.prefs.window.document
  // Or bind some events to the elements
  const renderLock = Zotero.Promise.defer();
  ztoolkit.log("update rows: ", addon.data.prefs.translators);
  if (addon.data.prefs.window == undefined) return;
  addon.data.prefs.tableHelper = new ztoolkit.VirtualizedTable(
    addon.data.prefs.window,
  )
    .setContainerId(`${config.addonRef}-translator-manager`)
    .setProp({
      columns: [
        {
          dataKey: "zhLabel",
          label: getString("prefs-table-column-translator-label"),
        },
        {
          dataKey: "localeUpdateTime",
          label: getString("prefs-table-column-locale-time"),
          fixedWidth: true,
          width: 135,
        },
        {
          dataKey: "remoteUpdateTime",
          label: getString("prefs-table-column-remote-time"),
          fixedWidth: true,
          width: 135,
        },
        {
          dataKey: "status",
          label: getString("prefs-table-column-status"),
          fixedWidth: true,
          width: 40,
        },
      ],
      disableFontSizeScaling: true,
      id: `${config.addonRef}-translator-table`,
      multiSelect: true,
      showHeader: true,
      staticColumns: true,
    })
    .setProp(
      "getRowCount",
      () => Object.keys(addon.data.prefs.translators).length || 0,
    )
    .setProp(
      "getRowData",
      (index) => Object.values(addon.data.prefs.translators)[index],
    )
    // Render the table.
    .render(-1, () => {
      renderLock.resolve();
    });
  updateTableUI();
  await renderLock.promise;
  ztoolkit.log("Preference table rendered!");
}

function updateTableUI() {
  // 见zotero\chrome\content\zotero\preferences\preferences_cite.jsx
  setTimeout(() => addon.data.prefs.tableHelper?.treeInstance.invalidate());
}

function bindPrefEvents() {
  function listen(
    selector: string,
    // https://developer.mozilla.org/zh-CN/docs/Web/Events
    type: string,
    callback: (event: Event) => void | Promise<void>,
  ): void {
    addon.data.prefs
      .window!.document.querySelector(selector)
      ?.addEventListener(type, (event) => {
        ztoolkit.log(event);
        callback(event);
      });
  }
  listen(`#zotero-prefpane-${config.addonRef}`, "showing", async () => {
    updateTableUI();
  });
  listen(`#${config.addonRef}-download-translators`, "click", async () => {
    await downloadTranslators(true);
  });
}
