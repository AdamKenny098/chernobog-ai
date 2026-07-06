import { RouteMatrixView } from "@/components/chernobog-ui/routes/RouteMatrixView";
import { buildRouteMatrixModel } from "@/components/chernobog-ui/routes/routeMatrixModel";
import { getAllChernobogRoutes } from "@/lib/chernobog-ui/routeRegistry";

type RouteSearchParams = {
  q?: string | string[];
  kind?: string | string[];
  status?: string | string[];
  visibility?: string | string[];
};

type RoutesPageProps = {
  searchParams?: Promise<RouteSearchParams>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function RoutesPage({ searchParams }: RoutesPageProps) {
  const params = (await searchParams) ?? {};

  const model = buildRouteMatrixModel({
    routes: getAllChernobogRoutes(),
    query: firstParam(params.q),
    kind: firstParam(params.kind),
    status: firstParam(params.status),
    visibility: firstParam(params.visibility),
  });

  return <RouteMatrixView model={model} />;
}
