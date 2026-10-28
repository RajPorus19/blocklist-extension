import {
  useBlockListBuilderInfos,
  useBlockListBuilderActions,
} from "@/services/blockListBuilderStore";
import * as Typography from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Infos() {
  const infos = useBlockListBuilderInfos();
  const blockListBuilderActions = useBlockListBuilderActions();
  return (
    <div className="p-2">
      <Input
        type="text"
        placeholder="Title"
        value={infos.title}
        onChange={(e) =>
          blockListBuilderActions.setInfo({ title: e.target.value })
        }
      />
      <Textarea
        className="mt-2"
        placeholder="Description"
        value={infos.description}
        onChange={(e) =>
          blockListBuilderActions.setInfo({ description: e.target.value })
        }
      />
      <Typography.Muted className="mt-2">
        Number of entries: {infos.numEntries}
      </Typography.Muted>
    </div>
  );
}
