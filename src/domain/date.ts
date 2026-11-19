export type IsoDate = `${number}-${number}-${number}`;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): value is IsoDate {
	if (!ISO_DATE.test(value)) {
		return false;
	}

	const [, ano, mes, dia] = ISO_DATE.exec(value) as RegExpExecArray;
	const data = new Date(Number(ano), Number(mes) - 1, Number(dia));

	return (
		data.getFullYear() === Number(ano) &&
		data.getMonth() === Number(mes) - 1 &&
		data.getDate() === Number(dia)
	);
}

/**
 * Formata uma data ISO (yyyy-mm-dd) como dd/mm/aaaa.
 *
 * A data e montada por componentes locais, nao por `new Date("yyyy-mm-dd")`:
 * essa forma e lida como meia-noite UTC e, em fuso negativo, volta um dia.
 */
export function formatIsoDate(value: string): string {
	if (!isIsoDate(value)) {
		return "";
	}

	const [, ano, mes, dia] = ISO_DATE.exec(value) as RegExpExecArray;

	return `${dia}/${mes}/${ano}`;
}
