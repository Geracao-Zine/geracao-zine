import type { PDFFont } from "pdf-lib";

export function wrapText(
	text: string,
	font: PDFFont,
	fontSize: number,
	maxWidth: number
): string[] {
	const lines: string[] = [];

	for (const paragraph of text.split("\n")) {
		if (paragraph.trim() === "") {
			lines.push("");
			continue;
		}

		let currentLine = "";

		for (const word of paragraph.split(" ")) {
			const candidate = currentLine ? `${currentLine} ${word}` : word;

			if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
				currentLine = candidate;
				continue;
			}

			if (currentLine) {
				lines.push(currentLine);
				currentLine = "";
			}

			currentLine = font.widthOfTextAtSize(word, fontSize) > maxWidth
				? breakWord(word, font, fontSize, maxWidth, lines)
				: word;
		}

		if (currentLine) {
			lines.push(currentLine);
		}
	}

	return lines;
}

function breakWord(
	word: string,
	font: PDFFont,
	fontSize: number,
	maxWidth: number,
	lines: string[]
): string {
	let chunk = "";

	for (const char of word) {
		const candidate = chunk + char;

		if (chunk && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
			lines.push(chunk);
			chunk = char;
		} else {
			chunk = candidate;
		}
	}

	return chunk;
}
