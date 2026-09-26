import { useParams } from "react-router";
import { PagePlaceholder } from "../../../app/Placeholder.tsx";

export default function TransitCenter() {
  const { tcId } = useParams();
  return <PagePlaceholder title={`Transit center ${tcId}`} todo="D10 Transit Center" />;
}
