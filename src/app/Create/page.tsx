"use client";

import type { JSX } from "react";
import ZineWizard from "@/components/ZineWizard";

export default function CreatePage(): JSX.Element {
	return <ZineWizard initialStep="cover" />;
}
