import type {
  ConfigPluginResponse,
  ConfigSchemaResponse,
  ConfigValues,
  ImportedConfigResponse,
  RenderedConfigResponse,
  SavedConfigResponse,
} from "@fondamental/shared";
import { apiFetch } from "./client";

/** Générateur de configuration (#30, docs/api-front.md §4). */

export interface ConfigTarget {
  slug: string;
  version: string;
  file: string;
}

export const getConfigPlugin = (slug: string) =>
  apiFetch<ConfigPluginResponse>(`/configs/${encodeURIComponent(slug)}`);

export const getConfigSchema = ({ slug, version, file }: ConfigTarget) =>
  apiFetch<ConfigSchemaResponse>(
    `/configs/${encodeURIComponent(slug)}/${encodeURIComponent(version)}/${encodeURIComponent(file)}`,
  );

export const renderConfig = (target: ConfigTarget, values: ConfigValues, csrfToken: string) =>
  apiFetch<RenderedConfigResponse>("/me/configs/render", { method: "POST", body: { ...target, values }, csrfToken });

/** Le fichier YAML de l'acheteur (celui de son serveur), ramené aux valeurs du formulaire. */
export const importConfig = (target: ConfigTarget, yaml: string, csrfToken: string) =>
  apiFetch<ImportedConfigResponse>("/me/configs/import", { method: "POST", body: { ...target, yaml }, csrfToken });

export const listSavedConfigs = () => apiFetch<SavedConfigResponse[]>("/me/configs");

export const createSavedConfig = (target: ConfigTarget, name: string, values: ConfigValues, csrfToken: string) =>
  apiFetch<SavedConfigResponse>("/me/configs", { method: "POST", body: { ...target, name, values }, csrfToken });

export const updateSavedConfig = (id: string, name: string, values: ConfigValues, csrfToken: string) =>
  apiFetch<SavedConfigResponse>(`/me/configs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { name, values },
    csrfToken,
  });

export const deleteSavedConfig = (id: string, csrfToken: string) =>
  apiFetch<void>(`/me/configs/${encodeURIComponent(id)}`, { method: "DELETE", csrfToken });
