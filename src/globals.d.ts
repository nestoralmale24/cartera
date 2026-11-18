/** Globales que la página inyecta o que se exponen para las pruebas. */
interface Window {
  /** La versión web instalable lo activa en index.html; en el artefacto de Claude no existe. */
  NIDO_STANDALONE?: boolean;
  /** API del artefacto de Claude (db, user). */
  claude?: any;
  __nido?: any;
}
