import { CommandCenterView } from "@/components/chernobog-ui/command-center/CommandCenterView";
import { buildCommandCenterModel } from "@/components/chernobog-ui/command-center/commandCenterModel";
import { getAllChernobogModules } from "@/lib/chernobog-ui/moduleRegistry";
import {
  getAllChernobogRoutes,
  getPrimaryNavigationRoutes,
} from "@/lib/chernobog-ui/routeRegistry";

export default function CommandCenterPage() {
  const model = buildCommandCenterModel({
    routes: getAllChernobogRoutes(),
    primaryRoutes: getPrimaryNavigationRoutes(),
    modules: getAllChernobogModules(),
  });

  return <CommandCenterView model={model} />;
}
