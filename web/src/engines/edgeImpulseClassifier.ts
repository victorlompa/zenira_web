/**
 * The Edge Impulse WebAssembly export is classic Emscripten glue — it
 * defines a global `Module` and `EdgeImpulseClassifier`, not an ES module —
 * so it has to be loaded as a plain <script> tag (matching Edge Impulse's
 * own example `index.html`) rather than imported through the bundler.
 */
export interface ClassifyResult {
  anomaly: number;
  results: { label: string; value: number }[];
}

export interface EdgeImpulseClassifierInstance {
  init(): Promise<void>;
  classifyContinuous(rawData: number[], enablePerfCal?: boolean): ClassifyResult;
  classify(rawData: number[], debug?: boolean): ClassifyResult;
  getProperties(): Record<string, unknown>;
}

// `run-impulse.js` declares `class EdgeImpulseClassifier` at the top level
// of a classic <script>. Top-level `class`/`let`/`const` create lexical
// bindings, not properties on `window` (unlike `var`/`function`) — but
// they're still visible as a bare global identifier to any other script
// sharing the same realm, which our ES module code does. So this is a
// direct ambient declaration, not `Window.EdgeImpulseClassifier`.
declare const EdgeImpulseClassifier: new () => EdgeImpulseClassifierInstance;

const BASE_URL = "/models/edge-impulse/";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

let scriptsLoaded: Promise<void> | null = null;

function loadClassifierScripts(): Promise<void> {
  if (!scriptsLoaded) {
    scriptsLoaded = (async () => {
      await loadScript(`${BASE_URL}edge-impulse-standalone.js`);
      await loadScript(`${BASE_URL}run-impulse.js`);
    })();
  }
  return scriptsLoaded;
}

export async function createEdgeImpulseClassifier(): Promise<EdgeImpulseClassifierInstance> {
  await loadClassifierScripts();
  if (typeof EdgeImpulseClassifier === "undefined") throw new Error("EdgeImpulseClassifier failed to load");
  const classifier = new EdgeImpulseClassifier();
  await classifier.init();
  return classifier;
}
