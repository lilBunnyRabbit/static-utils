export function createTemplate(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;

  return {
    template,
    clone: () => template.content.cloneNode(true) as DocumentFragment,
  };
}

export function t<T extends any[]>(array: TemplateStringsArray, ...args: T) {
  return createTemplate(array.map((value, i) => (args.hasOwnProperty(i) ? value + args[i] : value)).join(""));
}
