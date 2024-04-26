import { config } from "../../package.json";

export function registerNotifier() {
  const callback = {
    notify: async (
      event: string,
      type: string,
      ids: number[] | string[],
      extraData: { [key: string]: any },
    ) => {
      if (!addon?.data.alive) {
        unregisterNotifier(notifierID);
        return;
      }
      onNotify(event, type, ids, extraData);
    },
  };

  // Register the callback in Zotero as an item observer
  const notifierID = Zotero.Notifier.registerObserver(callback, ["item"]);

  // Unregister callback when the window closes (important to avoid a memory leak)
  window.addEventListener(
    "unload",
    (_event: Event) => {
      unregisterNotifier(notifierID);
    },
    false,
  );
}

function unregisterNotifier(notifierID: string) {
  Zotero.Notifier.unregisterObserver(notifierID);
}

/* 由此处开始书写回调函数 */

/**
* 将所有notify的响应组织起来
*/
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // You can add your code to the corresponding notify type
  ztoolkit.log("notify", event, type, ids, extraData);
  if (event == "add" && type == "item") {
    autoRecognizeItems();
  }
  else {
    return;
  }
}

// 此处参照了Zotero.RecognizeDocument.autoRecognizeItems的命名
function autoRecognizeItems() {
  new ztoolkit.ProgressWindow(config.addonName)
    .createLine({
      text: "auto recognize items…",
      type: "success",
      progress: 100,
    })
    .show();
}