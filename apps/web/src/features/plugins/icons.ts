import type { ComponentType, SVGProps } from "react";
import {
  BedwarsContourIcon,
  TagContourIcon,
  CrateContourIcon,
  PassContourIcon,
  ShopContourIcon,
  EssentialsContourIcon,
} from "@/components/icons";

/**
 * `slug` (`ProductResponse.slug`) -> icône de contour de la charte. L'API ne
 * fournit pas d'icône : ce mapping est le seul endroit à mettre à jour si un
 * plugin change de slug ou si un nouveau plugin arrive.
 */
export const PLUGIN_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  bedwars: BedwarsContourIcon,
  tag: TagContourIcon,
  crate: CrateContourIcon,
  pass: PassContourIcon,
  shop: ShopContourIcon,
  essentials: EssentialsContourIcon,
};
