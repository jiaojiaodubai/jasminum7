import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { retrieveMetadata } from "./services";
import { getPDFTitle } from "../utils/translate";

/**
 * Return true when item is a top level Chinese PDF/CAJ item
 */
export function isChineseTopAttachment(item: Zotero.Item): boolean {
  return (
    item.isAttachment() &&
    item.isTopLevelItem() &&
    /.*[\u4e00-\u9fff].*\.(pdf|caj|kdh|nh)$/i.test(item.attachmentFilename)
  );
}

const menuitems: MenuitemOptions[] = [
  {
    tag: "menuitem",
    label: "retrieveMetadata",
    getVisibility: (_elm, _ev) =>
      ZoteroPane.getSelectedItems().some((item) => {
        return (
          isChineseTopAttachment(item) ||
          Object.keys(addon.api).some((name) =>
            addon.api[name].getSnapshot(item),
          )
        );
      }),
    commandListener: () => {
      retrieveMetadata(ZoteroPane.getSelectedItems());
    },
  },
];

export function registerMenu() {
  const menu: MenuitemOptions = {
    tag: "menu",
    label: getString("menu-root"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.svg`,
    children: menuitems.map((subOption) => {
      const label = subOption.label as string;
      (subOption.id = `${config.addonRef}-menu-${label}`),
        (subOption.label = getString(`menu-${label}`));
      return subOption;
    }),
  };
  ztoolkit.Menu.register("item", menu);
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    label: "TEST",
    commandListener: async () => {
      ztoolkit.log(await getPDFTitle(ZoteroPane.getSelectedItems()[0].id));
    },
  });
  // ztoolkit.Menu.register("collection", menu);
}
