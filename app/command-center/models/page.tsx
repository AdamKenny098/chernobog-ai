import {
  LLMControlCenterSurface,
} from "@/components/chernobog-ui/command-center/LLMControlCenterSurface";
import {
  ClassicFrame,
} from "@/components/chernobog-ui/ChernobogClassic";

export default function ModelsControlCenterPage() {
  return (
    <ClassicFrame>
      <div className="mx-auto max-w-[1600px] p-3">
        <LLMControlCenterSurface />
      </div>
    </ClassicFrame>
  );
}