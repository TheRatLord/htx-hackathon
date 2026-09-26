import { useParams } from "react-router";
import { PagePlaceholder } from "../../../app/Placeholder.tsx";

export default function RoutePage() {
  const { routeId } = useParams();
  return <PagePlaceholder title={`Route ${routeId}`} todo="D9 Route page" />;
}
