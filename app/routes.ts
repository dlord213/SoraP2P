import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("history", "routes/history.tsx"),
  route("cli", "routes/cli.tsx"),
  route("docs", "routes/docs.tsx"),
] satisfies RouteConfig;
