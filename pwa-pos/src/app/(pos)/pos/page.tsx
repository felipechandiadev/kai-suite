import PosWorkspace from "./ui/PosWorkspace";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PosWorkspace />
    </div>
  );
}

