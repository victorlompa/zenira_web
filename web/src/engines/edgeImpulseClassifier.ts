import { MODELS_BASE_URL } from "../modelsBaseUrl.ts";

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

declare const EdgeImpulseClassifier: new () => EdgeImpulseClassifierInstance;

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
      await loadScript(`${MODELS_BASE_URL}/edge-impulse-standalone.js`);
      await loadScript(`${MODELS_BASE_URL}/run-impulse.js`);
    })();
    scriptsLoaded.catch(() => {
      scriptsLoaded = null;
    });
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
