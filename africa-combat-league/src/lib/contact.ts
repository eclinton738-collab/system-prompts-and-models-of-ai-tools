/** "09074008447" -> "+2349074008447". Other numbers must already carry a country code. */
export function toE164(input: string, defaultCountryCode = "234"): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let normalised: string;
  if (digits.startsWith("+")) normalised = digits;
  else if (digits.startsWith("00")) normalised = `+${digits.slice(2)}`;
  else if (digits.startsWith("0")) normalised = `+${defaultCountryCode}${digits.slice(1)}`;
  else if (digits.startsWith(defaultCountryCode)) normalised = `+${digits}`;
  else return null;
  return /^\+[1-9]\d{7,14}$/.test(normalised) ? normalised : null;
}

export function whatsappLink(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
