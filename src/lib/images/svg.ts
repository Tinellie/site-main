import { SaxesParser } from "saxes";

export function validateSvg(bytes: Uint8Array) {
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const parser = new SaxesParser({ xmlns: true });
  let root = false;
  parser.on("doctype", () => { throw new Error("SVG must not contain a DOCTYPE."); });
  parser.on("error", error => { throw error; });
  parser.on("opentag", tag => {
    if (!root) {
      if (tag.local !== "svg" || tag.uri !== "http://www.w3.org/2000/svg") {
        throw new Error("Expected an SVG root element.");
      }
      root = true;
    }
    if (["script", "foreignobject", "iframe", "object", "embed"].includes(tag.local.toLowerCase())) {
      throw new Error("SVG contains active content.");
    }
    for (const attribute of Object.values(tag.attributes)) {
      if (/^on/i.test(attribute.local) ||
        (attribute.local.toLowerCase() === "href" && attribute.value && !attribute.value.startsWith("#"))) {
        throw new Error("SVG contains an event handler or external reference.");
      }
    }
  });
  parser.write(source).close();
  if (!root) throw new Error("Empty SVG document.");
}

export const SVG_CONTENT_SECURITY_POLICY = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
