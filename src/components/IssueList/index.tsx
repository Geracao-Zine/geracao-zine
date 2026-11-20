import type { JSX } from "react";
import type { DraftIssue } from "@/domain";

type Props = {
	issues: DraftIssue[];
	emptyMessage?: string;
};

export default function IssueList({
	issues,
	emptyMessage = "Nenhuma pendência.",
}: Props): JSX.Element {
	if (issues.length === 0) {
		return (
			<p className="text-sm text-green-700 dark:text-green-400">{emptyMessage}</p>
		);
	}

	return (
		<ul className="space-y-2">
			{issues.map((issue) => (
				<li
					key={issue.id}
					className={`
						flex items-start gap-2 text-sm rounded-xl px-4 py-2
						${issue.severity === "error"
							? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
							: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}
					`}
				>
					<span aria-hidden="true">
						{issue.severity === "error" ? "⛔" : "⚠️"}
					</span>
					<span>{issue.message}</span>
				</li>
			))}
		</ul>
	);
}
