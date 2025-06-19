/**
 * Obtiene solo las cookies de YouTube que coincidan con los criterios dados.
 * @param {chrome.cookies.GetAllDetails} details
 * @returns {Promise<chrome.cookies.Cookie[]>}
 */
export default async function getAllCookies(details) {
  details.storeId ??= await getCurrentCookieStoreId();
  const { partitionKey, ...detailsSinPartitionKey } = details;

  // Manejo de compatibilidad con navegadores sin partitionKey (Chrome < 119)
  const cookiesConPartition = partitionKey
    ? await Promise.resolve()
        .then(() => chrome.cookies.getAll(details))
        .catch(() => [])
    : [];

  const cookiesNormales = await chrome.cookies.getAll(detailsSinPartitionKey);

  // Unir ambas listas y filtrar solo dominios de YouTube
  return [...cookiesNormales, ...cookiesConPartition].filter(
    cookie => cookie.domain.includes('youtube.com')
  );
}

/**
 * Obtiene el ID del almacén de cookies actual (storeId).
 * @returns {Promise<string | undefined>}
 */
const getCurrentCookieStoreId = async () => {
  if (chrome.runtime.getManifest().incognito === 'split') return undefined;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.cookieStoreId) return tab.cookieStoreId;

  const stores = await chrome.cookies.getAllCookieStores();
  return stores.find((store) => store.tabIds.includes(tab.id))?.id;
};
