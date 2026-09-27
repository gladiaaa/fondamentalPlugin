// Les .svg passent par @svgr/webpack (apps/web/next.config.ts) : import
// donne un composant React, pas une URL.
declare module "*.svg" {
  import type { FC, SVGProps } from "react";
  const Component: FC<SVGProps<SVGSVGElement>>;
  export default Component;
}
