// Browser extensions and page translators can move text nodes that React owns.
// These guards keep a foreign DOM mutation from crashing the whole React root.
function installDomSafetyGuards() {
  if (typeof window === 'undefined' || typeof Node === 'undefined') return;

  const proto = Node.prototype;
  if (proto.__efactoryDomSafetyPatched) return;

  const nativeRemoveChild = proto.removeChild;
  const nativeInsertBefore = proto.insertBefore;

  Object.defineProperty(proto, '__efactoryDomSafetyPatched', {
    value: true,
    configurable: false,
  });

  proto.removeChild = function guardedRemoveChild(child) {
    if (child && child.parentNode !== this) {
      return child;
    }
    return nativeRemoveChild.call(this, child);
  };

  proto.insertBefore = function guardedInsertBefore(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode);
    }
    return nativeInsertBefore.call(this, newNode, referenceNode);
  };
}

installDomSafetyGuards();
