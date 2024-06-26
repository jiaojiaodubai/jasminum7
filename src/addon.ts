import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { getPref } from "./utils/prefs";
import { VirtualizedTableHelper } from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
import { API, initAPIs } from "./modules/services";

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: ZToolkit;
    locale?: {
      current: any;
    };
    prefs: {
      window?: Window;
      tableHelper?: VirtualizedTableHelper;
      translators: { [filename: string]: TranslatorRow };
      lastCheck: number;
    };
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: { [name: string]: API };

  constructor() {
    this.data = {
      alive: true,
      env: __env__,
      ztoolkit: createZToolkit(),
      prefs: {
        translators: {},
        lastCheck: (getPref("lastCheck") as number) || 0,
      },
    };
    this.hooks = hooks;
    this.api = {};
    initAPIs();
  }
}

export default Addon;
