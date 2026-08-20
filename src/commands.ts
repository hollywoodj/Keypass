export type MenuCommand =
  | { type: "newItem" }
  | { type: "newVault" }
  | { type: "lock" }
  | { type: "settings" }
  | { type: "search" }
  | { type: "edit" }
  | { type: "save" }
  | { type: "cancel" }
  | { type: "copyUsername" }
  | { type: "copyPassword" }
  | { type: "copyTotp" }
  | { type: "favorite" }
  | { type: "archive" }
  | { type: "delete" }
  | { type: "duplicate" }
  | { type: "reveal" }
  | { type: "quickAccess" }
  | { type: "generator" }
  | { type: "allItems" }
  | { type: "favorites" }
  | { type: "watchtower" }
  | { type: "toggleSidebar" }
  | { type: "import" }
  | { type: "export" }
  | { type: "shortcuts" }
  | { type: "openWebsite" };

declare global {
  interface Window {
    keypass?: {
      onMenuCommand: (callback: (command: MenuCommand) => void) => () => void;
      setWindowTitle: (title: string) => void;
      openExternal: (url: string) => void;
    };
  }
}
