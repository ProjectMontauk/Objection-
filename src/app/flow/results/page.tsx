import { redirect } from "next/navigation";

/** Old URL; flow step 4 now lives at `/flow/score`. */
export default function LegacyResultsPage() {
  redirect("/flow/score");
}
