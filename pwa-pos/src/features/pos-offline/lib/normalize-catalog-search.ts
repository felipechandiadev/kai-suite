const ACCENT_FROM = "ÁÀÂÄÃáàâäãÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖÕóòôöõÚÙÛÜúùûüÑñ";
const ACCENT_TO = "AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNn";

export function normalizeCatalogSearchText(value: string): string {
  let out = value.trim().toLowerCase();
  for (let i = 0; i < ACCENT_FROM.length; i++) {
    out = out.replaceAll(ACCENT_FROM[i]!, ACCENT_TO[i]!);
  }
  return out;
}
