import { CommandCenterView } from "@/components/chernobog-ui/command-center/CommandCenterView";
import { buildCommandCenterModel } from "@/components/chernobog-ui/command-center/commandCenterModel";
import { getAllChernobogModules } from "@chernobog/ui/registry/moduleRegistry";
import {
  getAllChernobogRoutes,
  getPrimaryNavigationRoutes,
} from "@chernobog/ui/registry/routeRegistry";

export default function CommandCenterPage() {
  const model = buildCommandCenterModel({
    routes: getAllChernobogRoutes(),
    primaryRoutes: getPrimaryNavigationRoutes(),
    modules: getAllChernobogModules(),
  });

  return <CommandCenterView model={model} />;
}
