import { createStore, del, get, set } from 'idb-keyval';

const mediaStore = createStore('coshop', 'media');

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  return response.blob();
};

export async function saveImage(dataUrl: string, currentRef?: string): Promise<string> {
  const ref = currentRef ?? crypto.randomUUID();
  await set(ref, await dataUrlToBlob(dataUrl), mediaStore);
  return ref;
}

export async function loadImage(ref?: string): Promise<string | undefined> {
  if (!ref) return undefined;
  const blob = await get<Blob>(ref, mediaStore);
  return blob ? URL.createObjectURL(blob) : undefined;
}

export const loadImageBlob = async (ref?: string): Promise<Blob | undefined> => ref ? get<Blob>(ref, mediaStore) : undefined;
export const saveImageBlob = async (ref: string, blob: Blob): Promise<void> => set(ref, blob, mediaStore);

export async function removeImage(ref?: string): Promise<void> {
  if (ref) await del(ref, mediaStore);
}
