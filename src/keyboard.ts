type EntryNode = {
  tagName?: string;
  isContentEditable?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
};

export function isTextEntryTarget(target: unknown): boolean {
  if (target == null || typeof target !== "object") return false;
  const node = target as EntryNode;
  const tag = typeof node.tagName === "string" ? node.tagName.toUpperCase() : "";
  if (tag === "INPUT" || tag === "TEXTAREA") return node.readOnly !== true && node.disabled !== true;
  return node.isContentEditable === true;
}
