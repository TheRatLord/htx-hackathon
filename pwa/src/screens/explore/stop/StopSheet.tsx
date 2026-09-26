import { useParams } from "react-router";
import { SheetPlaceholder } from "../../../app/Placeholder.tsx";

export default function StopSheet() {
  const { stopId } = useParams();
  return <SheetPlaceholder title={`Stop ${stopId}`} todo="D6 Stop sheet" />;
}
