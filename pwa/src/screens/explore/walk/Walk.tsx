import { useParams } from "react-router";
import { SheetPlaceholder } from "../../../app/Placeholder.tsx";

export default function Walk() {
  const { stopId } = useParams();
  return <SheetPlaceholder title={`Walk to stop ${stopId}`} todo="D8 Walk to a stop" />;
}
